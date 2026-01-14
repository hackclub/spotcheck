import { NextResponse } from "next/server"
import type { QueuePriority } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAirtableBase } from "@/lib/airtable"

const SOURCE_TABLE = process.env.AIRTABLE_PROJECTS_TABLE ?? "Projects"
const APPROVED_FILTER =
  "OR({Status}='Approved',{Approved}=1,{Approved}=TRUE())"

type AirtableRecord = {
  id: string
  get: (key: string) => unknown
}

type AirtableAttachment = {
  url?: string
}

const getField = <T>(record: AirtableRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record.get(key) as T | undefined | null
    if (value !== undefined && value !== null && value !== "") {
      return value
    }
  }
  return null
}

const asString = (value: unknown) => {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && "url" in first) {
      return (first as AirtableAttachment).url ?? null
    }
  }
  if (value && typeof value === "object" && "url" in (value as object)) {
    return (value as AirtableAttachment).url ?? null
  }
  return null
}

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const asDate = (value: unknown) => {
  if (value instanceof Date) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const asPriority = (value: unknown): QueuePriority | null => {
  if (typeof value !== "string") return null
  const normalized = value.trim().toUpperCase()
  if (
    normalized === "URGENT" ||
    normalized === "HIGH" ||
    normalized === "STANDARD" ||
    normalized === "BACKLOG"
  ) {
    return normalized as QueuePriority
  }
  return null
}

const fetchApprovedRecords = async () => {
  const base = getAirtableBase()
  try {
    return await base(SOURCE_TABLE).select({ filterByFormula: APPROVED_FILTER }).all()
  } catch (error) {
    console.warn("Approved filter failed, fetching without filter.", error)
    return await base(SOURCE_TABLE).select().all()
  }
}

export async function GET() {
  try {
    const records = await fetchApprovedRecords()
    let synced = 0

    for (const record of records) {
      const projectName = asString(
        getField(record, ["Project Name", "Name", "Title"])
      )

      if (!projectName) {
        continue
      }

      const programName = asString(
        getField(record, ["Program", "Program Name"])
      )
      const codeUrl = asString(
        getField(record, ["Code URL", "Repository", "Repo URL"])
      )
      const playableUrl = asString(
        getField(record, ["Playable URL", "Demo URL", "Playable", "Demo"])
      )
      const screenshotUrl = asString(
        getField(record, ["Screenshot", "Screenshot URL", "Image"])
      )
      const description = asString(
        getField(record, ["Description", "Summary"])
      )
      const hoursClaimed = asNumber(
        getField(record, ["Hours Claimed", "Hours", "Time Spent"])
      )
      const approverSlackId = asString(
        getField(record, ["Approver Slack ID", "Approver Slack"])
      )
      const approverName = asString(
        getField(record, ["Approver Name", "Approver"])
      )
      const approvedAt = asDate(
        getField(record, ["Approved At", "Approved Date"])
      )
      const authorSlackId = asString(
        getField(record, ["Author Slack ID", "Author Slack"])
      )
      const authorName = asString(getField(record, ["Author Name", "Author"]))
      const authorAge = asNumber(getField(record, ["Author Age", "Age"]))
      const priority =
        asPriority(getField(record, ["Priority"])) ?? undefined

      await prisma.reviewQueue.upsert({
        where: { projectId: record.id },
        update: {
          projectName,
          programName,
          codeUrl,
          playableUrl,
          screenshotUrl,
          description,
          hoursClaimed,
          approverSlackId,
          approverName,
          approvedAt,
          authorSlackId,
          authorName,
          authorAge: authorAge !== null ? Math.round(authorAge) : null,
          ...(priority ? { priority } : {}),
        },
        create: {
          projectId: record.id,
          projectName,
          programName,
          codeUrl,
          playableUrl,
          screenshotUrl,
          description,
          hoursClaimed,
          approverSlackId,
          approverName,
          approvedAt,
          authorSlackId,
          authorName,
          authorAge: authorAge !== null ? Math.round(authorAge) : null,
          ...(priority ? { priority } : {}),
        },
      })

      synced += 1
    }

    return NextResponse.json({ synced, total: records.length })
  } catch (error) {
    console.error("Failed to sync Airtable projects.", error)
    return NextResponse.json(
      { error: "Failed to sync Airtable projects." },
      { status: 500 }
    )
  }
}
