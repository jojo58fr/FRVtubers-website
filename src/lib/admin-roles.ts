import type { AdminRole } from '@prisma/client'

export type AdminRoleMetadata = {
  value: AdminRole
  label: string
  description: string
  capabilities: {
    manageUsers: boolean
    manageMagazines: boolean
    manageContent: boolean
  }
}

export const ADMIN_ROLE_METADATA: Record<AdminRole, AdminRoleMetadata> = {
  MEMBER: {
    value: 'MEMBER',
    label: 'Membre',
    description: 'Accès standard sans outils d’administration.',
    capabilities: {
      manageUsers: false,
      manageMagazines: false,
      manageContent: false,
    },
  },
  MODERATOR: {
    value: 'MODERATOR',
    label: 'Modérateur',
    description:
      'Peut gérer le contenu éditorial (magazines, ressources) mais ne peut pas modifier les droits des autres membres.',
    capabilities: {
      manageUsers: false,
      manageMagazines: true,
      manageContent: true,
    },
  },
  COMITE: {
    value: 'COMITE',
    label: 'Comité de modération',
    description:
      'Accès complet : gestion des comptes, des rôles d’administration et de l’ensemble des outils internes.',
    capabilities: {
      manageUsers: true,
      manageMagazines: true,
      manageContent: true,
    },
  },
}

export const ADMIN_ROLE_LIST: AdminRoleMetadata[] = Object.values(ADMIN_ROLE_METADATA)

export const ADMIN_ROLE_VALUES: AdminRole[] = ADMIN_ROLE_LIST.map((role) => role.value)

export const isValidAdminRole = (value: unknown): value is AdminRole =>
  typeof value === 'string' && ADMIN_ROLE_VALUES.includes(value as AdminRole)

export const getAdminRoleLabel = (role: AdminRole) => ADMIN_ROLE_METADATA[role].label

