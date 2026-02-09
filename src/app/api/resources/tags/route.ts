import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tags = await prisma.resourceTag.findMany({
    orderBy: { label: 'asc' },
    include: {
      resources: {
        where: { status: 'APPROVED' },
        select: { id: true },
      },
    },
  })

  return NextResponse.json({
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
  })
}
