'use client'

import { SessionProvider } from 'next-auth/react'
import { UserPreferencesProvider } from './providers/UserPreferencesProvider'

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <UserPreferencesProvider>{children}</UserPreferencesProvider>
    </SessionProvider>
  )
}
