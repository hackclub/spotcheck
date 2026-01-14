"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface DashboardStats {
  weeklyOverview: {
    projectsApproved: number
    projectsReviewed: number
    backlog: number
  }
  qualityBreakdown: {
    green: number
    yellow: number
    red: number
    total: number
  }
  problemPrograms: Array<{
    name: string
    total: number
    issueRate: number
  }>
  reviewerLeaderboard: Array<{
    id: string
    name: string
    avatarUrl: string | null
    reviewsCompleted: number
    greenCount: number
    yellowCount: number
    redCount: number
    qualityRate: number
    weeklyQuota: number
    quotaMet: boolean
  }>
  approverRankings: Array<{
    slackId: string
    name: string
    total: number
    green: number
    yellow: number
    red: number
    accuracyRate: number
  }>
  quotaWarnings: Array<{
    id: string
    name: string
    avatarUrl: string | null
    completed: number
    quota: number
    remaining: number
  }>
  periodStart: string
  periodEnd: string
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}

function QualityBar({ green, yellow, red, total }: { green: number; yellow: number; red: number; total: number }) {
  if (total === 0) return <div className="h-4 bg-gray-200 rounded-full" />

  const greenPct = (green / total) * 100
  const yellowPct = (yellow / total) * 100
  const redPct = (red / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden">
        <div className="bg-green-500 transition-all" style={{ width: `${greenPct}%` }} />
        <div className="bg-yellow-500 transition-all" style={{ width: `${yellowPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${redPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Green {green} ({Math.round(greenPct)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full" />
          Yellow {yellow} ({Math.round(yellowPct)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Red {red} ({Math.round(redPct)}%)
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (!res.ok) {
          if (res.status === 403) {
            setError("You don't have permission to view this dashboard")
            return
          }
          throw new Error("Failed to fetch stats")
        }
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchStats()
    }
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const periodLabel = new Date(stats.periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " - " + new Date(stats.periodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Leadership Dashboard</h1>
          <p className="text-gray-500 mt-1">Week of {periodLabel}</p>
        </div>

        {/* Weekly Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Projects Approved"
              value={stats.weeklyOverview.projectsApproved}
              subtitle="This week"
            />
            <StatCard
              title="Projects Reviewed"
              value={stats.weeklyOverview.projectsReviewed}
              subtitle="Spot checks completed"
            />
            <StatCard
              title="Backlog"
              value={stats.weeklyOverview.backlog}
              subtitle="Awaiting review"
            />
          </div>
        </section>

        {/* Quality Breakdown */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quality Breakdown</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <QualityBar {...stats.qualityBreakdown} />
          </div>
        </section>

        {/* Problem Programs */}
        {stats.problemPrograms.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Problem Programs
              <span className="ml-2 text-sm font-normal text-gray-500">(&gt;30% issue rate)</span>
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.problemPrograms.map((program) => (
                    <tr key={program.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {program.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          program.issueRate > 50 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {program.issueRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reviewer Leaderboard */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reviewer Leaderboard</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {stats.reviewerLeaderboard.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No reviews this week yet
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reviewer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reviews
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Breakdown
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.reviewerLeaderboard.map((reviewer, idx) => (
                      <tr key={reviewer.id} className={idx === 0 ? "bg-yellow-50" : ""}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {reviewer.avatarUrl ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={reviewer.avatarUrl}
                                alt=""
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                                {reviewer.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{reviewer.name}</p>
                              {reviewer.quotaMet && (
                                <span className="text-xs text-green-600">Quota met</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {reviewer.reviewsCompleted}
                          </span>
                          <span className="text-sm text-gray-500">
                            /{reviewer.weeklyQuota}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs">
                          <span className="text-green-600">{reviewer.greenCount}G</span>
                          {" / "}
                          <span className="text-yellow-600">{reviewer.yellowCount}Y</span>
                          {" / "}
                          <span className="text-red-600">{reviewer.redCount}R</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Approver Quality Rankings */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approver Quality</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {stats.approverRankings.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No approver data this week
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Checked
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.approverRankings.map((approver) => (
                      <tr key={approver.slackId}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {approver.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {approver.total}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            approver.accuracyRate >= 80 ? "bg-green-100 text-green-800" :
                            approver.accuracyRate >= 60 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {approver.accuracyRate}% green
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Below Quota Warnings */}
        {stats.quotaWarnings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Below Quota Warnings
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {stats.quotaWarnings.length} reviewer{stats.quotaWarnings.length !== 1 ? "s" : ""} below quota
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {stats.quotaWarnings.map((warning) => (
                        <li key={warning.id}>
                          <span className="font-medium">{warning.name}</span>: {warning.completed}/{warning.quota} ({warning.remaining} remaining)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
