import NextAuth, { type NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import DiscordProvider from 'next-auth/providers/discord'
import CredentialsProvider from 'next-auth/providers/credentials'

const discordClientId = process.env.DISCORD_CLIENT_ID
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET
const discordGuildId = process.env.DISCORD_GUILD_ID
const nextAuthSecret = process.env.NEXTAUTH_SECRET

if (!discordClientId || !discordClientSecret) {
  throw new Error('Missing Discord OAuth credentials. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.')
}

if (!nextAuthSecret) {
  throw new Error('Missing NEXTAUTH_SECRET. Generate one (for example with `npx auth secret`) and set it in your environment.')
}

const MEMBER_CACHE_TTL = 0

async function refreshDiscordAccessToken(token: JWT): Promise<JWT> {
  if (!token.discordRefreshToken) {
    return {
      ...token,
      discordAccessToken: undefined,
      discordAccessTokenExpires: undefined,
      discordRefreshToken: undefined,
    }
  }

  try {
    const params = new URLSearchParams({
      client_id: discordClientId!,
      client_secret: discordClientSecret!,
      grant_type: 'refresh_token',
      refresh_token: token.discordRefreshToken,
    })

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Discord access token (${response.status})`)
    }

    const refreshed = await response.json()

    return {
      ...token,
      discordAccessToken: refreshed.access_token as string,
      discordAccessTokenExpires: Date.now() + (refreshed.expires_in as number) * 1000,
      discordRefreshToken: (refreshed.refresh_token as string | undefined) ?? token.discordRefreshToken,
    }
  } catch (error) {
    console.error('Error refreshing Discord access token', error)
    return {
      ...token,
      discordAccessToken: undefined,
      discordAccessTokenExpires: undefined,
      discordRefreshToken: undefined,
    }
  }
}

type DiscordMembership = {
  isMember: boolean
  roles?: string[]
  pending?: boolean
}

async function fetchDiscordMembership(accessToken: string): Promise<DiscordMembership | null> {
  if (!discordGuildId) {
    return null
  }

  try {
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!guildsResponse.ok) {
      console.error('Discord guild list request failed', guildsResponse.status)
      return null
    }

    const guilds = (await guildsResponse.json()) as Array<{ id: string }>
    const isMember = guilds.some((guild) => guild.id === discordGuildId)

    if (!isMember) {
      return { isMember: false }
    }

    const detailedResponse = await fetch(`https://discord.com/api/users/@me/guilds/${discordGuildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!detailedResponse.ok) {
      if (detailedResponse.status === 403 || detailedResponse.status === 404) {
        return { isMember: true }
      }

      console.error('Discord membership detail request failed', detailedResponse.status)
      return { isMember: true }
    }

    const detail = (await detailedResponse.json()) as { roles?: string[]; pending?: boolean }
    return {
      isMember: true,
      roles: detail.roles,
      pending: detail.pending,
    }
  } catch (error) {
    console.error('Failed to fetch Discord membership', error)
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
        },
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
            : undefined,
        }
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (credentials?.email === 'user@example.com' && credentials?.password === 'password') {
          return { id: '1', name: 'User', email: 'user@example.com' }
        }
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'discord') {
        token.discordAccessToken = account.access_token as string
        token.discordRefreshToken = account.refresh_token as string | undefined
        token.discordAccessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined
        token.discordMember = undefined
        token.discordMemberFetchedAt = undefined
        token.discordIsMember = undefined
      }

      if (
        token.discordAccessToken &&
        token.discordAccessTokenExpires &&
        Date.now() > token.discordAccessTokenExpires
      ) {
        token = await refreshDiscordAccessToken(token)
      }

      const shouldUpdateMember =
        !!token.discordAccessToken &&
        !!discordGuildId &&
        (!token.discordMemberFetchedAt ||
          MEMBER_CACHE_TTL === 0 ||
          Date.now() - token.discordMemberFetchedAt > MEMBER_CACHE_TTL)

      if (shouldUpdateMember && token.discordAccessToken) {
        const membership = await fetchDiscordMembership(token.discordAccessToken)

        if (membership) {
          token.discordIsMember = membership.isMember

          if (membership.isMember && membership.roles) {
            token.discordMember = {
              roles: membership.roles ?? [],
              pending: membership.pending ?? false,
            }
          } else {
            token.discordMember = undefined
          }

          if (membership.isMember === false) {
            token.discordMember = undefined
          }
        }

        token.discordMemberFetchedAt = Date.now()
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
      }

      if (token.discordMember) {
        session.discordMember = token.discordMember
      } else {
        session.discordMember = undefined
      }

      const vtuberRoleId = process.env.DISCORD_VTUBER_ROLE_ID
      if (vtuberRoleId && token.discordMember?.roles) {
        session.hasVtuberRole = token.discordMember.roles.includes(vtuberRoleId)
      } else {
        session.hasVtuberRole = false
      }

      if (typeof token.discordIsMember !== 'undefined') {
        session.isGuildMember = token.discordIsMember
      } else {
        session.isGuildMember = undefined
      }

      return session
    },
  },
  secret: nextAuthSecret,
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
