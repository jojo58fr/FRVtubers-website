import NextAuth, { type NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import DiscordProvider from 'next-auth/providers/discord'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from '@/lib/prisma'
import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  type SupportedLanguage,
  type SupportedTheme,
  type UserPreferences,
} from '@/lib/user-preferences'

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

const MEMBER_CACHE_MS = Number(process.env.DISCORD_MEMBER_CACHE_MS ?? 5 * 60 * 1000)
const ROLE_STRING_SEPARATOR = ','

const asSupportedTheme = (theme?: string | null): SupportedTheme =>
  theme === 'dark' ? 'dark' : 'light'

const asSupportedLanguage = (language?: string | null): SupportedLanguage =>
  language === 'en' ? 'en' : 'fr'

const parseRolesString = (roles?: string | null): string[] => {
  if (!roles) {
    return []
  }

  try {
    const parsed = JSON.parse(roles)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string')
    }
  } catch {
    // fall through to separator-based parsing
  }

  return roles.split(ROLE_STRING_SEPARATOR).map((role) => role.trim()).filter(Boolean)
}

const serializeRoles = (roles?: string[] | null): string | null => {
  if (!roles || roles.length === 0) {
    return null
  }

  return JSON.stringify(roles)
}

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

type DiscordMembershipResult = {
  membership: DiscordMembership | null
  rateLimited?: boolean
}

async function fetchDiscordMembership(accessToken: string): Promise<DiscordMembershipResult> {
  if (!discordGuildId) {
    return { membership: null }
  }

  try {
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (guildsResponse.status === 429) {
      return { membership: null, rateLimited: true }
    }

    if (!guildsResponse.ok) {
      console.error('Discord guild list request failed', guildsResponse.status)
      return { membership: null }
    }

    const guilds = (await guildsResponse.json()) as Array<{ id: string }>
    const isMember = guilds.some((guild) => guild.id === discordGuildId)

    if (!isMember) {
      return { membership: { isMember: false } }
    }

    const detailedResponse = await fetch(`https://discord.com/api/users/@me/guilds/${discordGuildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (detailedResponse.status === 429) {
      return { membership: null, rateLimited: true }
    }

    if (!detailedResponse.ok) {
      if (detailedResponse.status === 403 || detailedResponse.status === 404) {
        return { membership: { isMember: true } }
      }

      console.error('Discord membership detail request failed', detailedResponse.status)
      return { membership: { isMember: true } }
    }

    const detail = (await detailedResponse.json()) as { roles?: string[]; pending?: boolean }
    return {
      membership: {
        isMember: true,
        roles: detail.roles,
        pending: detail.pending,
      },
    }
  } catch (error) {
    console.error('Failed to fetch Discord membership', error)
    return { membership: null }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'discord' || !user?.id || !profile) {
        return
      }

      try {
        const discordProfile = profile as {
          id: string
          avatar?: string | null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: discordProfile.id,
            discordAvatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png?size=256`
              : null,
            image:
              user.image ??
              (discordProfile.avatar
                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png?size=256`
                : null),
          },
        })
      } catch (error) {
        console.error('Failed to persist Discord profile data', error)
      }
    },
  },
  callbacks: {
    async jwt({ token, account, trigger, session }) {
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

      if (trigger === 'update' && session?.preferences && token.sub) {
        const nextPreferences = mergePreferences(DEFAULT_PREFERENCES, session.preferences as UserPreferences)
        try {
          await prisma.user.update({
            where: { id: token.sub },
            data: {
              theme: nextPreferences.theme,
              language: nextPreferences.language,
            },
          })
        } catch (error) {
          console.error('Failed to persist updated preferences', error)
        }

        token.userPreferences = nextPreferences
      }

      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              theme: true,
              language: true,
              discordIsMember: true,
              discordPending: true,
              discordRoles: true,
              discordMemberFetchedAt: true,
              adminRole: true,
            },
          })

          if (dbUser) {
            token.userPreferences = mergePreferences(DEFAULT_PREFERENCES, {
              theme: asSupportedTheme(dbUser.theme),
              language: asSupportedLanguage(dbUser.language),
            })

            token.discordIsMember =
              typeof dbUser.discordIsMember === 'boolean' ? dbUser.discordIsMember : undefined

            if (dbUser.adminRole) {
              token.adminRole = dbUser.adminRole
            }

            const rolesFromDb = parseRolesString(dbUser.discordRoles)
            token.discordMember =
              dbUser.discordIsMember && rolesFromDb.length > 0
                ? { roles: rolesFromDb, pending: dbUser.discordPending ?? undefined }
                : undefined

            token.discordMemberFetchedAt = dbUser.discordMemberFetchedAt
              ? dbUser.discordMemberFetchedAt.getTime()
              : undefined
          }
        } catch (error) {
          console.error('Failed to load user preferences from database', error)
        }
      }

      if (!token.userPreferences) {
        token.userPreferences = DEFAULT_PREFERENCES
      }

      if (!token.adminRole) {
        token.adminRole = 'MEMBER'
      }

      const lastFetched =
        token.discordMemberFetchedAt ??
        (typeof token.discordIsMember !== 'undefined' ? Date.now() : undefined)

      const shouldUpdateMember =
        !!token.discordAccessToken &&
        !!discordGuildId &&
        (MEMBER_CACHE_MS === 0 ||
          !lastFetched ||
          Date.now() - lastFetched > MEMBER_CACHE_MS)

      if (shouldUpdateMember && token.discordAccessToken) {
        const { membership, rateLimited } = await fetchDiscordMembership(token.discordAccessToken)

        if (rateLimited) {
          token.discordMemberFetchedAt = Date.now()
        } else if (membership) {
          token.discordIsMember = membership.isMember

          if (membership.isMember && membership.roles) {
            token.discordMember = {
              roles: membership.roles ?? [],
              pending: membership.pending ?? false,
            }
          } else {
            token.discordMember = undefined
          }

          token.discordMemberFetchedAt = Date.now()

          if (token.sub) {
            try {
              await prisma.user.update({
                where: { id: token.sub },
                data: {
                  discordIsMember: membership.isMember,
                  discordPending: membership.pending ?? null,
                  discordRoles: serializeRoles(membership.roles ?? null),
                  discordMemberFetchedAt: new Date(),
                },
              })
            } catch (error) {
              console.error('Failed to persist Discord membership snapshot', error)
            }
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
      }

      session.preferences = token.userPreferences ?? DEFAULT_PREFERENCES

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

      session.adminRole = token.adminRole ?? 'MEMBER'

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
