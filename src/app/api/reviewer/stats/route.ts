import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Get user's quotas
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyQuota: true, weeklyQuota: true },
  })

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get this week's date range (Monday to Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  if (weekStart > today) {
    weekStart.setDate(weekStart.getDate() - 7)
  }
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Get reviews stats
  const [todayReviews, weeklyReviews, assessmentCounts, avgTime, queueCount, assignedCount] = await Promise.all([
    // Today's reviews
    prisma.spotCheck.count({
      where: {
        reviewerId: userId,
        createdAt: { gte: today, lt: tomorrow },
      },
    }),

    // Weekly reviews
    prisma.spotCheck.count({
      where: {
        reviewerId: userId,
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    }),

    // Assessment breakdown (all time)
    prisma.spotCheck.groupBy({
      by: ["assessment"],
      where: { reviewerId: userId },
      _count: true,
    }),

    // Average time per review
    prisma.spotCheck.aggregate({
      where: {
        reviewerId: userId,
        timeSpentSeconds: { gt: 0 },
      },
      _avg: { timeSpentSeconds: true },
    }),

    // Total queue count
    prisma.reviewQueue.count({
      where: { assignedTo: null },
    }),

    // Assigned to this user
    prisma.reviewQueue.count({
      where: { assignedTo: userId },
    }),
  ])

  // Process assessment counts
  const counts = {
    green: 0,
    yellow: 0,
    red: 0,
  }

  for (const item of assessmentCounts) {
    if (item.assessment === "GREEN") counts.green = item._count
    else if (item.assessment === "YELLOW") counts.yellow = item._count
    else if (item.assessment === "RED") counts.red = item._count
  }

  // Calculate streak (simplified - just check consecutive days with reviews)
  const recentDays = await prisma.spotCheck.findMany({
    where: { reviewerId: userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  let streakDays = 0
  const daysSeen = new Set<string>()
  for (const review of recentDays) {
    const dateKey = review.createdAt.toISOString().split("T")[0]
    daysSeen.add(dateKey)
  }

  // Count consecutive days from today
  const checkDate = new Date(today)
  while (daysSeen.has(checkDate.toISOString().split("T")[0])) {
    streakDays++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return NextResponse.json({
    todayReviews,
    weeklyReviews,
    dailyQuota: user?.dailyQuota || 10,
    weeklyQuota: user?.weeklyQuota || 50,
    greenCount: counts.green,
    yellowCount: counts.yellow,
    redCount: counts.red,
    avgTimePerReview: avgTime._avg.timeSpentSeconds,
    streakDays,
    queueCount,
    assignedCount,
  })
}
