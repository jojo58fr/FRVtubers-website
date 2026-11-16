import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type EventErrorCode,
  type EventFiles,
  type EventInput,
} from '@/lib/admin-events'
import { sanitizeBlocks } from '@/lib/event-blocks'
import { IMAGE_MAX_BYTES } from '@/lib/uploads'
import prisma from '@/lib/prisma'
import EventForm, { type PlainAdminEvent } from './EventForm'
import styles from './page.module.scss'

const PAGE_PATH = `${ADMIN_PANEL_PATH}/evenements`

const STATUS_MESSAGES: Record<string, string> = {
  created: 'Évènement créé (brouillon tant que « Publié » n’est pas coché).',
  updated: 'Évènement mis à jour.',
  deleted: 'Évènement supprimé.',
}

const ERROR_MESSAGES: Record<EventErrorCode | 'missing-id', string> = {
  'missing-title': 'Le titre est obligatoire.',
  'invalid-type': 'Le type d’évènement est invalide.',
  'invalid-date': 'Les dates sont invalides.',
  'end-before-start': 'La date de fin ne peut pas précéder la date de début.',
  'invalid-image': `Image refusée : formats JPEG, PNG, WebP ou GIF, ${Math.round(IMAGE_MAX_BYTES / (1024 * 1024))} Mo maximum.`,
  'invalid-blocks': 'Le contenu de l’article est invalide.',
  'duplicate-slug': 'Un évènement avec ce titre (même adresse) existe déjà.',
  'not-found': 'Évènement introuvable.',
  failed: 'L’opération a échoué.',
  'missing-id': 'Identifiant introuvable.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const revalidateAll = () => {
  revalidatePath(PAGE_PATH)
  revalidatePath('/evenements')
  revalidatePath('/evenements/[slug]')
  revalidatePath('/galerie')
  revalidatePath('/galerie/[slug]')
}

const redirectWithStatus = (code: keyof typeof STATUS_MESSAGES): never => {
  revalidateAll()
  return redirect(`${PAGE_PATH}?status=${encodeURIComponent(code)}`)
}

const redirectWithError = (code: keyof typeof ERROR_MESSAGES): never => {
  revalidatePath(PAGE_PATH)
  return redirect(`${PAGE_PATH}?error=${encodeURIComponent(code)}`)
}

const BLOCK_IMAGE_PREFIX = 'blockImage:'

const readText = (formData: FormData, key: string) => formData.get(key)?.toString() ?? ''

const readInput = (formData: FormData): EventInput => {
  const blocks = formData.get('blocks')
  return {
    title: readText(formData, 'title'),
    type: readText(formData, 'type'),
    startsAt: readText(formData, 'startsAt'),
    endsAt: readText(formData, 'endsAt'),
    summary: readText(formData, 'summary'),
    hasArticle: formData.get('hasArticle') !== null,
    published: formData.get('published') !== null,
    blocksJson: typeof blocks === 'string' ? blocks : null,
  }
}

const readFiles = (formData: FormData): EventFiles => {
  const cover = formData.get('coverImage')
  const blockImages: Record<string, File> = {}
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(BLOCK_IMAGE_PREFIX) && value instanceof File && value.size > 0) {
      blockImages[key.slice(BLOCK_IMAGE_PREFIX.length)] = value
    }
  }
  return { cover: cover instanceof File && cover.size > 0 ? cover : null, blockImages }
}

const createEventAction = async (formData: FormData) => {
  'use server'

  const session = await requireAdminSession({ redirectTo: PAGE_PATH })
  const result = await createEvent(readInput(formData), readFiles(formData), session.user?.id ?? null)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('created')
}

const updateEventAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const id = formData.get('id')?.toString()
  if (!id) return redirectWithError('missing-id')
  const result = await updateEvent(id, readInput(formData), readFiles(formData))
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('updated')
}

const deleteEventAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: PAGE_PATH })
  const id = formData.get('id')?.toString()
  if (!id) return redirectWithError('missing-id')
  const result = await deleteEvent(id)
  if (!result.ok) return redirectWithError(result.error)
  return redirectWithStatus('deleted')
}

type SearchParams = Record<string, string | string[] | undefined>

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

const TYPE_LABELS: Record<string, string> = { GENESIS: 'Genesis', FRVMON: 'FRVmon', OTHER: 'Autre' }

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso))

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminSession({ redirectTo: PAGE_PATH })

  const params = await searchParams
  const statusCode = firstParamValue(params?.status)
  const errorCode = firstParamValue(params?.error)
  const statusMessage = statusCode ? STATUS_MESSAGES[statusCode] ?? null : null
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] ?? null : null

  const rows = await prisma.event.findMany({ orderBy: { startsAt: 'desc' } })
  const events: PlainAdminEvent[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    startsAt: row.startsAt.toISOString().slice(0, 10),
    endsAt: row.endsAt ? row.endsAt.toISOString().slice(0, 10) : '',
    summary: row.summary ?? '',
    coverImagePath: row.coverImagePath,
    hasArticle: row.hasArticle,
    published: row.published,
    blocks: sanitizeBlocks(row.blocks),
  }))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Évènements</h1>
          <p className={styles.subtitle}>
            Crée les évènements (Genesis, FRVmon…), rédige leur article avec des blocs et publie-les. Un évènement
            reste en brouillon tant que « Publié » n’est pas coché.
          </p>
        </div>
        <div className={styles.feedback}>
          {statusMessage ? <span className={styles.success}>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>
      </header>

      <section className={styles.panel} aria-labelledby="create-heading">
        <h2 id="create-heading" className={styles.panelTitle}>
          Nouvel évènement
        </h2>
        <EventForm action={createEventAction} idPrefix="create" />
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading" className={styles.panelTitle}>
          Évènements existants
        </h2>
        {events.length === 0 ? (
          <p className={styles.emptyState}>Aucun évènement pour le moment.</p>
        ) : (
          <ul className={styles.list}>
            {events.map((event) => (
              <li key={event.id}>
                <details className={styles.item}>
                  <summary>
                    <span className={styles.itemTitle}>{event.title}</span>
                    <span className={styles.itemMeta}>
                      {TYPE_LABELS[event.type] ?? event.type} · {formatDate(event.startsAt)}
                    </span>
                    <span className={event.published ? styles.badgePublished : styles.badgeDraft}>
                      {event.published ? 'Publié' : 'Brouillon'}
                    </span>
                  </summary>
                  <div className={styles.itemBody}>
                    <EventForm action={updateEventAction} idPrefix={`edit-${event.id}`} event={event} />
                    <form action={deleteEventAction} className={styles.deleteForm}>
                      <input type="hidden" name="id" value={event.id} />
                      <label htmlFor={`delete-${event.id}`}>
                        <input id={`delete-${event.id}`} type="checkbox" required />
                        Je confirme la suppression (article, photos de la galerie et fichiers inclus)
                      </label>
                      <button type="submit" className={`${styles.primaryButton} ${styles.danger}`}>
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
