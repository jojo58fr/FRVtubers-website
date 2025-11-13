import { cache } from 'react'
import prisma from './prisma'

export type PlainMagazine = {
  id: string
  slug: string
  title: string
  issueNumber: string | null
  description: string | null
  releaseDate: string
  pdfPath: string
  coverImageUrl: string
  published: boolean
}

const toPlainMagazine = (magazine: {
  id: string
  slug: string
  title: string
  issueNumber: string | null
  description: string | null
  releaseDate: Date
  pdfPath: string
  coverImageUrl: string
  published: boolean
}): PlainMagazine => ({
  ...magazine,
  releaseDate: magazine.releaseDate.toISOString(),
})

export const fetchPublishedMagazines = cache(async (): Promise<PlainMagazine[]> => {
  const magazines = await prisma.magazine.findMany({
    where: { published: true },
    orderBy: { releaseDate: 'desc' },
  })

  return magazines.map(toPlainMagazine)
})

export async function fetchAllMagazines(options: { includeDrafts?: boolean } = {}): Promise<PlainMagazine[]> {
  const magazines = await prisma.magazine.findMany({
    where: options.includeDrafts ? {} : { published: true },
    orderBy: { releaseDate: 'desc' },
  })

  return magazines.map(toPlainMagazine)
}

export async function fetchMagazineBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {},
): Promise<PlainMagazine | null> {
  if (!slug) {
    return null
  }

  const magazine = await prisma.magazine.findUnique({
    where: { slug },
  })

  if (!magazine) {
    return null
  }

  if (!magazine.published && !options.includeDrafts) {
    return null
  }

  return toPlainMagazine(magazine)
}

export type UpsertMagazinePayload = {
  slug: string
  title: string
  issueNumber?: string | null
  releaseDate: Date
  description?: string | null
  pdfPath: string
  coverImageUrl: string
  published?: boolean
  createdById?: string | null
}

export async function createMagazine(payload: UpsertMagazinePayload): Promise<PlainMagazine> {
  const magazine = await prisma.magazine.create({
    data: {
      slug: payload.slug,
      title: payload.title,
      issueNumber: payload.issueNumber ?? null,
      releaseDate: payload.releaseDate,
      description: payload.description ?? null,
      pdfPath: payload.pdfPath,
      coverImageUrl: payload.coverImageUrl,
      published: payload.published ?? true,
      createdById: payload.createdById ?? null,
    },
  })

  return toPlainMagazine(magazine)
}

export async function updateMagazine(
  id: string,
  payload: Partial<UpsertMagazinePayload>,
): Promise<PlainMagazine | null> {
  const existing = await prisma.magazine.findUnique({ where: { id } })
  if (!existing) {
    return null
  }

  const magazine = await prisma.magazine.update({
    where: { id },
    data: {
      slug: payload.slug ?? existing.slug,
      title: payload.title ?? existing.title,
      issueNumber: payload.issueNumber ?? existing.issueNumber,
      releaseDate: payload.releaseDate ?? existing.releaseDate,
      description: payload.description ?? existing.description,
      pdfPath: payload.pdfPath ?? existing.pdfPath,
      coverImageUrl: payload.coverImageUrl ?? existing.coverImageUrl,
      published: typeof payload.published === 'boolean' ? payload.published : existing.published,
    },
  })

  return toPlainMagazine(magazine)
}

export async function deleteMagazine(id: string): Promise<PlainMagazine | null> {
  try {
    const deleted = await prisma.magazine.delete({
      where: { id },
    })
    return toPlainMagazine(deleted)
  } catch (error) {
    console.error('Failed to delete magazine', error)
    return null
  }
}
