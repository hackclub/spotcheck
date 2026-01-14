import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { queueItemId } = body

  if (!queueItemId) {
    return NextResponse.json({ error: "Missing queueItemId" }, { status: 400 })
  }

  // Check if item is already claimed
  const item = await prisma.reviewQueue.findUnique({
    where: { id: queueItemId },
    select: { assignedTo: true },
  })

  if (!item) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 })
  }

  if (item.assignedTo) {
    return NextResponse.json(
      { error: "Item already claimed" },
      { status: 409 }
    )
  }

  // Claim the item
  const updated = await prisma.reviewQueue.update({
    where: { id: queueItemId },
    data: {
      assignedTo: session.user.id,
      assignedAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}
