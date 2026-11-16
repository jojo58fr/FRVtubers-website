import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import {
  BIO_MAX_LENGTH,
  CONTRIBUTION_TEXT_MAX_LENGTH,
  LINK_LABEL_MAX_LENGTH,
  LINK_URL_MAX_LENGTH,
  MAX_CONTRIBUTIONS_PER_MEMBER,
  MAX_LINKS_PER_MEMBER,
  NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  YEAR_MAX,
  YEAR_MIN,
  addContribution,
  createMember,
  deleteContribution,
  deleteMember,
  moveContribution,
  moveMember,
  updateContribution,
  updateMember,
  type ContributionInput,
  type MemberInput,
  type StaffErrorCode,
} from '@/lib/admin-staff'
import prisma from '@/lib/prisma'
import { IMAGE_MAX_BYTES } from '@/lib/uploads'
import MemberForm, { type PlainAdminMember } from './MemberForm'
import styles from './page.module.scss'

const PAGE_PATH = `${ADMIN_PANEL_PATH}/staff`

const STATUS_MESSAGES: Record<string, string> = {
  created: 'Membre créé (brouillon tant que « Publié » n’est pas coché).',
  updated: 'Membre mis à jour.',
  deleted: 'Membre supprimé.',
  moved: 'Ordre mis à jour.',
  'contribution-added': 'Contribution ajoutée.',
  'contribution-updated': 'Contribution mise à jour.',
  'contribution-deleted': 'Contribution supprimée.',
}

const ERROR_MESSAGES: Record<StaffErrorCode | 'missing-id', string> = {
  'missing-name': 'Le nom est obligatoire.',
  'invalid-link': `Lien refusé : libellé (${LINK_LABEL_MAX_LENGTH} caractères max) et adresse http(s) (${LINK_URL_MAX_LENGTH} max) obligatoires pour chaque ligne. Rien n’a été enregistré.`,
  'too-many-links': `Trop de liens (${MAX_LINKS_PER_MEMBER} maximum).`,
  'invalid-image': `Image refusée : formats JPEG, PNG, WebP ou GIF, ${Math.round(IMAGE_MAX_BYTES / (1024 * 1024))} Mo maximum.`,
  'duplicate-slug': 'Un membre avec ce nom (même identifiant) existe déjà.',
  'missing-text': 'Le texte de la contribution est obligatoire.',
  'invalid-year': `L’année doit être un entier entre ${YEAR_MIN} et ${YEAR_MAX}.`,
  'event-not-found': 'L’évènement lié est introuvable.',
  'too-many-contributions': `Trop de contributions (${MAX_CONTRIBUTIONS_PER_MEMBER} maximum par membre).`,
  'not-found': 'Membre ou contribution introuvable.',
  failed: 'L’opération a échoué.',
  'missing-id': 'Identifiant introuvable.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const revalidateAll = () => {
  revalidatePath(PAGE_PATH)
  revalidatePath('/staff')
}

const redirectWithStatus = (code: keyof typeof STATUS_MESSAGES): never => {
  revalidateAll()
  return redirect(`${PAGE_PATH}?status=${encodeURIComponent(code)}`)
}

const redirectWithError = (code: keyof typeof ERROR_MESSAGES): never => {
  revalidatePath(PAGE_PATH)
  return redirect(`${PAGE_PATH}?error=${encodeURIComponent(code)}`)
}

const readText = (formData: FormData, key: string) => formData.get(key)?.toString() ?? ''

const readMemberInput = (formData: FormData): MemberInput => {
  const labels = formData.getAll('linkLabel').map(String)
  const urls = formData.getAll('linkUrl').map(String)
  // Borné : le noyau refuse de toute façon au-delà de MAX_LINKS_PER_MEMBER lignes remplies.
  const count = Math.min(Math.max(labels.length, urls.length), MAX_LINKS_PER_MEMBER * 3)
  return {
    name: readText(formData, 'name'),
    title: readText(formData, 'title'),
    bio: readText(formData, 'bio'),
    links: Array.from({ length: count }, (_, i) => ({ label: labels[i] ?? '', url: urls[i] ?? '' })),
    isActive: formData.get('isActive') !== null,
    published: formData.get('published') !== null,
  }
}

const readPhoto = (formData: FormData): File | null => {
  const photo = formData.get('photo')
  return photo instanceof File && photo.size > 0 ? photo : null
}

const readContributionInput = (formData: FormData): ContributionInput => ({
  text: readText(formData, 'text'),
  year: readText(formData, 'year'),
  eventId: readText(formData, 'eventId'),
})

const readDirection = (formData: FormData) => {
  const direction = readText(formData, 'direction')
  return direction === 'up' || direction === 'down' ? direction : null
}

const createMemberAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const result = await createMember(readMemberInput(formData), readPhoto(formData))
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('created')
}

const updateMemberAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const id = readText(formData, 'id')
  if (!id) return redirectWithError('missing-id')
  const result = await updateMember(id, readMemberInput(formData), readPhoto(formData))
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('updated')
}

const deleteMemberAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const id = readText(formData, 'id')
  if (!id) return redirectWithError('missing-id')
  const result = await deleteMember(id)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('deleted')
}

const moveMemberAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const id = readText(formData, 'id')
  const direction = readDirection(formData)
  if (!id || !direction) return redirectWithError('missing-id')
  const result = await moveMember(id, direction)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('moved')
}

const addContributionAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const memberId = readText(formData, 'memberId')
  if (!memberId) return redirectWithError('missing-id')
  const result = await addContribution(memberId, readContributionInput(formData))
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('contribution-added')
}

const updateContributionAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const memberId = readText(formData, 'memberId')
  const contributionId = readText(formData, 'contributionId')
  if (!memberId || !contributionId) return redirectWithError('missing-id')
  const result = await updateContribution(memberId, contributionId, readContributionInput(formData))
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('contribution-updated')
}

const deleteContributionAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const memberId = readText(formData, 'memberId')
  const contributionId = readText(formData, 'contributionId')
  if (!memberId || !contributionId) return redirectWithError('missing-id')
  const result = await deleteContribution(memberId, contributionId)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('contribution-deleted')
}

const moveContributionAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const memberId = readText(formData, 'memberId')
  const contributionId = readText(formData, 'contributionId')
  const direction = readDirection(formData)
  if (!memberId || !contributionId || !direction) return redirectWithError('missing-id')
  const result = await moveContribution(memberId, contributionId, direction)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('moved')
}

type SearchParams = Record<string, string | string[] | undefined>

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

// Object.hasOwn : une clé de prototype (« constructor »…) ne doit pas passer pour un code.
const lookup = (messages: Record<string, string>, code: string | null): string | null =>
  code && Object.hasOwn(messages, code) ? messages[code] : null

const limits = {
  name: NAME_MAX_LENGTH,
  title: TITLE_MAX_LENGTH,
  bio: BIO_MAX_LENGTH,
  linkLabel: LINK_LABEL_MAX_LENGTH,
  linkUrl: LINK_URL_MAX_LENGTH,
}

const toLinks = (raw: unknown): PlainAdminMember['links'] => {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { label, url } = item as Record<string, unknown>
    return typeof label === 'string' && typeof url === 'string' ? [{ label, url }] : []
  })
}

type EventOption = { id: string; title: string; published: boolean }

const EventSelect = ({ events, defaultValue }: { events: EventOption[]; defaultValue: string }) => (
  <select name="eventId" defaultValue={defaultValue}>
    <option value="">Aucun</option>
    {events.map((event) => (
      <option key={event.id} value={event.id}>
        {event.title}
        {event.published ? '' : ' (brouillon)'}
      </option>
    ))}
  </select>
)

const MoveButtons = ({
  action,
  hidden,
  label,
  isFirst,
  isLast,
}: {
  action: (formData: FormData) => Promise<void>
  hidden: Record<string, string>
  label: string
  isFirst: boolean
  isLast: boolean
}) => (
  <div className={styles.moveRow}>
    {(['up', 'down'] as const).map((direction) => (
      <form key={direction} action={action}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="direction" value={direction} />
        <button
          type="submit"
          className={styles.iconButton}
          aria-label={`${direction === 'up' ? 'Monter' : 'Descendre'} ${label}`}
          disabled={direction === 'up' ? isFirst : isLast}
        >
          {direction === 'up' ? '↑' : '↓'}
        </button>
      </form>
    ))}
  </div>
)

export default async function AdminStaffPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminSession({ redirectTo: PAGE_PATH })

  const params = await searchParams
  const statusMessage = lookup(STATUS_MESSAGES, firstParamValue(params?.status))
  const errorMessage = lookup(ERROR_MESSAGES, firstParamValue(params?.error))

  const [rows, events] = await Promise.all([
    prisma.staffMember.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      include: { contributions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    }),
    prisma.event.findMany({
      orderBy: { startsAt: 'desc' },
      select: { id: true, title: true, published: true },
    }),
  ])

  const members = rows.map((row) => ({
    member: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      title: row.title,
      bio: row.bio ?? '',
      photoPath: row.photoPath,
      links: toLinks(row.links),
      isActive: row.isActive,
      published: row.published,
    } satisfies PlainAdminMember,
    contributions: row.contributions,
  }))

  // Les formulaires membre sont des composants client dont l'état (lignes de liens, champ
  // fichier) n'est lu qu'une fois : après une sauvegarde, la redirection est une navigation
  // douce qui garderait cet état périmé. StaffMember n'a pas de `updatedAt` : la clé de chaque
  // formulaire d'édition est dérivée de toutes ses données affichées (id + contenu), donc elle
  // change à chaque sauvegarde qui modifie quelque chose. Le formulaire de création est remonté
  // quand un membre est ajouté ou supprimé (nombre + plus grand id, les cuid croissent avec le temps).
  const newestId = rows.reduce((max, row) => (row.id > max ? row.id : max), '')
  const createKey = `create-${rows.length}-${newestId}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff</h1>
          <p className={styles.subtitle}>
            Gère les membres du staff et leurs contributions. Un membre reste en brouillon tant que « Publié » n’est
            pas coché.
          </p>
        </div>
        <div className={styles.feedback}>
          {statusMessage ? <span className={styles.success}>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>
      </header>

      <section className={styles.panel} aria-labelledby="create-heading">
        <h2 id="create-heading" className={styles.panelTitle}>
          Nouveau membre
        </h2>
        <MemberForm
          key={createKey}
          action={createMemberAction}
          idPrefix="create"
          maxLinks={MAX_LINKS_PER_MEMBER}
          limits={limits}
        />
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading" className={styles.panelTitle}>
          Membres ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className={styles.emptyState}>Aucun membre pour le moment.</p>
        ) : (
          <ul className={styles.list}>
            {members.map(({ member, contributions }, index) => (
              <li key={member.id}>
                <details className={styles.item}>
                  <summary>
                    <span className={styles.itemTitle}>{member.name}</span>
                    <span className={styles.itemMeta}>
                      {member.title || 'Sans rôle'} · {member.isActive ? 'Actuel' : 'Ancien'}
                    </span>
                    <span className={member.published ? styles.badgePublished : styles.badgeDraft}>
                      {member.published ? 'Publié' : 'Brouillon'}
                    </span>
                  </summary>
                  <div className={styles.itemBody}>
                    <MoveButtons
                      action={moveMemberAction}
                      hidden={{ id: member.id }}
                      label={member.name}
                      isFirst={index === 0}
                      isLast={index === members.length - 1}
                    />

                    <MemberForm
                      key={`${member.id}-${JSON.stringify([
                        member.name,
                        member.title,
                        member.bio,
                        member.photoPath,
                        member.links,
                        member.isActive,
                        member.published,
                      ])}`}
                      action={updateMemberAction}
                      idPrefix={`edit-${member.id}`}
                      member={member}
                      maxLinks={MAX_LINKS_PER_MEMBER}
                      limits={limits}
                    />

                    <div className={styles.contributions}>
                      <h3>
                        Contributions ({contributions.length}/{MAX_CONTRIBUTIONS_PER_MEMBER})
                      </h3>
                      {contributions.map((c, cIndex) => (
                        // Clé dérivée du contenu : remontage après sauvegarde (champs non contrôlés).
                        <div key={`${c.id}-${c.text}-${c.year}-${c.eventId}`} className={styles.contribution}>
                          <form action={updateContributionAction} className={styles.contributionForm}>
                            <input type="hidden" name="memberId" value={member.id} />
                            <input type="hidden" name="contributionId" value={c.id} />
                            <label>
                              Texte
                              <input name="text" required maxLength={CONTRIBUTION_TEXT_MAX_LENGTH} defaultValue={c.text} />
                            </label>
                            <label>
                              Année
                              <input name="year" type="number" min={YEAR_MIN} max={YEAR_MAX} defaultValue={c.year ?? ''} />
                            </label>
                            <label>
                              Évènement lié
                              <EventSelect events={events} defaultValue={c.eventId ?? ''} />
                            </label>
                            <button
                              type="submit"
                              className={styles.primaryButton}
                              aria-label={`Enregistrer la contribution « ${c.text} » de ${member.name}`}
                            >
                              Enregistrer
                            </button>
                          </form>
                          <div className={styles.contributionActions}>
                            <MoveButtons
                              action={moveContributionAction}
                              hidden={{ memberId: member.id, contributionId: c.id }}
                              label={`la contribution « ${c.text} » de ${member.name}`}
                              isFirst={cIndex === 0}
                              isLast={cIndex === contributions.length - 1}
                            />
                            <form action={deleteContributionAction} className={styles.deleteForm}>
                              <input type="hidden" name="memberId" value={member.id} />
                              <input type="hidden" name="contributionId" value={c.id} />
                              <label htmlFor={`delete-c-${c.id}`}>
                                <input id={`delete-c-${c.id}`} type="checkbox" required />
                                Je confirme la suppression
                              </label>
                              <button
                                type="submit"
                                className={`${styles.primaryButton} ${styles.danger}`}
                                aria-label={`Supprimer la contribution « ${c.text} » de ${member.name}`}
                              >
                                Supprimer
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}

                      {/* Remontage après chaque ajout/suppression pour vider les champs non contrôlés. */}
                      <form
                        key={`add-${member.id}-${contributions.length}`}
                        action={addContributionAction}
                        className={styles.contributionForm}
                      >
                        <input type="hidden" name="memberId" value={member.id} />
                        <label>
                          Nouvelle contribution
                          <input name="text" required maxLength={CONTRIBUTION_TEXT_MAX_LENGTH} />
                        </label>
                        <label>
                          Année
                          <input name="year" type="number" min={YEAR_MIN} max={YEAR_MAX} />
                        </label>
                        <label>
                          Évènement lié
                          <EventSelect events={events} defaultValue="" />
                        </label>
                        <button
                          type="submit"
                          className={styles.primaryButton}
                          aria-label={`Ajouter la contribution à ${member.name}`}
                        >
                          Ajouter
                        </button>
                      </form>
                    </div>

                    <form action={deleteMemberAction} className={styles.deleteForm}>
                      <input type="hidden" name="id" value={member.id} />
                      <label htmlFor={`delete-${member.id}`}>
                        <input id={`delete-${member.id}`} type="checkbox" required />
                        Je confirme la suppression de {member.name} (contributions et photo incluses)
                      </label>
                      <button
                        type="submit"
                        className={`${styles.primaryButton} ${styles.danger}`}
                        aria-label={`Supprimer le membre ${member.name}`}
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
