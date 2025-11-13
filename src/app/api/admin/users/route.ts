import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { ADMIN_ROLE_METADATA, ADMIN_ROLE_VALUES } from '@/lib/admin-roles'
import { authOptions } from '../../auth/[...nextauth]/route'
import { isComiteSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!isComiteSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const limit = (() => {
    const parsed = Number.parseInt(searchParams.get('limit') ?? '', 10)
    if (Number.isNaN(parsed) || parsed <= 0) {
      return DEFAULT_LIMIT
    }
    return Math.min(parsed, MAX_LIMIT)
  })()

  const roleFilterParam = searchParams.get('role')
  const roleFilter =
    roleFilterParam && ADMIN_ROLE_VALUES.includes(roleFilterParam as (typeof ADMIN_ROLE_VALUES)[number])
      ? (roleFilterParam as (typeof ADMIN_ROLE_VALUES)[number])
      : null

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { adminRole: roleFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { discordId: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [
      { adminRole: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      createdAt: true,
      updatedAt: true,
      discordId: true,
      discordIsMember: true,
      discordPending: true,
    },
  })

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      roleLabel: ADMIN_ROLE_METADATA[user.adminRole].label,
    })),
    meta: {
      count: users.length,
      limit,
      query: query ?? null,
      role: roleFilter ?? null,
      generatedAt: new Date().toISOString(),
    },
  })
}

