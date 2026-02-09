import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = ['https://stream.frvtubers.com']

const allowedOrigins = (process.env.NEXTAUTH_CORS_ALLOWED_ORIGINS ?? '')
  .split(/[,\s]+/)
  .map((origin) => origin.trim())
  .filter(Boolean)

const safeAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS

const applyCors = (response: NextResponse, origin: string | null) => {
  if (!origin || !safeAllowedOrigins.includes(origin)) {
    return response
  }

  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')

  return response
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return applyCors(
      new NextResponse(null, {
        status: 204,
      }),
      origin,
    )
  }

  return applyCors(NextResponse.next(), origin)
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/v1/auth/:path*', '/api/resources/:path*'],
}
