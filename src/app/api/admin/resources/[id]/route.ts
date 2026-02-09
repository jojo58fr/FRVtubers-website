import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { isModeratorSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const parseBoolean = (value: unknown) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!isModeratorSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const status = payload.status
  const featured = parseBoolean(payload.featured)

  const statusValue =
    status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : null

  if (!statusValue && featured === null) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const existing = await prisma.resourceSubmission.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  if (featured !== null && existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Resource must be approved to be featured' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (statusValue) {
    data.status = statusValue
    if (statusValue === 'REJECTED') {
      data.featured = false
    }
  }
  if (featured !== null) {
    data.featured = featured
  }

  const updated = await prisma.resourceSubmission.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    resource: {
      id: updated.id,
      status: updated.status,
      featured: updated.featured,
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!isModeratorSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await prisma.resourceSubmission.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
