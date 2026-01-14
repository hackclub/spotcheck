"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface DashboardStats {
  todayReviews: number
  weeklyReviews: number
  dailyQuota: number
  weeklyQuota: number
  greenCount: number
  yellowCount: number
  redCount: number
  avgTimePerReview: number | null
  streakDays: number
  queueCount: number
  assignedCount: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data: stats, isLoading } = useSWR<DashboardStats>("/api/reviewer/stats", fetcher)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Here&apos;s your review activity overview
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/queue"
          className="flex items-center gap-4 p-6 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-colors"
        >
          <div className="p-3 bg-white/10 rounded-lg">
            <PlayIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold">Start Reviewing</p>
            <p className="text-sm text-red-100">
              {isLoading ? "..." : `${stats?.queueCount || 0} projects in queue`}
            </p>
          </div>
        </Link>

        {stats && stats.assignedCount > 0 && (
          <Link
            href="/dashboard/queue?filter=assigned"
            className="flex items-center gap-4 p-6 bg-amber-500 hover:bg-amber-600 rounded-xl text-white transition-colors"
          >
            <div className="p-3 bg-white/10 rounded-lg">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Continue Review</p>
              <p className="text-sm text-amber-100">
                {stats.assignedCount} assigned to you
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Reviews"
          value={isLoading ? "-" : stats?.todayReviews || 0}
          subtitle={`of ${stats?.dailyQuota || 10} daily quota`}
          progress={stats ? (stats.todayReviews / stats.dailyQuota) * 100 : 0}
        />
        <StatCard
          title="Weekly Reviews"
          value={isLoading ? "-" : stats?.weeklyReviews || 0}
          subtitle={`of ${stats?.weeklyQuota || 50} weekly quota`}
          progress={stats ? (stats.weeklyReviews / stats.weeklyQuota) * 100 : 0}
        />
        <StatCard
          title="Avg. Time"
          value={isLoading ? "-" : formatTime(stats?.avgTimePerReview)}
          subtitle="per review"
        />
        <StatCard
          title="Streak"
          value={isLoading ? "-" : `${stats?.streakDays || 0} days`}
          subtitle="keep it up!"
          highlight={stats && stats.streakDays >= 7}
        />
      </div>

      {/* Assessment Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Assessment Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <AssessmentStat
            label="Green"
            count={stats?.greenCount || 0}
            total={stats ? stats.greenCount + stats.yellowCount + stats.redCount : 0}
            color="green"
          />
          <AssessmentStat
            label="Yellow"
            count={stats?.yellowCount || 0}
            total={stats ? stats.greenCount + stats.yellowCount + stats.redCount : 0}
            color="yellow"
          />
          <AssessmentStat
            label="Red"
            count={stats?.redCount || 0}
            total={stats ? stats.greenCount + stats.yellowCount + stats.redCount : 0}
            color="red"
          />
        </div>
      </div>

      {/* Recent Activity placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Reviews
        </h2>
        <RecentReviews />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  progress,
  highlight,
}: {
  title: string
  value: string | number
  subtitle: string
  progress?: number
  highlight?: boolean
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border ${
      highlight ? "border-amber-400 dark:border-amber-500" : "border-gray-200 dark:border-gray-700"
    }`}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress >= 100 ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function AssessmentStat({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: "green" | "yellow" | "red"
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  const colorClasses = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    yellow: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs opacity-75">{percentage}% of total</p>
    </div>
  )
}

function RecentReviews() {
  const { data: reviews, isLoading } = useSWR<Array<{
    id: string
    projectName: string | null
    assessment: string
    createdAt: string
  }>>("/api/reviewer/recent", fetcher)

  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No reviews yet. Start reviewing to see your activity here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {reviews.slice(0, 5).map((review) => (
        <div
          key={review.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {review.projectName || "Unnamed Project"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(review.createdAt)}
            </p>
          </div>
          <AssessmentBadge assessment={review.assessment} />
        </div>
      ))}
    </div>
  )
}

function AssessmentBadge({ assessment }: { assessment: string }) {
  const colors = {
    GREEN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    YELLOW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    RED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[assessment as keyof typeof colors] || colors.GREEN}`}>
      {assessment}
    </span>
  )
}

function formatTime(seconds: number | null | undefined): string {
  if (!seconds) return "-"
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.round(seconds / 60)}m`
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
