import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Assessment, SpotCheck, User } from "@prisma/client"

type UserWithSpotChecks = User & { spotChecks: SpotCheck[] }
type UserWithCount = User & { _count: { spotChecks: number } }

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user has leadership/admin role
  const user = await prisma.user.findUnique({
    where: { slackId: session.user.slackId },
  })

  if (!user || (user.role !== "LEADERSHIP" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // Get weekly overview stats
  const [
    totalApproved,
    totalReviewed,
    backlogCount,
    assessmentCounts,
    spotChecksByProgram,
    reviewerStats,
    approverStats,
    belowQuotaReviewers,
  ] = await Promise.all([
    // Projects approved this week (in queue)
    prisma.reviewQueue.count({
      where: {
        approvedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    }),
    // Spot checks completed this week
    prisma.spotCheck.count({
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    }),
    // Backlog (unassigned queue items)
    prisma.reviewQueue.count({
      where: {
        assignedTo: null,
      },
    }),
    // Assessment breakdown
    prisma.spotCheck.groupBy({
      by: ["assessment"],
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      _count: true,
    }),
    // Spot checks by program for problem detection
    prisma.spotCheck.groupBy({
      by: ["programName", "assessment"],
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        programName: { not: null },
      },
      _count: true,
    }),
    // Reviewer leaderboard
    prisma.user.findMany({
      where: { role: "REVIEWER" },
      include: {
        spotChecks: {
          where: {
            createdAt: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        },
      },
    }),
    // Approver stats
    prisma.spotCheck.groupBy({
      by: ["approverSlackId", "approverName", "assessment"],
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        approverSlackId: { not: null },
      },
      _count: true,
    }),
    // Below quota reviewers
    prisma.user.findMany({
      where: { role: "REVIEWER" },
      include: {
        _count: {
          select: {
            spotChecks: {
              where: {
                createdAt: {
                  gte: weekStart,
                  lt: weekEnd,
                },
              },
            },
          },
        },
      },
    }),
  ])

  // Calculate quality breakdown
  const qualityBreakdown = {
    green: 0,
    yellow: 0,
    red: 0,
    total: totalReviewed,
  }
  for (const item of assessmentCounts) {
    if (item.assessment === "GREEN") qualityBreakdown.green = item._count
    if (item.assessment === "YELLOW") qualityBreakdown.yellow = item._count
    if (item.assessment === "RED") qualityBreakdown.red = item._count
  }

  // Calculate problem programs (>30% issue rate)
  const programStats: Record<string, { total: number; issues: number; name: string }> = {}
  for (const item of spotChecksByProgram) {
    const name = item.programName || "Unknown"
    if (!programStats[name]) {
      programStats[name] = { total: 0, issues: 0, name }
    }
    programStats[name].total += item._count
    if (item.assessment !== "GREEN") {
      programStats[name].issues += item._count
    }
  }
  const problemPrograms = Object.values(programStats)
    .filter(p => p.total >= 3 && (p.issues / p.total) > 0.3)
    .map(p => ({
      name: p.name,
      total: p.total,
      issueRate: Math.round((p.issues / p.total) * 100),
    }))
    .sort((a, b) => b.issueRate - a.issueRate)

  // Calculate reviewer leaderboard
  const reviewerLeaderboard = (reviewerStats as UserWithSpotChecks[])
    .map((reviewer: UserWithSpotChecks) => {
      const checks = reviewer.spotChecks
      const greenCount = checks.filter((c: SpotCheck) => c.assessment === "GREEN").length
      const total = checks.length
      return {
        id: reviewer.id,
        name: reviewer.name || reviewer.email || reviewer.slackId,
        avatarUrl: reviewer.avatarUrl,
        reviewsCompleted: total,
        greenCount,
        yellowCount: checks.filter((c: SpotCheck) => c.assessment === "YELLOW").length,
        redCount: checks.filter((c: SpotCheck) => c.assessment === "RED").length,
        qualityRate: total > 0 ? Math.round((greenCount / total) * 100) : 0,
        weeklyQuota: reviewer.weeklyQuota,
        quotaMet: total >= reviewer.weeklyQuota,
      }
    })
    .sort((a: { reviewsCompleted: number }, b: { reviewsCompleted: number }) => b.reviewsCompleted - a.reviewsCompleted)

  // Calculate approver rankings
  const approverData: Record<string, {
    slackId: string
    name: string
    total: number
    green: number
    yellow: number
    red: number
  }> = {}
  for (const item of approverStats) {
    const id = item.approverSlackId || "unknown"
    if (!approverData[id]) {
      approverData[id] = {
        slackId: id,
        name: item.approverName || id,
        total: 0,
        green: 0,
        yellow: 0,
        red: 0,
      }
    }
    approverData[id].total += item._count
    if (item.assessment === "GREEN") approverData[id].green += item._count
    if (item.assessment === "YELLOW") approverData[id].yellow += item._count
    if (item.assessment === "RED") approverData[id].red += item._count
  }
  const approverRankings = Object.values(approverData)
    .map(a => ({
      ...a,
      accuracyRate: a.total > 0 ? Math.round((a.green / a.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Below quota warnings
  const quotaWarnings = (belowQuotaReviewers as UserWithCount[])
    .filter((r: UserWithCount) => r._count.spotChecks < r.weeklyQuota)
    .map((r: UserWithCount) => ({
      id: r.id,
      name: r.name || r.email || r.slackId,
      avatarUrl: r.avatarUrl,
      completed: r._count.spotChecks,
      quota: r.weeklyQuota,
      remaining: r.weeklyQuota - r._count.spotChecks,
    }))
    .sort((a: { completed: number }, b: { completed: number }) => a.completed - b.completed)

  return NextResponse.json({
    weeklyOverview: {
      projectsApproved: totalApproved,
      projectsReviewed: totalReviewed,
      backlog: backlogCount,
    },
    qualityBreakdown,
    problemPrograms,
    reviewerLeaderboard,
    approverRankings,
    quotaWarnings,
    periodStart: weekStart.toISOString(),
    periodEnd: weekEnd.toISOString(),
  })
}
