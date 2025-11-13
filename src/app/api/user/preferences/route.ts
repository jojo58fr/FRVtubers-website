import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getToken, encode } from 'next-auth/jwt'
import { authOptions } from '../../auth/[...nextauth]/route'
import { DEFAULT_PREFERENCES, mergePreferences, type UserPreferences } from '@/lib/user-preferences'
import prisma from '@/lib/prisma'

const nextAuthSecret = process.env.NEXTAUTH_SECRET!

if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is required to handle user preferences.')
}

const SESSION_COOKIE_NAME = 'next-auth.session-token'
const SESSION_COOKIE_NAME_SECURE = '__Secure-next-auth.session-token'

const determineCookieName = (request: NextRequest) => {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const isSecure =
    forwardedProto === 'https' ||
    request.nextUrl.protocol === 'https:' ||
    process.env.NEXTAUTH_URL?.startsWith('https://')

  return isSecure ? SESSION_COOKIE_NAME_SECURE : SESSION_COOKIE_NAME
}

const getCookieOptions = (request: NextRequest) => {
  const maxAge = authOptions.session?.maxAge ?? 30 * 24 * 60 * 60
  const isSecure =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.nextUrl.protocol === 'https:' ||
    process.env.NEXTAUTH_URL?.startsWith('https://')

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const preferences = session.preferences ?? DEFAULT_PREFERENCES
  return NextResponse.json({ preferences })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const token = await getToken({ req: request, secret: nextAuthSecret })

  if (!token || !token.sub) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  let payload: Partial<UserPreferences>

  try {
    payload = (await request.json()) as Partial<UserPreferences>
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const nextPreferences = mergePreferences(token.userPreferences ?? DEFAULT_PREFERENCES, payload)

  try {
    await prisma.user.update({
      where: { id: token.sub },
      data: {
        theme: nextPreferences.theme,
        language: nextPreferences.language,
      },
    })
  } catch (error) {
    console.error('Failed to persist user preferences in database', error)
    return NextResponse.json({ error: 'Impossible de sauvegarder les pr�f�rences' }, { status: 500 })
  }

  token.userPreferences = nextPreferences

  const encoded = await encode({
    token: {
      ...token,
      userPreferences: nextPreferences,
    },
    secret: nextAuthSecret,
    maxAge: authOptions.session?.maxAge ?? 30 * 24 * 60 * 60,
  })

  const response = NextResponse.json({ preferences: nextPreferences })

  response.cookies.set(determineCookieName(request), encoded, getCookieOptions(request))

  return response
}
