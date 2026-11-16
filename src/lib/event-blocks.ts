import { randomUUID } from 'node:crypto'

export type LineupEntry = { name: string; url?: string }

export type EventBlock =
  | { id: string; type: 'heading'; text: string; level: 2 | 3 }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'image'; path: string; caption?: string }
  | { id: string; type: 'video'; url: string }
  | { id: string; type: 'lineup'; entries: LineupEntry[] }
  | { id: string; type: 'button'; label: string; url: string }
  | { id: string; type: 'gallery' }

const MAX_BLOCKS = 100
const MAX_HEADING = 200
const MAX_PARAGRAPH = 5000
const MAX_CAPTION = 300
const MAX_LABEL = 80
const MAX_LINEUP_ENTRIES = 100
const MAX_ID = 100

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export const isSafeHttpUrl = (url: string): boolean =>
  typeof url === 'string' && parseHttpUrl(url) !== null

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const YOUTUBE_PATH_PREFIXES = new Set(['live', 'shorts', 'embed'])
const TWITCH_HOSTS = new Set(['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'])
const YOUTUBE_ID = /^[A-Za-z0-9_-]{1,64}$/
const TWITCH_NAME = /^[A-Za-z0-9_]{1,64}$/

export const parseVideoUrl = (
  url: string,
): { provider: 'youtube' | 'twitch'; embedUrl: string } | null => {
  if (typeof url !== 'string') return null
  const parsed = parseHttpUrl(url)
  if (!parsed) return null
  const host = parsed.hostname.toLowerCase()

  if (host === 'youtu.be' || YOUTUBE_HOSTS.has(host)) {
    let id: string | null | undefined
    if (host === 'youtu.be') {
      id = parsed.pathname.split('/')[1]
    } else {
      // watch?v=<ID>, ou chemins /live/<ID>, /shorts/<ID>, /embed/<ID>.
      const [first, second] = parsed.pathname.split('/').filter(Boolean)
      id = first && YOUTUBE_PATH_PREFIXES.has(first) ? second : parsed.searchParams.get('v')
    }
    if (!id || !YOUTUBE_ID.test(id)) return null
    return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
  }

  if (TWITCH_HOSTS.has(host)) {
    const [first, second] = parsed.pathname.split('/').filter(Boolean)
    if (first === 'videos' && second && /^\d+$/.test(second)) {
      return { provider: 'twitch', embedUrl: `https://player.twitch.tv/?video=${second}` }
    }
    if (first && !second && TWITCH_NAME.test(first)) {
      return { provider: 'twitch', embedUrl: `https://player.twitch.tv/?channel=${first}` }
    }
  }

  return null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

// Block images live under /evenements/ (public/evenements/<slug>/). Strict check, no trimming:
// no control chars (browsers strip tab/newline from URLs), no "%" (encoded dot-segments),
// no backslash, no "//", no ".." segment, and the path must survive URL normalization unchanged.
const IMAGE_PREFIX = '/evenements/'
const isSafeUploadPath = (path: unknown): path is string => {
  if (typeof path !== 'string' || !path.startsWith(IMAGE_PREFIX) || path.length === IMAGE_PREFIX.length) {
    return false
  }
  if (/[\u0000-\u001f\u007f\s%\\]/.test(path) || path.includes('//')) return false
  if (path.split('/').includes('..')) return false
  try {
    return new URL(path, 'http://x').pathname === path
  } catch {
    return false
  }
}

// Lineup policy: an entry with an unsafe url keeps its name and loses only the url;
// an entry without a name is dropped.
const sanitizeLineupEntries = (value: unknown): LineupEntry[] => {
  if (!Array.isArray(value)) return []
  const entries: LineupEntry[] = []
  for (const raw of value.slice(0, MAX_LINEUP_ENTRIES)) {
    if (!isRecord(raw)) continue
    const name = cleanText(raw.name, MAX_LABEL)
    if (!name) continue
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    entries.push(url && isSafeHttpUrl(url) ? { name, url } : { name })
  }
  return entries
}

const sanitizeBlock = (raw: unknown): EventBlock | null => {
  if (!isRecord(raw)) return null
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, MAX_ID) : randomUUID()

  switch (raw.type) {
    case 'heading': {
      const text = cleanText(raw.text, MAX_HEADING)
      return text ? { id, type: 'heading', text, level: raw.level === 3 ? 3 : 2 } : null
    }
    case 'paragraph': {
      const text = cleanText(raw.text, MAX_PARAGRAPH)
      return text ? { id, type: 'paragraph', text } : null
    }
    case 'image': {
      if (!isSafeUploadPath(raw.path)) return null
      const caption = cleanText(raw.caption, MAX_CAPTION)
      return caption
        ? { id, type: 'image', path: raw.path, caption }
        : { id, type: 'image', path: raw.path }
    }
    case 'video': {
      if (typeof raw.url !== 'string' || !parseVideoUrl(raw.url)) return null
      return { id, type: 'video', url: raw.url.trim() }
    }
    case 'lineup':
      return { id, type: 'lineup', entries: sanitizeLineupEntries(raw.entries) }
    case 'button': {
      const label = cleanText(raw.label, MAX_LABEL)
      if (!label || typeof raw.url !== 'string' || !isSafeHttpUrl(raw.url.trim())) return null
      return { id, type: 'button', label, url: raw.url.trim() }
    }
    case 'gallery':
      return { id, type: 'gallery' }
    default:
      return null
  }
}

export const sanitizeBlocks = (input: unknown): EventBlock[] => {
  if (!Array.isArray(input)) return []
  const blocks: EventBlock[] = []
  for (const raw of input) {
    const block = sanitizeBlock(raw)
    if (block) blocks.push(block)
    if (blocks.length >= MAX_BLOCKS) break
  }
  return blocks
}
