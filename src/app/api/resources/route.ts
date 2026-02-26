import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { buildCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const parseOptionalString = (value: unknown) => (isNonEmptyString(value) ? value.trim() : null)

const parseTagList = (value: string | null) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

const parsePrice = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

const parseLanguages = (value: unknown) => {
  if (value === null || value === undefined) return []
  const allowed = new Set(['FR', 'EN', 'OTHER'])
  const items = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null
  if (!items) return null
  const normalized = items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0)
  if (normalized.some((item) => !allowed.has(item))) return null
  return Array.from(new Set(normalized))
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const headers = buildCorsHeaders(request.headers.get('origin'), ['GET', 'POST'])
  let payload: Record<string, unknown>

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400, headers })
  }

  const submitterName = parseOptionalString(payload.submitterName)
  const submitterEmail = parseOptionalString(payload.submitterEmail)
  const submitterDiscord = parseOptionalString(payload.submitterDiscord)
  const assetTitle = parseOptionalString(payload.assetTitle)
  const creatorName = parseOptionalString(payload.creatorName)
  const assetType = parseOptionalString(payload.assetType)
  const assetUrl = parseOptionalString(payload.assetUrl)
  const description = parseOptionalString(payload.description)
  const previewImageUrl = parseOptionalString(payload.previewImageUrl)
  const price = parsePrice(payload.price)
  const languages = parseLanguages(payload.languages)

  const requiredFields: Array<[string, string | null]> = [
    ['submitterName', submitterName],
    ['assetTitle', assetTitle],
    ['creatorName', creatorName],
    ['assetUrl', assetUrl],
  ]

  const missingField = requiredFields.find(([, value]) => !value)
  if (missingField) {
    return NextResponse.json({ error: `Champ requis: ${missingField[0]}` }, { status: 400, headers })
  }

  if (assetUrl && !isValidUrl(assetUrl)) {
    return NextResponse.json({ error: "URL de l'asset invalide." }, { status: 400, headers })
  }

  if (previewImageUrl && !isValidUrl(previewImageUrl)) {
    return NextResponse.json({ error: "URL de l'aperçu invalide." }, { status: 400, headers })
  }

  if (payload.price !== undefined && price === null) {
    return NextResponse.json({ error: 'Prix invalide.' }, { status: 400, headers })
  }

  if (languages === null) {
    return NextResponse.json({ error: 'Langues invalides.' }, { status: 400, headers })
  }

  const resource = await prisma.resourceSubmission.create({
    data: {
      submitterName: submitterName!,
      submitterEmail,
      submitterDiscord,
      assetTitle: assetTitle!,
      creatorName: creatorName!,
      assetType,
      assetUrl: assetUrl!,
      description,
      previewImageUrl,
      price,
      languages,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  })

  return NextResponse.json(
    {
      ok: true,
      resource: {
        id: resource.id,
        status: resource.status,
        createdAt: resource.createdAt.toISOString(),
      },
    },
    { status: 201, headers },
  )
}

export async function GET(request: Request) {
  const headers = buildCorsHeaders(request.headers.get('origin'), ['GET', 'POST'])
  const { searchParams } = new URL(request.url)
  const featuredOnly = ['1', 'true', 'yes'].includes((searchParams.get('featured') ?? '').toLowerCase())
  const assetType = parseOptionalString(searchParams.get('type'))
  const tagMode = (searchParams.get('tagMode') ?? 'any').toLowerCase()
  const tags = parseTagList(searchParams.get('tags'))
  const limit = (() => {
    const parsed = Number.parseInt(searchParams.get('limit') ?? '', 10)
    if (Number.isNaN(parsed) || parsed <= 0) return 100
    return Math.min(parsed, 200)
  })()

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

  const resources = await prisma.resourceSubmission.findMany({
    where: {
      status: 'APPROVED',
      ...(featuredOnly ? { featured: true } : {}),
      ...(assetType ? { assetType } : {}),
      ...tagFilters,
    },
    orderBy: [
      { featured: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
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

  return NextResponse.json(
    {
      resources: resources.map((resource) => ({
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
        count: resources.length,
        featuredOnly,
        assetType,
        tags,
        tagMode,
        limit,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers },
  )
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get('origin'), ['GET', 'POST']),
  })
}
