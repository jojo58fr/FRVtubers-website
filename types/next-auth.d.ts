import { AdminRole } from '@prisma/client'
import { DefaultSession } from 'next-auth'
import { type UserPreferences } from '@/lib/user-preferences'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user?: DefaultSession['user'] & {
      id?: string
    }
    discordMember?: {
      roles: string[]
      pending?: boolean
    }
    hasVtuberRole?: boolean
    isGuildMember?: boolean
    preferences?: UserPreferences
    adminRole?: AdminRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordAccessToken?: string
    discordRefreshToken?: string
    discordAccessTokenExpires?: number
    discordMember?: {
      roles: string[]
      pending?: boolean
    }
    discordMemberFetchedAt?: number
    discordIsMember?: boolean
    userPreferences?: UserPreferences
    adminRole?: AdminRole
  }
}
