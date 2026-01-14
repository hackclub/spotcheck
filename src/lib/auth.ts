import { NextAuthOptions } from "next-auth"
import { prisma } from "./prisma"

// Custom Hack Club OAuth Provider
const HackClubProvider = {
  id: "hackclub",
  name: "Hack Club",
  type: "oauth" as const,
  authorization: {
    url: "https://auth.hackclub.com/oauth/authorize",
    params: { scope: "read" }
  },
  token: "https://auth.hackclub.com/oauth/token",
  userinfo: "https://auth.hackclub.com/api/v1/me",
  clientId: process.env.HACKCLUB_AUTH_CLIENT_ID,
  clientSecret: process.env.HACKCLUB_AUTH_CLIENT_SECRET,
  profile(profile: HackClubProfile) {
    return {
      id: profile.slack_id || profile.id,
      name: profile.name || profile.email?.split('@')[0],
      email: profile.email,
      image: profile.avatar,
      slackId: profile.slack_id,
    }
  },
}

interface HackClubProfile {
  id: string
  email?: string
  name?: string
  slack_id?: string
  avatar?: string
}

export const authOptions: NextAuthOptions = {
  providers: [HackClubProvider],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      // Create or update user in database
      const slackId = (user as { slackId?: string }).slackId || user.id

      await prisma.user.upsert({
        where: { slackId },
        update: {
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
        },
        create: {
          slackId,
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          role: "REVIEWER", // Default role
        },
      })

      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { slackId: token.sub },
        })

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.slackId = dbUser.slackId
          session.user.role = dbUser.role
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as { slackId?: string }).slackId || user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
