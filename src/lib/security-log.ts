import 'server-only'

// Only fixed event names and numeric HTTP statuses are accepted. Never pass an
// Error, request, URL, profile or provider response to the logging sink.
export type SecurityEvent =
  | 'auth.nextauth_error' | 'auth.nextauth_warning' | 'auth.nextauth_debug'
  | 'auth.redirect_checked' | 'auth.token_refresh_failed'
  | 'auth.membership_failed' | 'auth.profile_save_failed'
  | 'auth.account_unavailable' | 'auth.preferences_save_failed'
  | 'auth.membership_save_failed' | 'auth.avatar_save_failed'
  | 'admin.access_denied' | 'admin.role_changed' | 'admin.operation_failed'
  | 'discord.webhook_failed' | 'discord.application_denied'
  | 'database.error' | 'database.warning' | 'storage.operation_failed'

export function securityLog(
  level: 'error' | 'warn' | 'info',
  event: SecurityEvent,
  status?: number,
) {
  const details = Number.isInteger(status) && status! >= 100 && status! <= 599
    ? { event, status }
    : { event }
  console[level]('[security]', details)
}
