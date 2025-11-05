import { DefaultSession } from 'next-auth'

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
  }
}
