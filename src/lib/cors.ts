const parseOriginList = (value: string | undefined) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const defaultOrigins = [
  process.env.NEXTAUTH_URL,
  process.env.NEXTAUTH_URL_INTERNAL,
].filter((value): value is string => Boolean(value))

const allowedOrigins = new Set([
  ...defaultOrigins,
  ...parseOriginList(process.env.NEXTAUTH_CORS_ALLOWED_ORIGINS),
])

const normalizeMethods = (methods: string[]) => {
  const normalized = methods.map((method) => method.trim().toUpperCase()).filter((method) => method.length > 0)
  return Array.from(new Set([...normalized, 'OPTIONS']))
}

export const buildCorsHeaders = (origin: string | null, methods: string[] = ['GET']) => {
  const headers = new Headers()
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  }
  headers.set('Vary', 'Origin')
  headers.set('Access-Control-Allow-Methods', normalizeMethods(methods).join(','))
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}
