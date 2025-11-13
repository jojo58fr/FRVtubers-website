'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import styles from './AdminUserManager.module.scss'

type AdminRoleValue = 'MEMBER' | 'MODERATOR' | 'COMITE'

type AdminRoleOption = {
  value: AdminRoleValue
  label: string
  description: string
  capabilities: {
    manageUsers: boolean
    manageMagazines: boolean
    manageContent: boolean
  }
}

type ManagedUser = {
  id: string
  name: string | null
  email: string | null
  adminRole: AdminRoleValue
  roleLabel: string
  discordId: string | null
  discordIsMember: boolean | null
  discordPending: boolean | null
  createdAt: string
  updatedAt: string
}

type AdminUserManagerProps = {
  initialUsers: ManagedUser[]
  roles: AdminRoleOption[]
  pageSize?: number
}

const DEFAULT_LIMIT = 50
const FETCH_DEBOUNCE_MS = 350

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const resolveRoleDescription = (role: AdminRoleOption) => {
  const capabilities: string[] = []
  if (role.capabilities.manageUsers) {
    capabilities.push('Gestion des rôles')
  }
  if (role.capabilities.manageMagazines) {
    capabilities.push('Magazines')
  }
  if (role.capabilities.manageContent && !role.capabilities.manageMagazines) {
    capabilities.push('Contenus')
  } else if (role.capabilities.manageContent) {
    capabilities.push('Autres outils')
  }

  if (capabilities.length === 0) {
    return role.description
  }

  return `${role.description} (${capabilities.join(', ')})`
}

const roleBadgeClassMap: Record<AdminRoleValue, string> = {
  MEMBER: styles.roleBadgeMember,
  MODERATOR: styles.roleBadgeModerator,
  COMITE: styles.roleBadgeComite,
}

const uniqueUsersById = (users: ManagedUser[]) => {
  const map = new Map<string, ManagedUser>()
  for (const user of users) {
    map.set(user.id, user)
  }
  return Array.from(map.values())
}

const buildQueryString = (params: Record<string, string | null | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      search.set(key, value)
    }
  }
  return search.toString()
}

const AdminUserManager = ({ initialUsers, roles, pageSize = DEFAULT_LIMIT }: AdminUserManagerProps) => {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRoleValue>('ALL')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [isUpdating, startUpdateTransition] = useTransition()
  const abortControllerRef = useRef<AbortController | null>(null)
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  const selectedRole = useMemo(() => roles.find((role) => role.value === roleFilter), [roles, roleFilter])

  const triggerFetch = useCallback(
    (opts?: { immediate?: boolean }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      const runFetch = async () => {
        setIsFetching(true)
        setFetchError(null)

        try {
          const queryString = buildQueryString({
            limit: String(pageSize),
            q: query.trim() || null,
            role: roleFilter === 'ALL' ? null : roleFilter,
          })

          const response = await fetch(`/api/admin/users?${queryString}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          })

          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string }
            throw new Error(payload.error ?? 'Impossible de charger les utilisateurs.')
          }

          const payload = (await response.json()) as {
            users: ManagedUser[]
          }

          setUsers((previous) => {
            if (query || roleFilter !== 'ALL') {
              return payload.users
            }

            if (payload.users.length === 0) {
              return previous
            }

            return uniqueUsersById([...payload.users, ...previous])
          })
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            return
          }
          setFetchError((error as Error).message)
        } finally {
          setIsFetching(false)
        }
      }

      if (opts?.immediate) {
        void runFetch()
        return
      }

      const timeout = setTimeout(() => {
        void runFetch()
      }, FETCH_DEBOUNCE_MS)

      return () => {
        clearTimeout(timeout)
        controller.abort()
      }
    },
    [pageSize, query, roleFilter],
  )

  useEffect(() => {
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      return
    }

    const cleanup = triggerFetch()
    return () => {
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [query, roleFilter, triggerFetch])

  const handleRefreshClick = () => {
    triggerFetch({ immediate: true })
  }

  const handleRoleChange = (userId: string, newRole: AdminRoleValue) => {
    setUpdateError(null)
    setFeedback(null)

    setPendingUserId(userId)
    startUpdateTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ adminRole: newRole }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? 'La mise à jour du rôle a échoué.')
        }

        const payload = (await response.json()) as { user: ManagedUser }
        setUsers((current) =>
          current.map((user) => (user.id === userId ? { ...user, ...payload.user } : user)),
        )

        const targetUser =
          payload.user.name ?? payload.user.email ?? payload.user.discordId ?? 'Utilisateur mis à jour'
        setFeedback(`${targetUser} est désormais ${payload.user.roleLabel.toLowerCase()}.`)
      } catch (error) {
        setUpdateError((error as Error).message)
      } finally {
        setPendingUserId(null)
      }
    })
  }

  return (
    <section className={styles.manager}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <label htmlFor="admin-users-search">Rechercher</label>
          <input
            id="admin-users-search"
            type="search"
            placeholder="Pseudo, email ou identifiant Discord…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterBox}>
          <label htmlFor="admin-users-role">Filtrer par rôle</label>
          <select
            id="admin-users-role"
            className={styles.roleSelect}
            value={roleFilter}
            onChange={(event) => {
              const value = event.target.value as 'ALL' | AdminRoleValue
              setRoleFilter(value)
            }}
          >
            <option value="ALL">Tous les rôles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRefreshClick}
          disabled={isFetching}
        >
          Actualiser
        </button>
      </div>

      <div className={styles.statusBar}>
        {feedback ? <span className={styles.feedback}>{feedback}</span> : null}
        {updateError ? <span className={styles.error}>{updateError}</span> : null}
        {fetchError ? <span className={styles.error}>{fetchError}</span> : null}
        {isFetching ? <span className={styles.loading}>Chargement…</span> : null}
        {selectedRole ? (
          <span className={styles.roleHint}>{resolveRoleDescription(selectedRole)}</span>
        ) : null}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Discord</th>
              <th>Rôle</th>
              <th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Aucun utilisateur ne correspond à ta recherche.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isPendingUser = pendingUserId === user.id || isUpdating
                return (
                  <tr key={user.id} data-pending={isPendingUser ? 'true' : undefined}>
                    <td>
                      <div className={styles.identity}>
                        <span className={styles.name}>{user.name ?? 'Nom non renseigné'}</span>
                        <span className={styles.email}>{user.email ?? 'Email inconnu'}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.discord}>
                        <span className={styles.discordId}>
                          {user.discordId ?? 'Non synchronisé'}
                        </span>
                        {user.discordIsMember === false ? (
                          <span className={styles.discordStatusWarning}>Hors serveur</span>
                        ) : null}
                        {user.discordPending ? (
                          <span className={styles.discordStatusMuted}>En attente</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className={styles.roleCell}>
                        <span className={`${styles.roleBadge} ${roleBadgeClassMap[user.adminRole]}`}>
                          {user.roleLabel}
                        </span>
                        <select
                          className={styles.roleSwitcher}
                          value={user.adminRole}
                          onChange={(event) =>
                            handleRoleChange(user.id, event.target.value as AdminRoleValue)
                          }
                          disabled={isPendingUser}
                        >
                          {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className={styles.timestamps}>
                        <time dateTime={user.updatedAt}>{formatDate(user.updatedAt)}</time>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AdminUserManager

