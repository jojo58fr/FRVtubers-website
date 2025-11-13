import { NextResponse } from 'next/server'
import { ADMIN_ROLE_LIST } from '@/lib/admin-roles'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    roles: ADMIN_ROLE_LIST,
    generatedAt: new Date().toISOString(),
  })
}

