import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { buildCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const tags = await prisma.resourceTag.findMany({
    orderBy: { label: 'asc' },
    include: {
      resources: {
        where: { status: 'APPROVED' },
        select: { id: true },
      },
    },
  })

  const headers = buildCorsHeaders(request.headers.get('origin'))

  return NextResponse.json(
    {
      tags: tags.map((tag) => ({
        id: tag.id,
        label: tag.label,
        slug: tag.slug,
        approvedCount: tag.resources.length,
      })),
      meta: {
        count: tags.length,
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
