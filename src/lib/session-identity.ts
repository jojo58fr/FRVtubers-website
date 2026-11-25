import type { Session } from 'next-auth'

// NextAuth may return an expiry-only session after server-side invalidation.
// Its client status alone must not make that identity appear signed in.
export function hasSessionIdentity(session: Session | null | undefined): boolean {
  return typeof session?.user?.id === 'string' && session.user.id.length > 0
}
