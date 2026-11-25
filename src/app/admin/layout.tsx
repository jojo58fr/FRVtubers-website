import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { isAdminSession, isComiteSession } from '@/lib/admin-auth'
import AdminNav from './AdminNav'

export const dynamic = 'force-dynamic'

// The navigation is purely presentational: access control stays in each page
// (requireAdminSession), this layout only decides which links to show.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <>
      {isAdminSession(session) ? <AdminNav showUsers={isComiteSession(session)} /> : null}
      {children}
    </>
  )
}
