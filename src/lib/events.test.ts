import { afterEach, describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import {
  getAlbum,
  getPublishedEvent,
  listAlbums,
  listPublishedEvents,
} from '@/lib/events'

type EventData = Partial<Parameters<typeof prisma.event.create>[0]['data']>

const mkEvent = async (slug: string, data: EventData = {}, photos = 0) =>
  prisma.event.create({
    data: {
      slug,
      title: slug,
      type: 'OTHER',
      startsAt: new Date('2026-01-01T00:00:00Z'),
      published: true,
      ...data,
      photos: {
        create: Array.from({ length: photos }, (_, i) => ({
          path: `/uploads/${slug}-${i}.jpg`,
          sortOrder: photos - i,
        })),
      },
    },
  })

afterEach(async () => {
  await prisma.event.deleteMany()
})

describe('listPublishedEvents', () => {
  it('excludes drafts, filters by type, sorts by date descending', async () => {
    await mkEvent('old', { type: 'GENESIS', startsAt: new Date('2025-01-01') })
    await mkEvent('new', { type: 'GENESIS', startsAt: new Date('2026-06-01') })
    await mkEvent('draft', { published: false })
    await mkEvent('other')
    expect((await listPublishedEvents()).map((e) => e.slug)).toEqual([
      'new',
      'other',
      'old',
    ])
    expect((await listPublishedEvents('GENESIS')).map((e) => e.slug)).toEqual([
      'new',
      'old',
    ])
  })
})

describe('getPublishedEvent', () => {
  it('returns null for drafts', async () => {
    await mkEvent('d', { published: false }, 1)
    expect(await getPublishedEvent('d')).toBeNull()
  })

  it('returns null when hasArticle is false', async () => {
    await mkEvent('na', { hasArticle: false }, 2)
    expect(await getPublishedEvent('na')).toBeNull()
  })

  it('returns sorted photos and sanitized blocks', async () => {
    await mkEvent(
      'ok',
      {
        blocks: [
          { type: 'text', text: 'hello' },
          { type: 'bogus', foo: 1 },
        ],
      },
      3,
    )
    const e = await getPublishedEvent('ok')
    expect(e).not.toBeNull()
    expect(e!.photos.map((p) => p.path)).toEqual([
      '/uploads/ok-2.jpg',
      '/uploads/ok-1.jpg',
      '/uploads/ok-0.jpg',
    ])
    expect(Object.keys(e!.photos[0]).sort()).toEqual(
      ['caption', 'height', 'id', 'path', 'photographer', 'width'].sort(),
    )
    expect(e!.blocks.some((b) => (b as { type: string }).type === 'bogus')).toBe(
      false,
    )
  })

  it('returns null for unknown slug', async () => {
    expect(await getPublishedEvent('nope')).toBeNull()
  })
})

describe('listAlbums', () => {
  it('excludes draft events even with photos', async () => {
    await mkEvent('draft', { published: false }, 2)
    expect(await listAlbums()).toEqual([])
    expect(await getAlbum('draft')).toBeNull()
  })

  it('excludes published events without photos', async () => {
    await mkEvent('empty')
    expect(await listAlbums()).toEqual([])
  })

  it('includes hasArticle=false events with photos', async () => {
    await mkEvent('noart', { hasArticle: false }, 2)
    const albums = await listAlbums()
    expect(albums.map((a) => a.slug)).toEqual(['noart'])
    expect(albums[0].photoCount).toBe(2)
    expect(await getPublishedEvent('noart')).toBeNull()
    const album = await getAlbum('noart')
    expect(album?.hasArticle).toBe(false)
    expect(album?.photos).toHaveLength(2)
  })

  it('uses coverImagePath, else first photo; sorted by date desc', async () => {
    await mkEvent(
      'a',
      { startsAt: new Date('2025-01-01'), coverImagePath: '/uploads/cover.jpg' },
      1,
    )
    await mkEvent('b', { startsAt: new Date('2026-01-01') }, 2)
    const albums = await listAlbums()
    expect(albums.map((a) => a.slug)).toEqual(['b', 'a'])
    expect(albums[0].coverPath).toBe('/uploads/b-1.jpg')
    expect(albums[1].coverPath).toBe('/uploads/cover.jpg')
  })
})

describe('getAlbum', () => {
  it('returns photos sorted by sortOrder', async () => {
    await mkEvent('s', {}, 3)
    const album = await getAlbum('s')
    expect(album!.photos.map((p) => p.path)).toEqual([
      '/uploads/s-2.jpg',
      '/uploads/s-1.jpg',
      '/uploads/s-0.jpg',
    ])
    expect(album!.hasArticle).toBe(true)
  })
})
