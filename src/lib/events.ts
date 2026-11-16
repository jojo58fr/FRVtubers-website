import prisma from '@/lib/prisma'
import { sanitizeBlocks } from '@/lib/event-blocks'

export type EventType = 'GENESIS' | 'FRVMON' | 'OTHER'

export type PhotoSummary = {
  id: string
  path: string
  caption: string | null
  photographer: string | null
  width: number | null
  height: number | null
}

const photoSelect = {
  id: true,
  path: true,
  caption: true,
  photographer: true,
  width: true,
  height: true,
} as const

const photoOrder = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const

export async function listPublishedEvents(type?: EventType) {
  return prisma.event.findMany({
    where: { published: true, ...(type ? { type } : {}) },
    orderBy: { startsAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      startsAt: true,
      endsAt: true,
      summary: true,
      coverImagePath: true,
      hasArticle: true,
    },
  })
}

export async function getPublishedEvent(slug: string) {
  const event = await prisma.event.findFirst({
    where: { slug, published: true, hasArticle: true },
    include: {
      photos: { select: photoSelect, orderBy: [...photoOrder] },
    },
  })
  if (!event) return null
  return { ...event, blocks: sanitizeBlocks(event.blocks) }
}

export async function listAlbums() {
  const events = await prisma.event.findMany({
    where: { published: true, photos: { some: {} } },
    orderBy: { startsAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      startsAt: true,
      coverImagePath: true,
      hasArticle: true,
      _count: { select: { photos: true } },
      photos: { select: { path: true }, orderBy: [...photoOrder], take: 1 },
    },
  })
  return events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    type: e.type,
    startsAt: e.startsAt,
    hasArticle: e.hasArticle,
    coverPath: e.coverImagePath ?? e.photos[0]?.path ?? null,
    photoCount: e._count.photos,
  }))
}

export async function getAlbum(slug: string) {
  const event = await prisma.event.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      startsAt: true,
      hasArticle: true,
      photos: { select: photoSelect, orderBy: [...photoOrder] },
    },
  })
  return event
}
