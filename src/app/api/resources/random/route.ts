import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { buildCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

const parseOptionalString = (value: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const parseTagList = (value: string | null) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

const shuffle = <T,>(items: T[]) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = (() => {
    const parsed = Number.parseInt(searchParams.get('limit') ?? '', 10)
    if (Number.isNaN(parsed) || parsed <= 0) return 6
    return Math.min(parsed, 50)
  })()
  const assetType = parseOptionalString(searchParams.get('type'))
  const tagMode = (searchParams.get('tagMode') ?? 'any').toLowerCase()
  const tags = parseTagList(searchParams.get('tags'))

  const tagFilters =
    tags.length === 0
      ? {}
      : tagMode === 'all'
        ? {
            AND: tags.map((tag) => ({
              tags: { some: { slug: tag } },
            })),
          }
        : {
            tags: { some: { slug: { in: tags } } },
          }

  const poolSize = Math.min(Math.max(limit * 5, 30), 200)

  const resources = await prisma.resourceSubmission.findMany({
    where: {
      status: 'APPROVED',
      ...(assetType ? { assetType } : {}),
      ...tagFilters,
    },
    orderBy: { createdAt: 'desc' },
    take: poolSize,
    include: {
      tags: {
        select: {
          id: true,
          label: true,
          slug: true,
        },
      },
      _count: {
        select: {
          clicks: true,
        },
      },
    },
  })

  const selection = shuffle(resources).slice(0, limit)

  const headers = buildCorsHeaders(request.headers.get('origin'))

  return NextResponse.json(
    {
      resources: selection.map((resource) => ({
        id: resource.id,
        assetTitle: resource.assetTitle,
        creatorName: resource.creatorName,
        assetType: resource.assetType,
        assetUrl: resource.assetUrl,
        description: resource.description,
        previewImageUrl: resource.previewImageUrl,
        price: resource.price,
        languages: Array.isArray(resource.languages) ? resource.languages : [],
        featured: resource.featured,
        tags: resource.tags,
        clickCount: resource._count.clicks,
        createdAt: resource.createdAt.toISOString(),
      })),
      meta: {
        count: selection.length,
        limit,
        assetType,
        tags,
        tagMode,
        poolSize,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers }
  )
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get('origin')),
  })
}
