import type { AdminRole } from '@prisma/client'
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const ADMIN_HOME_PATH = '/admin'

const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const FALLBACK_COMITE_ROLE: AdminRole = 'COMITE'

const resolveSessionRole = (session: Session | null): AdminRole => {
  if (!session) {
    return 'MEMBER'
  }

  const fallbackIsComite = session.user?.id && ADMIN_DISCORD_IDS.includes(session.user.id)
  if (fallbackIsComite) {
    return FALLBACK_COMITE_ROLE
  }

  return session.adminRole ?? 'MEMBER'
}

const hasRole = (role: AdminRole, required: 'moderator' | 'comite'): boolean => {
  if (required === 'comite') {
    return role === 'COMITE'
  }

  return role === 'MODERATOR' || role === 'COMITE'
}

export const isAdminSession = (session: Session | null) =>
  hasRole(resolveSessionRole(session), 'moderator')

export const isModeratorSession = (session: Session | null) =>
  hasRole(resolveSessionRole(session), 'moderator')

export const isComiteSession = (session: Session | null) =>
  hasRole(resolveSessionRole(session), 'comite')

export const requireAdminSession = async (
  options: { redirectTo?: string; requiredRole?: 'moderator' | 'comite' } = {},
) => {
  const session = await getServerSession(authOptions)
  const role = resolveSessionRole(session)
  const requiredRole = options.requiredRole ?? 'moderator'

  if (!hasRole(role, requiredRole)) {
    redirect('/login?callbackUrl=' + encodeURIComponent(options.redirectTo ?? ADMIN_HOME_PATH))
  }
  return session!
}

export const getAdminDiscordIds = () => [...ADMIN_DISCORD_IDS]

export const ADMIN_PANEL_PATH = ADMIN_HOME_PATH
