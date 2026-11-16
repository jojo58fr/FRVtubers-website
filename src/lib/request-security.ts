import 'server-only'

// CORS does not authorize cookie-authenticated writes; check Origin as well.
export function isTrustedMutation(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return !['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site') ?? '')
  }
  const configuredOrigin = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL_INTERNAL
  const candidates = [
    ...(configuredOrigin ? [] : [new URL(request.url).origin]),
    process.env.NEXTAUTH_URL,
    process.env.NEXTAUTH_URL_INTERNAL,
    ...(process.env.NEXTAUTH_CORS_ALLOWED_ORIGINS ?? '').split(/[,\s]+/),
  ]
  return candidates.some((candidate) => {
    if (!candidate) return false
    try {
      const parsed = new URL(candidate)
      return ['https:', 'http:'].includes(parsed.protocol) && parsed.origin === origin
    } catch {
      return false
    }
  })
}

export async function readJsonObject(request: Request, maxBytes = 8192): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader()
  if (!reader) throw new SyntaxError('Missing body')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new RangeError('Body too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new SyntaxError('Expected an object')
  }
  return payload as Record<string, unknown>
}
