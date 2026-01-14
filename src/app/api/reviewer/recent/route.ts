import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reviews = await prisma.spotCheck.findMany({
    where: { reviewerId: session.user.id },
    select: {
      id: true,
      projectName: true,
      assessment: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return NextResponse.json(reviews)
}
