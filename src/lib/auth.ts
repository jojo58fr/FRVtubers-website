import 'server-only'

import { type NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { CookieSerializeOptions } from 'cookie'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from '@/lib/prisma'
import { securityLog } from '@/lib/security-log'
import {
  buildDiscordAvatarUrl,
  getDiscordAvatarExtension,
  persistDiscordAvatar,
} from '@/lib/discord-avatar'
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
const NEXTAUTH_INTERNAL_URL = process.env.NEXTAUTH_URL_INTERNAL ?? process.env.NEXTAUTH_URL
const NEXTAUTH_SESSION_MAX_AGE = Number(process.env.NEXTAUTH_SESSION_MAX_AGE ?? 30 * 24 * 60 * 60)
const useSecureCookies =
  process.env.NEXTAUTH_FORCE_SECURE_COOKIES === 'true' ||
  process.env.NODE_ENV === 'production' ||
  (NEXTAUTH_INTERNAL_URL?.startsWith('https://') ?? false)
const COOKIE_PREFIX = useSecureCookies ? '__Secure-' : ''
const CSRF_PREFIX = useSecureCookies ? '__Host-' : ''

const safeParseHostname = (value?: string): string | undefined => {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    if (url.hostname === 'localhost') {
      return undefined
    }

    return url.hostname
  } catch {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }

    const hostCandidate = trimmed.replace(/^https?:\/\//, '').split(/[/?#]/)[0].split(':')[0]
    if (!hostCandidate || hostCandidate === 'localhost') {
      return undefined
    }

    return hostCandidate
  }
}

const normalizeCookieDomain = (candidate?: string): string | undefined => {
  if (!candidate) {
    return undefined
  }

  const trimmed = candidate.trim()
  if (!trimmed || trimmed === 'localhost') {
    return undefined
  }

  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`
}

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return value ?? null
  }

  if (value.startsWith('http')) {
    return value
  }

  if (!NEXTAUTH_INTERNAL_URL) {
    return value
  }

  try {
    return new URL(value, NEXTAUTH_INTERNAL_URL).toString()
  } catch {
    return value
  }
}

const cookieDomain = normalizeCookieDomain(
  process.env.NEXTAUTH_COOKIE_DOMAIN ?? safeParseHostname(NEXTAUTH_INTERNAL_URL) ?? safeParseHostname(process.env.NEXTAUTH_URL),
)

const cookieSameSite: CookieSerializeOptions['sameSite'] = useSecureCookies ? 'none' : 'lax'

const baseCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  sameSite: cookieSameSite,
  path: '/',
  secure: useSecureCookies,
}

const shouldIncludeCsrfDomain = CSRF_PREFIX !== '__Host-' // __Host- cookies must not include a Domain attribute

const cookieOptions = (
  overrides: Partial<CookieSerializeOptions> = {},
  { includeDomain }: { includeDomain?: boolean } = {},
): CookieSerializeOptions => ({
  ...baseCookieOptions,
  ...(includeDomain !== false && cookieDomain ? { domain: cookieDomain } : {}),
  ...overrides,
})

const nextAuthCookies = {
  sessionToken: {
    name: `${COOKIE_PREFIX}next-auth.session-token`,
    options: cookieOptions({ maxAge: NEXTAUTH_SESSION_MAX_AGE }),
  },
  callbackUrl: {
    name: `${COOKIE_PREFIX}next-auth.callback-url`,
    options: cookieOptions(),
  },
  csrfToken: {
    name: `${CSRF_PREFIX}next-auth.csrf-token`,
    options: cookieOptions({ maxAge: 24 * 60 * 60 }, { includeDomain: shouldIncludeCsrfDomain }),
  },
  pkceCodeVerifier: {
    name: `${COOKIE_PREFIX}next-auth.pkce.code_verifier`,
    options: cookieOptions({ maxAge: 60 * 15 }),
  },
  state: {
    name: `${COOKIE_PREFIX}next-auth.state`,
    options: cookieOptions({ maxAge: 60 * 15 }),
  },
  nonce: {
    name: `${COOKIE_PREFIX}next-auth.nonce`,
    options: cookieOptions(),
  },
}

const asSupportedTheme = (theme?: string | null): SupportedTheme =>
  theme === 'dark' ? 'dark' : 'light'

const asSupportedLanguage = (language?: string | null): SupportedLanguage =>
  language === 'en' ? 'en' : 'fr'

const parseRedirectAllowList = (value?: string): string[] => {
  if (!value) {
    return []
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const allowedRedirects = parseRedirectAllowList(process.env.NEXTAUTH_ALLOWED_REDIRECTS)
const shouldLogRedirects = process.env.NEXTAUTH_LOG_REDIRECTS === 'true'
const shouldLogNextAuth = process.env.NEXTAUTH_VERBOSE_LOG === 'true'
const logRedirectDecision = () => {
  if (shouldLogRedirects) securityLog('info', 'auth.redirect_checked')
}

// Always replace the default logger, including when verbose logging is off.
// Provider metadata/errors may contain OAuth tokens, profiles and cookies.
const nextAuthLogger = {
  error() { securityLog('error', 'auth.nextauth_error') },
  warn() { securityLog('warn', 'auth.nextauth_warning') },
  debug() {
    if (shouldLogNextAuth) securityLog('info', 'auth.nextauth_debug')
  },
}

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
      signal: AbortSignal.timeout(10_000),
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
  } catch {
    securityLog('warn', 'auth.token_refresh_failed')
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
      signal: AbortSignal.timeout(10_000),
    })

    if (guildsResponse.status === 429) {
      return { membership: null, rateLimited: true }
    }

    if (!guildsResponse.ok) {
      securityLog('warn', 'auth.membership_failed', guildsResponse.status)
      return { membership: null }
    }

    const guilds = (await guildsResponse.json()) as Array<{ id: string }>
    const isMember = guilds.some((guild) => guild.id === discordGuildId)

    if (!isMember) {
      return { membership: { isMember: false } }
    }

    const detailedResponse = await fetch(`https://discord.com/api/users/@me/guilds/${discordGuildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (detailedResponse.status === 429) {
      return { membership: null, rateLimited: true }
    }

    if (!detailedResponse.ok) {
      securityLog('warn', 'auth.membership_failed', detailedResponse.status)
      // Presence alone does not tell us whether the VTuber role is already
      // granted. Do not authorize an application using incomplete data.
      return { membership: null }
    }

    const detail = (await detailedResponse.json()) as { roles?: unknown; pending?: unknown }
    if (!Array.isArray(detail.roles) || !detail.roles.every((role): role is string => typeof role === 'string') ||
        (detail.pending !== undefined && typeof detail.pending !== 'boolean')) {
      securityLog('warn', 'auth.membership_failed')
      return { membership: null }
    }
    return {
      membership: {
        isMember: true,
        roles: detail.roles,
        pending: detail.pending,
      },
    }
  } catch {
    securityLog('warn', 'auth.membership_failed')
    return { membership: null }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      issuer: 'https://discord.com',
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
          image: profile.avatar ? buildDiscordAvatarUrl(profile.id, profile.avatar) : undefined,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: NEXTAUTH_SESSION_MAX_AGE,
  },
  cookies: nextAuthCookies,
  useSecureCookies,
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'discord' || !user?.id || !profile) {
        return
      }

      try {
        const discordProfile = profile as {
          id: string
          avatar?: string | null
          image?: string | null
        }

        const parseDiscordAvatarUrl = (value: string) => {
          try {
            const url = new URL(value)
            if (url.hostname !== 'cdn.discordapp.com') {
              return null
            }
            const match = url.pathname.match(/^\/avatars\/[^/]+\/([^/.]+)\.([a-z0-9]+)$/i)
            if (!match) {
              return null
            }
            return { hash: match[1], ext: match[2].toLowerCase() }
          } catch {
            return null
          }
        }

        const avatarFromProfile = discordProfile.avatar ?? undefined
        const avatarFromProfileIsUrl =
          typeof avatarFromProfile === 'string' && avatarFromProfile.startsWith('http')
        const rawAvatarUrl = avatarFromProfileIsUrl
          ? avatarFromProfile
          : discordProfile.image ?? undefined

        let avatarHash = avatarFromProfileIsUrl ? undefined : avatarFromProfile
        let avatarExtension = avatarHash ? getDiscordAvatarExtension(avatarHash) : null

        if (!avatarHash && rawAvatarUrl) {
          const parsed = parseDiscordAvatarUrl(rawAvatarUrl)
          if (parsed) {
            avatarHash = parsed.hash
            avatarExtension = parsed.ext
          }
        }

        const remoteAvatarUrl = avatarHash
          ? buildDiscordAvatarUrl(discordProfile.id, avatarHash)
          : rawAvatarUrl ?? null
        // Only the canonical CDN URL may be downloaded, never a profile URL.
        const downloadUrl = remoteAvatarUrl

        let storedAvatar: string | null = null

        if (downloadUrl && avatarHash && avatarExtension) {
          try {

            const persisted = await persistDiscordAvatar({
              discordId: discordProfile.id,
              avatarHash,
              sourceUrl: downloadUrl,
              extension: avatarExtension,
            })

            storedAvatar = persisted.publicPath
          } catch {
            securityLog('warn', 'auth.avatar_save_failed')
            storedAvatar = remoteAvatarUrl
          }
        } else if (remoteAvatarUrl) {
          storedAvatar = remoteAvatarUrl
        }

        const storedAvatarUrl = toAbsoluteUrl(storedAvatar)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: discordProfile.id,
            discordAvatar: storedAvatarUrl,
            image: storedAvatarUrl ?? user.image ?? null,
          },
        })
      } catch {
        securityLog('error', 'auth.profile_save_failed')
      }
    },
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      logRedirectDecision()

      try {
        const target = new URL(url, baseUrl)
        const base = new URL(baseUrl)

        if (target.origin === base.origin) {
          logRedirectDecision()
          return target.toString()
        }

        const isAllowed = allowedRedirects.some((allowedCandidate) => {
          try {
            const allowedUrl = new URL(allowedCandidate)
            const sameOrigin = allowedUrl.origin === target.origin
            const pathMatches =
              target.pathname === allowedUrl.pathname ||
              target.pathname.startsWith(
                allowedUrl.pathname.endsWith('/') ? allowedUrl.pathname : `${allowedUrl.pathname}/`,
              )

            return sameOrigin && pathMatches
          } catch {
            return false
          }
        })

        logRedirectDecision()

        if (isAllowed) {
          logRedirectDecision()
          return target.toString()
        }

        logRedirectDecision()
        return baseUrl
      } catch {
        logRedirectDecision()
        return baseUrl
      }
    },
    async jwt({ token, account, trigger, session }) {
      if (!token.sub || (account && account.provider !== 'discord')) return {}
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            discordId: true,
            name: true,
            email: true,
            theme: true,
            language: true,
            image: true,
            discordAvatar: true,
            discordIsMember: true,
            discordPending: true,
            discordRoles: true,
            discordMemberFetchedAt: true,
            adminRole: true,
            accounts: {
              where: { provider: 'discord' },
              select: { providerAccountId: true },
              take: 1,
            },
          },
        })

        const discordAccount = dbUser?.accounts[0]
        if (!dbUser || !discordAccount) {
          securityLog('warn', 'auth.account_unavailable')
          return {}
        }
        token.accountVerified = true
        token.discordId = discordAccount.providerAccountId
        token.name = dbUser.name
        token.email = dbUser.email
        token.picture = dbUser.image ?? dbUser.discordAvatar ?? null
        token.userPreferences = mergePreferences(DEFAULT_PREFERENCES, {
          theme: asSupportedTheme(dbUser.theme),
          language: asSupportedLanguage(dbUser.language),
        })

        token.discordIsMember =
          typeof dbUser.discordIsMember === 'boolean' ? dbUser.discordIsMember : undefined

        token.adminRole = dbUser.adminRole ?? 'MEMBER'

        if (dbUser.image || dbUser.discordAvatar) {
          token.picture = dbUser.image ?? dbUser.discordAvatar ?? token.picture
        }

        const rolesFromDb = parseRolesString(dbUser.discordRoles)
        token.discordMember =
          dbUser.discordIsMember
            ? { roles: rolesFromDb, pending: dbUser.discordPending ?? undefined }
            : undefined

        token.discordMemberFetchedAt = dbUser.discordMemberFetchedAt
          ? dbUser.discordMemberFetchedAt.getTime()
          : undefined
      } catch {
        securityLog('error', 'auth.account_unavailable')
        return {}
      }

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

      if (!token.discordAccessToken) {
        token.discordIsMember = undefined
        token.discordMember = undefined
        token.discordMemberFetchedAt = undefined
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
        } catch {
          securityLog('error', 'auth.preferences_save_failed')
        }

        token.userPreferences = nextPreferences
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
            } catch {
              securityLog('error', 'auth.membership_save_failed')
            }
          }
        } else {
          // An unavailable/unauthorized Discord response is not proof of
          // membership. Keep login available, but withhold membership rights.
          token.discordIsMember = undefined
          token.discordMember = undefined
          token.discordMemberFetchedAt = undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (!token.accountVerified || !token.sub) {
        return { expires: session.expires }
      }
      const vtuberRoleId = process.env.DISCORD_VTUBER_ROLE_ID
      // Explicit public session contract: never spread a JWT or provider data.
      return {
        expires: session.expires,
        user: {
          id: token.sub,
          discordId: token.discordId,
          name: token.name,
          email: token.email,
          image: token.picture,
        },
        preferences: token.userPreferences ?? DEFAULT_PREFERENCES,
        discordMember: token.discordMember,
        hasVtuberRole: Boolean(vtuberRoleId && token.discordMember?.roles.includes(vtuberRoleId)),
        isGuildMember: token.discordIsMember,
        adminRole: token.adminRole ?? 'MEMBER',
      }
    },
  },
  secret: nextAuthSecret,
  logger: nextAuthLogger,
}

