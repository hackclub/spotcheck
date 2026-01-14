import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") || "all"

  let where = {}

  if (filter === "assigned") {
    where = { assignedTo: session.user.id }
  } else if (filter === "available") {
    where = { assignedTo: null }
  }
  // "all" shows everything

  const queue = await prisma.reviewQueue.findMany({
    where,
    orderBy: [
      { priority: "asc" }, // URGENT first
      { createdAt: "asc" }, // Oldest first
    ],
    take: 50,
  })

  return NextResponse.json(queue)
}
