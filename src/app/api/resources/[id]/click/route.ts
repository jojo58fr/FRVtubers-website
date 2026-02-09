import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const existing = await prisma.resourceSubmission.findUnique({ where: { id } })
  if (!existing || existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
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
  })
}
