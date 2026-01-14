import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Flag reasons
const FLAG_REPO_404 = "repo_404"
const FLAG_SUSPICIOUS_URL = "suspicious_url"
const FLAG_DUPLICATE_CODE = "duplicate_code_url"
const FLAG_HIGH_HOURS = "hours_over_100"
const FLAG_SHORT_DESCRIPTION = "short_description"

// Suspicious URL patterns
const SUSPICIOUS_PATTERNS = [
  /bit\.ly/i,
  /tinyurl/i,
  /t\.co/i,
  /goo\.gl/i,
  /rb\.gy/i,
  /shorturl/i,
  /pastebin\.com/i,
  /hastebin\.com/i,
  /paste\./i,
  /raw\.githubusercontent\.com.*gist/i,
]

// Allowed code URL domains
const ALLOWED_CODE_DOMAINS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
  "sr.ht",
  "replit.com",
  "glitch.com",
  "codesandbox.io",
  "stackblitz.com",
]

async function checkRepoExists(url: string): Promise<boolean> {
  if (!url) return true // No URL to check

  // Extract GitHub repo info
  const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
  if (!githubMatch) return true // Not a GitHub URL, skip check

  const [, owner, repo] = githubMatch
  const cleanRepo = repo.replace(/\.git$/, "")

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      method: "HEAD",
      headers: {
        "User-Agent": "SpotCheck-AutoFlag/1.0",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    })
    return response.status !== 404
  } catch {
    // Network error, don't flag
    return true
  }
}

function isSuspiciousUrl(url: string | null): boolean {
  if (!url) return false

  // Check against suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) return true
  }

  // Check if code URL uses non-standard domain
  try {
    const parsed = new URL(url)
    const isKnownDomain = ALLOWED_CODE_DOMAINS.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
    // Only flag if it looks like a code URL but uses unknown domain
    if (url.includes("code") || url.includes("repo") || url.includes("git")) {
      if (!isKnownDomain) return true
    }
  } catch {
    // Invalid URL is suspicious
    return true
  }

  return false
}

function isShortDescription(description: string | null): boolean {
  if (!description) return true
  // Flag if description is less than 50 characters
  return description.trim().length < 50
}

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    processed: 0,
    flagged: 0,
    errors: 0,
    details: [] as Array<{
      projectId: string
      projectName: string
      reasons: string[]
    }>,
  }

  try {
    // Get unflagged queue items that haven't been reviewed yet
    const queueItems = await prisma.reviewQueue.findMany({
      where: {
        autoFlagged: false,
        assignedTo: null, // Not yet assigned to a reviewer
      },
      take: 100, // Process in batches
    })

    // Find duplicate code URLs
    const codeUrls = queueItems
      .filter(item => item.codeUrl)
      .map(item => item.codeUrl!)

    const urlCounts: Record<string, number> = {}
    for (const url of codeUrls) {
      const normalized = url.toLowerCase().replace(/\/$/, "")
      urlCounts[normalized] = (urlCounts[normalized] || 0) + 1
    }

    // Also check against existing queue items for duplicates
    const existingDuplicates = await prisma.reviewQueue.groupBy({
      by: ["codeUrl"],
      where: {
        codeUrl: { not: null },
      },
      _count: true,
      having: {
        codeUrl: {
          _count: { gt: 1 },
        },
      },
    })

    const duplicateUrls = new Set([
      ...Object.entries(urlCounts)
        .filter(([, count]) => count > 1)
        .map(([url]) => url),
      ...existingDuplicates.map(d => d.codeUrl?.toLowerCase().replace(/\/$/, "") || ""),
    ])

    // Process each queue item
    for (const item of queueItems) {
      try {
        const reasons: string[] = []

        // Check 1: 404 repos
        if (item.codeUrl) {
          const exists = await checkRepoExists(item.codeUrl)
          if (!exists) {
            reasons.push(FLAG_REPO_404)
          }
        }

        // Check 2: Suspicious URLs
        if (isSuspiciousUrl(item.codeUrl) || isSuspiciousUrl(item.playableUrl)) {
          reasons.push(FLAG_SUSPICIOUS_URL)
        }

        // Check 3: Duplicate code URLs
        if (item.codeUrl) {
          const normalized = item.codeUrl.toLowerCase().replace(/\/$/, "")
          if (duplicateUrls.has(normalized)) {
            reasons.push(FLAG_DUPLICATE_CODE)
          }
        }

        // Check 4: >100 hours
        if (item.hoursClaimed && item.hoursClaimed > 100) {
          reasons.push(FLAG_HIGH_HOURS)
        }

        // Check 5: Short description
        if (isShortDescription(item.description)) {
          reasons.push(FLAG_SHORT_DESCRIPTION)
        }

        // Update if any flags found
        if (reasons.length > 0) {
          await prisma.reviewQueue.update({
            where: { id: item.id },
            data: {
              autoFlagged: true,
              autoFlagReasons: reasons,
              priority: "URGENT", // Flagged items need urgent review
            },
          })

          results.flagged++
          results.details.push({
            projectId: item.projectId,
            projectName: item.projectName,
            reasons,
          })
        }

        results.processed++
      } catch (err) {
        console.error(`Error processing item ${item.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (err) {
    console.error("Auto-flag cron error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
