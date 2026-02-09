import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'
import { isModeratorSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 100

const parseBoolean = (value: string | null) => {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!isModeratorSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const status = searchParams.get('status')
  const featured = parseBoolean(searchParams.get('featured'))
  const limit = (() => {
    const parsed = Number.parseInt(searchParams.get('limit') ?? '', 10)
    if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT
    return Math.min(parsed, MAX_LIMIT)
  })()

  const statusFilter =
    status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : null

  const resources = await prisma.resourceSubmission.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(featured !== null ? { featured } : {}),
      ...(query
        ? {
            OR: [
              { assetTitle: { contains: query } },
              { creatorName: { contains: query } },
              { submitterName: { contains: query } },
              { submitterEmail: { contains: query } },
              { submitterDiscord: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [
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

  return NextResponse.json({
    resources: resources.map((resource) => ({
      id: resource.id,
      submitterName: resource.submitterName,
      submitterEmail: resource.submitterEmail,
      submitterDiscord: resource.submitterDiscord,
      assetTitle: resource.assetTitle,
      creatorName: resource.creatorName,
      assetType: resource.assetType,
      assetUrl: resource.assetUrl,
      description: resource.description,
      previewImageUrl: resource.previewImageUrl,
      price: resource.price,
      languages: Array.isArray(resource.languages) ? resource.languages : [],
      status: resource.status,
      featured: resource.featured,
      tags: resource.tags,
      clickCount: resource._count.clicks,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    })),
    meta: {
      count: resources.length,
      limit,
      query: query || null,
      status: statusFilter,
      featured,
      generatedAt: new Date().toISOString(),
    },
  })
}
