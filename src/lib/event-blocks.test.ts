import { describe, expect, it } from 'vitest'
import { isSafeHttpUrl, parseVideoUrl, sanitizeBlocks } from '@/lib/event-blocks'

describe('isSafeHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(isSafeHttpUrl('https://example.com/a')).toBe(true)
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false)
    expect(isSafeHttpUrl('//example.com')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
})

describe('parseVideoUrl', () => {
  it('parses youtu.be and youtube.com watch URLs', () => {
    const expected = { provider: 'youtube', embedUrl: 'https://www.youtube.com/embed/abc123' }
    expect(parseVideoUrl('https://youtu.be/abc123')).toEqual(expected)
    expect(parseVideoUrl('https://www.youtube.com/watch?v=abc123')).toEqual(expected)
    expect(parseVideoUrl('https://youtube.com/watch?v=abc123')).toEqual(expected)
  })

  it('parses twitch videos and channels without a parent parameter', () => {
    expect(parseVideoUrl('https://www.twitch.tv/videos/123')).toEqual({
      provider: 'twitch',
      embedUrl: 'https://player.twitch.tv/?video=123',
    })
    expect(parseVideoUrl('https://www.twitch.tv/somechannel')).toEqual({
      provider: 'twitch',
      embedUrl: 'https://player.twitch.tv/?channel=somechannel',
    })
  })

  it('rejects look-alike hosts and unsafe schemes', () => {
    expect(parseVideoUrl('https://youtube.com.evil.test/watch?v=x')).toBeNull()
    expect(parseVideoUrl('https://evil.test/youtube.com/watch?v=x')).toBeNull()
    expect(parseVideoUrl('https://nottwitch.tv/videos/1')).toBeNull()
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull()
    expect(parseVideoUrl('ftp://youtu.be/abc123')).toBeNull()
    expect(parseVideoUrl('garbage')).toBeNull()
  })

  it('rejects ids that could break out of the embed URL', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=a/../b')).toBeNull()
    expect(parseVideoUrl('https://www.youtube.com/watch')).toBeNull()
  })
})

describe('sanitizeBlocks', () => {
  it('returns [] for non-array input', () => {
    expect(sanitizeBlocks('nimporte quoi')).toEqual([])
    expect(sanitizeBlocks(null)).toEqual([])
    expect(sanitizeBlocks({ type: 'paragraph' })).toEqual([])
  })

  it('drops unknown types and non-object entries, preserving order', () => {
    const out = sanitizeBlocks([
      { id: 'a', type: 'paragraph', text: 'one' },
      { type: 'inconnu' },
      'str',
      null,
      { id: 'b', type: 'heading', text: 'two', level: 3 },
      { id: 'c', type: 'gallery' },
    ])
    expect(out.map((b) => b.id)).toEqual(['a', 'b', 'c'])
    expect(out.map((b) => b.type)).toEqual(['paragraph', 'heading', 'gallery'])
  })

  it('generates an id when missing', () => {
    const [block] = sanitizeBlocks([{ type: 'paragraph', text: 'x' }])
    expect(typeof block.id).toBe('string')
    expect(block.id.length).toBeGreaterThan(0)
  })

  it('truncates text fields to their limits', () => {
    const out = sanitizeBlocks([
      { type: 'heading', text: 'h'.repeat(300), level: 2 },
      { type: 'paragraph', text: 'p'.repeat(6000) },
      { type: 'image', path: '/uploads/a.png', caption: 'c'.repeat(400) },
      { type: 'button', label: 'l'.repeat(100), url: 'https://example.com' },
    ])
    expect((out[0] as { text: string }).text).toHaveLength(200)
    expect((out[1] as { text: string }).text).toHaveLength(5000)
    expect((out[2] as { caption?: string }).caption).toHaveLength(300)
    expect((out[3] as { label: string }).label).toHaveLength(80)
  })

  it('keeps at most 100 blocks', () => {
    const input = Array.from({ length: 150 }, (_, i) => ({ id: `b${i}`, type: 'paragraph', text: 'x' }))
    const out = sanitizeBlocks(input)
    expect(out).toHaveLength(100)
    expect(out[99].id).toBe('b99')
  })

  it('normalizes heading level to 2 or 3', () => {
    const out = sanitizeBlocks([
      { type: 'heading', text: 'a', level: 3 },
      { type: 'heading', text: 'b', level: 9 },
    ])
    expect(out.map((b) => (b as { level: number }).level)).toEqual([3, 2])
  })

  it('drops a button with an unsafe url or no label', () => {
    expect(sanitizeBlocks([{ type: 'button', label: 'Go', url: 'javascript:alert(1)' }])).toEqual([])
    expect(sanitizeBlocks([{ type: 'button', label: '', url: 'https://example.com' }])).toEqual([])
    expect(sanitizeBlocks([{ type: 'button', label: 'Go', url: 'https://example.com' }])).toHaveLength(1)
  })

  it('keeps videos only when the url is embeddable', () => {
    expect(sanitizeBlocks([{ type: 'video', url: 'https://youtu.be/abc123' }])).toHaveLength(1)
    expect(sanitizeBlocks([{ type: 'video', url: 'https://youtube.com.evil.test/watch?v=x' }])).toEqual([])
    expect(sanitizeBlocks([{ type: 'video', url: 'javascript:alert(1)' }])).toEqual([])
  })

  it('accepts only site-relative upload paths for images', () => {
    const ok = sanitizeBlocks([{ type: 'image', path: '/uploads/a.png' }])
    expect(ok).toHaveLength(1)
    for (const path of ['https://evil.test/a.png', '//evil.test/a.png', '/uploads/../secret', 'uploads/a.png', '', 42]) {
      expect(sanitizeBlocks([{ type: 'image', path }])).toEqual([])
    }
  })

  it('lineup: keeps the entry but drops an unsafe url; drops nameless entries', () => {
    const out = sanitizeBlocks([
      {
        type: 'lineup',
        entries: [
          { name: 'Alice', url: 'https://example.com/alice' },
          { name: 'Bob', url: 'javascript:alert(1)' },
          { name: '   ' },
          'junk',
          { name: 'Carol' },
        ],
      },
    ])
    expect(out).toHaveLength(1)
    const block = out[0] as { entries: { name: string; url?: string }[] }
    expect(block.entries).toEqual([
      { name: 'Alice', url: 'https://example.com/alice' },
      { name: 'Bob' },
      { name: 'Carol' },
    ])
  })

  it('lineup with non-array entries yields an empty entries list', () => {
    const out = sanitizeBlocks([{ type: 'lineup', entries: 'x' }])
    expect((out[0] as { entries: unknown[] }).entries).toEqual([])
  })
})
