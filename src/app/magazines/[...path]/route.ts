import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { resolveMagazinePath } from '@/lib/magazine-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const getContentType = (filename: string) =>
  CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream'

const parseRange = (rangeHeader: string, size: number) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match || size === 0) {
    return null
  }

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) {
    return null
  }

  let start: number
  let end: number

  if (!rawStart) {
    const suffixLength = Number(rawEnd)
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null
    }
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd ? Number(rawEnd) : size - 1
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

const serveMagazineFile = async (request: Request, context: RouteContext, headOnly: boolean) => {
  const { path: pathSegments } = await context.params
  const absolutePath = resolveMagazinePath(pathSegments)

  if (!absolutePath) {
    return new Response('Not Found', { status: 404 })
  }

  let fileStats
  try {
    fileStats = await stat(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new Response('Not Found', { status: 404 })
    }
    console.error('Impossible de lire le fichier du magazine', absolutePath, error)
    return new Response('Internal Server Error', { status: 500 })
  }

  if (!fileStats.isFile()) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Content-Type': getContentType(absolutePath),
    'Last-Modified': fileStats.mtime.toUTCString(),
  })

  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    const range = parseRange(rangeHeader, fileStats.size)
    if (!range) {
      headers.set('Content-Range', `bytes */${fileStats.size}`)
      return new Response(null, { status: 416, headers })
    }

    const contentLength = range.end - range.start + 1
    headers.set('Content-Length', String(contentLength))
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${fileStats.size}`)

    if (headOnly) {
      return new Response(null, { status: 206, headers })
    }

    const stream = createReadStream(absolutePath, range)
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers })
  }

  headers.set('Content-Length', String(fileStats.size))
  if (headOnly) {
    return new Response(null, { status: 200, headers })
  }

  const stream = createReadStream(absolutePath)
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers })
}

export const GET = (request: Request, context: RouteContext) =>
  serveMagazineFile(request, context, false)

export const HEAD = (request: Request, context: RouteContext) =>
  serveMagazineFile(request, context, true)
