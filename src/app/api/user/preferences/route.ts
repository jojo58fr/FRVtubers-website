import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DEFAULT_PREFERENCES, mergePreferences } from '@/lib/user-preferences'
import { isTrustedMutation, readJsonObject } from '@/lib/request-security'
import { securityLog } from '@/lib/security-log'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  return NextResponse.json({ preferences: session.preferences ?? DEFAULT_PREFERENCES }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 })
  }
  let payload: Record<string, unknown>
  try {
    payload = await readJsonObject(request)
  } catch (error) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, {
      status: error instanceof RangeError ? 413 : 400,
    })
  }
  const preferences = mergePreferences(session.preferences ?? DEFAULT_PREFERENCES, {
    ...(payload.theme === 'dark' || payload.theme === 'light' ? { theme: payload.theme } : {}),
    ...(payload.language === 'fr' || payload.language === 'en' ? { language: payload.language } : {}),
  })
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: preferences })
  } catch {
    securityLog('error', 'auth.preferences_save_failed')
    return NextResponse.json({ error: 'Impossible de sauvegarder les préférences' }, { status: 500 })
  }
  // NextAuth alone manages the session cookie, including its domain and chunks.
  return NextResponse.json({ preferences }, { headers: { 'Cache-Control': 'private, no-store' } })
}
