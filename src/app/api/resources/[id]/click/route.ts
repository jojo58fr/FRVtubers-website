import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { buildCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = buildCorsHeaders(request.headers.get('origin'), ['POST'])
  const { id } = await params

  const existing = await prisma.resourceSubmission.findUnique({ where: { id } })
  if (!existing || existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404, headers })
  }

  await prisma.resourceClick.create({
    data: {
      resourceId: id,
    },
  })

  const count = await prisma.resourceClick.count({ where: { resourceId: id } })

  return NextResponse.json({
    ok: true,
    resourceId: id,
    clickCount: count,
  }, { headers })
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get('origin'), ['POST']),
  })
}
