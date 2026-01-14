"use client"

import { useState } from "react"

// Issue types mapped to assessment levels
const RED_ISSUES = [
  { value: "DUPLICATE", label: "Duplicate", description: "Same project submitted multiple times" },
  { value: "NOT_REAL", label: "Not Real", description: "Test submission, placeholder, not a project" },
  { value: "PLAGIARISM", label: "Plagiarism", description: "Code copied from tutorial/template" },
  { value: "BROKEN", label: "Broken", description: "No working demo AND no way to run" },
  { value: "FRAUD", label: "Fraud", description: "Intentionally misleading" },
] as const

const YELLOW_ISSUES = [
  { value: "REPO_404", label: "Repo 404", description: "Code repository doesn't exist" },
  { value: "DEMO_404", label: "Demo 404", description: "Playable/demo URL doesn't work" },
  { value: "HOURS_INFLATED", label: "Hours Inflated", description: "Hours claimed too high for scope" },
  { value: "INCOMPLETE", label: "Incomplete", description: "Missing required components" },
  { value: "LOW_EFFORT", label: "Low Effort", description: "Minimal work, doesn't meet standards" },
  { value: "NEEDS_INFO", label: "Needs Info", description: "Can't evaluate without more info" },
  { value: "OTHER", label: "Other", description: "Other issue (see notes)" },
] as const

type IssueType = typeof RED_ISSUES[number]["value"] | typeof YELLOW_ISSUES[number]["value"]

interface IssueSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    assessment: "YELLOW" | "RED"
    issueTypes: IssueType[]
    notesForAuthor: string
    internalNotes: string
  }) => void
  assessmentType: "YELLOW" | "RED"
  projectName: string
}

export function IssueSelectionModal({
  isOpen,
  onClose,
  onSubmit,
  assessmentType,
  projectName,
}: IssueSelectionModalProps) {
  const [selectedIssues, setSelectedIssues] = useState<IssueType[]>([])
  const [notesForAuthor, setNotesForAuthor] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const issues = assessmentType === "RED" ? RED_ISSUES : YELLOW_ISSUES
  const accentColor = assessmentType === "RED" ? "red" : "amber"

  const handleToggleIssue = (issueValue: IssueType) => {
    setSelectedIssues((prev) =>
      prev.includes(issueValue)
        ? prev.filter((i) => i !== issueValue)
        : [...prev, issueValue]
    )
  }

  const handleSubmit = async () => {
    if (selectedIssues.length === 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        assessment: assessmentType,
        issueTypes: selectedIssues,
        notesForAuthor,
        internalNotes,
      })
      // Reset form
      setSelectedIssues([])
      setNotesForAuthor("")
      setInternalNotes("")
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedIssues([])
    setNotesForAuthor("")
    setInternalNotes("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-${accentColor}-50 dark:bg-${accentColor}-900/20 rounded-t-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-semibold text-${accentColor}-900 dark:text-${accentColor}-100`}>
                  {assessmentType === "RED" ? "Flag for Removal" : "Flag Issues"}
                </h2>
                <p className={`text-sm text-${accentColor}-700 dark:text-${accentColor}-300 mt-0.5`}>
                  {projectName}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Issue Types */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Select Issue Type(s) <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <label
                    key={issue.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIssues.includes(issue.value)
                        ? `border-${accentColor}-500 bg-${accentColor}-50 dark:bg-${accentColor}-900/20`
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIssues.includes(issue.value)}
                      onChange={() => handleToggleIssue(issue.value)}
                      className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-${accentColor}-600 focus:ring-${accentColor}-500`}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {issue.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {issue.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes for Author */}
            <div>
              <label
                htmlFor="notesForAuthor"
                className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
              >
                Notes for Author
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                  (will be sent to them)
                </span>
              </label>
              <textarea
                id="notesForAuthor"
                rows={3}
                value={notesForAuthor}
                onChange={(e) => setNotesForAuthor(e.target.value)}
                placeholder="Explain what's wrong and what they can do to fix it..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label
                htmlFor="internalNotes"
                className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
              >
                Internal Notes
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                  (only visible to staff)
                </span>
              </label>
              <textarea
                id="internalNotes"
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Any additional context for the team..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIssues.length === 0 || isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                assessmentType === "RED"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
