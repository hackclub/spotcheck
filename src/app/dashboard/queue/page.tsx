"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { IssueSelectionModal } from "@/components/IssueSelectionModal"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface QueueItem {
  id: string
  projectId: string
  projectName: string
  programName: string | null
  codeUrl: string | null
  playableUrl: string | null
  screenshotUrl: string | null
  description: string | null
  hoursClaimed: number | null
  approverName: string | null
  authorName: string | null
  priority: "URGENT" | "HIGH" | "STANDARD" | "BACKLOG"
  autoFlagged: boolean
  autoFlagReasons: string[]
  assignedTo: string | null
  createdAt: string
}

interface ModalState {
  isOpen: boolean
  item: QueueItem | null
  assessmentType: "YELLOW" | "RED"
}

export default function QueuePage() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")
  const [filter, setFilter] = useState<"all" | "assigned" | "available">(
    filterParam === "assigned" ? "assigned" : "all"
  )
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    item: null,
    assessmentType: "YELLOW",
  })

  const { data: queue, isLoading, mutate } = useSWR<QueueItem[]>(
    `/api/reviewer/queue?filter=${filter}`,
    fetcher
  )

  const handleClaim = async (itemId: string) => {
    const res = await fetch("/api/reviewer/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueItemId: itemId }),
    })
    if (res.ok) {
      mutate()
    }
  }

  const handleOpenModal = (item: QueueItem, assessmentType: "YELLOW" | "RED") => {
    setModalState({ isOpen: true, item, assessmentType })
  }

  const handleCloseModal = () => {
    setModalState({ isOpen: false, item: null, assessmentType: "YELLOW" })
  }

  const handleSubmitIssue = async (data: {
    assessment: "YELLOW" | "RED"
    issueTypes: string[]
    notesForAuthor: string
    internalNotes: string
  }) => {
    if (!modalState.item) return

    const res = await fetch("/api/reviewer/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueItemId: modalState.item.id,
        projectId: modalState.item.projectId,
        ...data,
      }),
    })

    if (res.ok) {
      mutate()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review Queue
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Projects awaiting spot check review
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["all", "available", "assigned"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading queue...
        </div>
      ) : !queue || queue.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onClaim={() => handleClaim(item.id)}
              onYellow={() => handleOpenModal(item, "YELLOW")}
              onRed={() => handleOpenModal(item, "RED")}
            />
          ))}
        </div>
      )}

      {/* Issue Selection Modal */}
      {modalState.item && (
        <IssueSelectionModal
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitIssue}
          assessmentType={modalState.assessmentType}
          projectName={modalState.item.projectName}
        />
      )}
    </div>
  )
}

function QueueItemCard({
  item,
  onClaim,
  onYellow,
  onRed,
}: {
  item: QueueItem
  onClaim: () => void
  onYellow: () => void
  onRed: () => void
}) {
  const priorityColors = {
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    STANDARD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    BACKLOG: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Priority & Flags */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[item.priority]}`}>
                {item.priority}
              </span>
              {item.autoFlagged && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Auto-flagged
                </span>
              )}
              {item.programName && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {item.programName}
                </span>
              )}
            </div>

            {/* Project Name */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {item.projectName}
            </h3>

            {/* Description */}
            {item.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {item.authorName && (
                <span className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  {item.authorName}
                </span>
              )}
              {item.approverName && (
                <span className="flex items-center gap-1">
                  <CheckBadgeIcon className="w-4 h-4" />
                  Approved by {item.approverName}
                </span>
              )}
              {item.hoursClaimed && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {item.hoursClaimed}h claimed
                </span>
              )}
            </div>

            {/* Auto-flag Reasons */}
            {item.autoFlagged && item.autoFlagReasons.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Flagged for:
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {item.autoFlagReasons.join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            {item.assignedTo ? (
              <>
                {/* Assessment Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onYellow}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                    title="Flag issues"
                  >
                    Yellow
                  </button>
                  <button
                    onClick={onRed}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    title="Flag for removal"
                  >
                    Red
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onClaim}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Claim
              </button>
            )}

            {/* Links */}
            <div className="flex items-center gap-2">
              {item.codeUrl && (
                <a
                  href={item.codeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="View Code"
                >
                  <CodeIcon className="w-5 h-5" />
                </a>
              )}
              {item.playableUrl && (
                <a
                  href={item.playableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="View Demo"
                >
                  <PlayIcon className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Preview */}
      {item.screenshotUrl && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <img
            src={item.screenshotUrl}
            alt={`Screenshot of ${item.projectName}`}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
    </div>
  )
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
        <InboxIcon className="w-full h-full" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {filter === "assigned" ? "No assigned reviews" : "Queue is empty"}
      </h3>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        {filter === "assigned"
          ? "Claim a project from the queue to start reviewing."
          : "Check back later for new projects to review."}
      </p>
    </div>
  )
}

// Icons
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
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

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
}
