import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      slackId: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
    }
  }

  interface User {
    slackId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string
  }
}
