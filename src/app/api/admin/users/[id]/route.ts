import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { isComiteSession, isModeratorSession } from '@/lib/admin-auth'
import { ADMIN_ROLE_METADATA, isValidAdminRole } from '@/lib/admin-roles'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)

  if (!isComiteSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const adminRole = (payload as { adminRole?: unknown })?.adminRole
  if (!isValidAdminRole(adminRole)) {
    return NextResponse.json({ error: 'Invalid admin role value' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, adminRole: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (existing.adminRole === 'COMITE' && adminRole !== 'COMITE') {
    const remainingComiteCount = await prisma.user.count({
      where: { adminRole: 'COMITE', NOT: { id } },
    })

    if (remainingComiteCount === 0) {
      return NextResponse.json(
        { error: 'Impossible de retirer le dernier membre du comité de modération.' },
        { status: 409 },
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { adminRole },
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      discordId: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    user: {
      ...updated,
      roleLabel: ADMIN_ROLE_METADATA[updated.adminRole].label,
    },
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)

  if (!isComiteSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canSeeEmail = isModeratorSession(session)

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      discordId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      ...(canSeeEmail ? user : (({ email, ...rest }) => rest)(user)),
      ...(canSeeEmail ? {} : {}),
      roleLabel: ADMIN_ROLE_METADATA[user.adminRole].label,
    },
  })
}
