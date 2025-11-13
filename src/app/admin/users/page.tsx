import { ADMIN_ROLE_LIST, ADMIN_ROLE_METADATA } from '@/lib/admin-roles'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import type { AdminRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import AdminUserManager from '@/components/admin/AdminUserManager'
import styles from './page.module.scss'

type SelectedUser = {
  id: string
  name: string | null
  email: string | null
  adminRole: AdminRole
  discordId: string | null
  discordIsMember: boolean | null
  discordPending: boolean | null
  createdAt: Date
  updatedAt: Date
}

const serializeUser = (
  user: SelectedUser,
  roleLabelMap: Record<AdminRole, string>,
) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  adminRole: user.adminRole,
  roleLabel: roleLabelMap[user.adminRole],
  discordId: user.discordId,
  discordIsMember: user.discordIsMember,
  discordPending: user.discordPending,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
})

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/users`, requiredRole: 'comite' })

  const users = await prisma.user.findMany({
    orderBy: [
      { adminRole: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      discordId: true,
      discordIsMember: true,
      discordPending: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const roleLabelMap: Record<AdminRole, string> = {
    MEMBER: ADMIN_ROLE_METADATA.MEMBER.label,
    MODERATOR: ADMIN_ROLE_METADATA.MODERATOR.label,
    COMITE: ADMIN_ROLE_METADATA.COMITE.label,
  }

  const serialisedUsers = users.map((user) => serializeUser(user, roleLabelMap))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des comptes</h1>
          <p className={styles.subtitle}>
            Attribue les rôles administratifs, promeus les modérateurs et assure-toi que le comité de modération reste
            complet.
          </p>
        </div>
        <p className={styles.hint}>
          Les modifications sont synchronisées instantanément. Les autres applications peuvent consommer l’API{' '}
          <code>/api/admin/users</code> et <code>/api/admin/roles</code> pour refléter ces changements.
        </p>
      </header>

      <AdminUserManager initialUsers={serialisedUsers} roles={ADMIN_ROLE_LIST} />
    </div>
  )
}

