import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import {
  CAPTION_MAX_LENGTH,
  MAX_FILES_PER_UPLOAD,
  PHOTOGRAPHER_MAX_LENGTH,
  addPhotos,
  deletePhoto,
  movePhoto,
  updatePhoto,
  type PhotoErrorCode,
  type RefusalReason,
  type RefusedFile,
} from '@/lib/admin-photos'
import prisma from '@/lib/prisma'
import { IMAGE_MAX_BYTES } from '@/lib/uploads'
import styles from './page.module.scss'

const EVENTS_PATH = `${ADMIN_PANEL_PATH}/evenements`
const photosPath = (eventId: string) => `${EVENTS_PATH}/${encodeURIComponent(eventId)}/photos`

const MAX_MB = Math.round(IMAGE_MAX_BYTES / (1024 * 1024))

const STATUS_MESSAGES: Record<string, string> = {
  updated: 'Photo mise à jour.',
  moved: 'Ordre mis à jour.',
  deleted: 'Photo supprimée.',
}

const ERROR_MESSAGES: Record<PhotoErrorCode | 'missing-id', string> = {
  'not-found': 'Photo ou évènement introuvable.',
  'no-files': 'Aucun fichier sélectionné.',
  failed: 'L’opération a échoué.',
  'missing-id': 'Identifiant introuvable.',
}

const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  type: 'format non autorisé (JPEG, PNG, WebP ou GIF uniquement)',
  size: `fichier trop lourd (${MAX_MB} Mo maximum)`,
  content: 'le contenu du fichier ne correspond pas à son type',
  'too-many': `trop de fichiers dans le même envoi (${MAX_FILES_PER_UPLOAD} maximum)`,
  failed: 'enregistrement impossible',
}

// Les refus transitent par l'URL sous forme bornée « code:nom » ; le nom n'est jamais
// interprété (rendu par React, donc échappé) et le code est validé contre une liste fermée.
const MAX_REFUSALS_IN_URL = 20
const MAX_NAME_LENGTH = 80

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const revalidateAll = (slug: string) => {
  revalidatePath(EVENTS_PATH)
  revalidatePath('/galerie')
  revalidatePath('/galerie/[slug]')
  revalidatePath(`/galerie/${slug}`)
  revalidatePath('/evenements/[slug]')
  revalidatePath(`/evenements/${slug}`)
}

const redirectBack = async (eventId: string, query: URLSearchParams): Promise<never> => {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } })
  if (event) revalidateAll(event.slug)
  const qs = query.toString()
  return redirect(`${photosPath(eventId)}${qs ? `?${qs}` : ''}`)
}

const redirectWithStatus = (eventId: string, code: keyof typeof STATUS_MESSAGES) =>
  redirectBack(eventId, new URLSearchParams({ status: code }))

const redirectWithError = (eventId: string, code: keyof typeof ERROR_MESSAGES) =>
  redirectBack(eventId, new URLSearchParams({ error: code }))

const readText = (formData: FormData, key: string) => formData.get(key)?.toString() ?? ''

const uploadAction = async (formData: FormData) => {
  'use server'

  const eventId = readText(formData, 'eventId')
  await requireAdminSession({ redirectTo: photosPath(eventId) })
  if (!eventId) return redirect(EVENTS_PATH)

  const files = formData.getAll('photos').filter((v): v is File => v instanceof File && (v.size > 0 || v.name !== ''))
  const result = await addPhotos(eventId, files)
  if (!result.ok) return redirectWithError(eventId, result.error)

  const query = new URLSearchParams({ status: 'uploaded', saved: String(result.saved) })
  query.set('refusedCount', String(result.refused.length))
  for (const refused of result.refused.slice(0, MAX_REFUSALS_IN_URL)) {
    query.append('refused', `${refused.reason}:${refused.name.slice(0, MAX_NAME_LENGTH)}`)
  }
  return redirectBack(eventId, query)
}

const updateAction = async (formData: FormData) => {
  'use server'

  const eventId = readText(formData, 'eventId')
  await requireAdminSession({ redirectTo: photosPath(eventId) })
  const photoId = readText(formData, 'photoId')
  if (!eventId || !photoId) return redirectWithError(eventId || 'unknown', 'missing-id')
  const result = await updatePhoto(eventId, photoId, {
    caption: readText(formData, 'caption'),
    photographer: readText(formData, 'photographer'),
  })
  if (!result.ok) return redirectWithError(eventId, result.error)
  return redirectWithStatus(eventId, 'updated')
}

const moveAction = async (formData: FormData) => {
  'use server'

  const eventId = readText(formData, 'eventId')
  await requireAdminSession({ redirectTo: photosPath(eventId) })
  const photoId = readText(formData, 'photoId')
  const direction = readText(formData, 'direction')
  if (!eventId || !photoId || (direction !== 'up' && direction !== 'down')) {
    return redirectWithError(eventId || 'unknown', 'missing-id')
  }
  const result = await movePhoto(eventId, photoId, direction)
  if (!result.ok) return redirectWithError(eventId, result.error)
  return redirectWithStatus(eventId, 'moved')
}

const deleteAction = async (formData: FormData) => {
  'use server'

  const eventId = readText(formData, 'eventId')
  await requireAdminSession({ redirectTo: photosPath(eventId) })
  const photoId = readText(formData, 'photoId')
  if (!eventId || !photoId) return redirectWithError(eventId || 'unknown', 'missing-id')
  const result = await deletePhoto(eventId, photoId)
  if (!result.ok) return redirectWithError(eventId, result.error)
  return redirectWithStatus(eventId, 'deleted')
}

type SearchParams = Record<string, string | string[] | undefined>

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

const allParamValues = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value : value ? [value] : []

const parseRefusals = (values: string[]): RefusedFile[] =>
  values.slice(0, MAX_REFUSALS_IN_URL).flatMap((value) => {
    const separator = value.indexOf(':')
    const reason = value.slice(0, separator)
    if (separator === -1 || !Object.hasOwn(REFUSAL_MESSAGES, reason)) return []
    return [{ reason: reason as RefusalReason, name: value.slice(separator + 1, separator + 1 + MAX_NAME_LENGTH) }]
  })

const toCount = (value: string | null) => {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : 0
}

export default async function AdminEventPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  await requireAdminSession({ redirectTo: photosPath(id) })

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true },
  })
  if (!event) notFound()

  const query = await searchParams
  const statusCode = firstParamValue(query?.status)
  const errorCode = firstParamValue(query?.error)
  const savedCount = toCount(firstParamValue(query?.saved))
  const refusedCount = toCount(firstParamValue(query?.refusedCount))
  const refusals = parseRefusals(allParamValues(query?.refused))

  let statusMessage: string | null = null
  if (statusCode === 'uploaded') {
    statusMessage = `${savedCount} photo${savedCount > 1 ? 's' : ''} ajoutée${savedCount > 1 ? 's' : ''}.`
  } else if (statusCode) {
    statusMessage = Object.hasOwn(STATUS_MESSAGES, statusCode) ? STATUS_MESSAGES[statusCode] : null
  }
  const errorMessage = errorCode && Object.hasOwn(ERROR_MESSAGES, errorCode) ? ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] : null

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href={EVENTS_PATH} className={styles.back}>
            ← Évènements
          </Link>
          <h1 className={styles.title}>Photos</h1>
          <p className={styles.subtitle}>{event.title}</p>
        </div>
        <div className={styles.feedback}>
          {statusMessage ? <span className={styles.success}>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>
      </header>

      {refusedCount > 0 ? (
        <section className={styles.refusals} aria-labelledby="refusals-heading">
          <h2 id="refusals-heading" className={styles.refusalsTitle}>
            {refusedCount} fichier{refusedCount > 1 ? 's' : ''} refusé{refusedCount > 1 ? 's' : ''}
          </h2>
          <ul>
            {refusals.map((refusal, index) => (
              <li key={`${index}-${refusal.name}`}>
                <strong>{refusal.name || '(sans nom)'}</strong> : {REFUSAL_MESSAGES[refusal.reason]}
              </li>
            ))}
            {refusedCount > refusals.length ? <li>… et {refusedCount - refusals.length} autre(s).</li> : null}
          </ul>
        </section>
      ) : null}

      <section className={styles.panel} aria-labelledby="upload-heading">
        <h2 id="upload-heading" className={styles.panelTitle}>
          Ajouter des photos
        </h2>
        <form action={uploadAction} encType="multipart/form-data" className={styles.uploadForm}>
          <input type="hidden" name="eventId" value={event.id} />
          <div className={styles.formRow}>
            <label htmlFor="photos">Fichiers (JPEG, PNG, WebP ou GIF, {MAX_MB} Mo max, {MAX_FILES_PER_UPLOAD} par envoi)</label>
            <input id="photos" type="file" name="photos" multiple accept="image/*" required />
          </div>
          <button type="submit" className={styles.primaryButton}>
            Envoyer
          </button>
        </form>
      </section>

      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading" className={styles.panelTitle}>
          Photos de l’évènement ({photos.length})
        </h2>
        {photos.length === 0 ? (
          <p className={styles.emptyState}>Aucune photo pour le moment.</p>
        ) : (
          <ul className={styles.grid}>
            {photos.map((photo, index) => (
              <li key={photo.id} className={styles.card}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.path} alt={photo.caption ?? ''} loading="lazy" className={styles.thumb} />

                <form action={updateAction} className={styles.editForm}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="photoId" value={photo.id} />
                  <div className={styles.formRow}>
                    <label htmlFor={`caption-${photo.id}`}>Légende</label>
                    <input
                      id={`caption-${photo.id}`}
                      name="caption"
                      type="text"
                      maxLength={CAPTION_MAX_LENGTH}
                      defaultValue={photo.caption ?? ''}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label htmlFor={`photographer-${photo.id}`}>Crédit photographe</label>
                    <input
                      id={`photographer-${photo.id}`}
                      name="photographer"
                      type="text"
                      maxLength={PHOTOGRAPHER_MAX_LENGTH}
                      defaultValue={photo.photographer ?? ''}
                    />
                  </div>
                  <button type="submit" className={styles.primaryButton}>
                    Enregistrer
                  </button>
                </form>

                <div className={styles.moveRow}>
                  {(['up', 'down'] as const).map((direction) => (
                    <form key={direction} action={moveAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <button
                        type="submit"
                        className={styles.iconButton}
                        aria-label={direction === 'up' ? 'Monter la photo' : 'Descendre la photo'}
                        disabled={direction === 'up' ? index === 0 : index === photos.length - 1}
                      >
                        {direction === 'up' ? '↑' : '↓'}
                      </button>
                    </form>
                  ))}
                </div>

                <form action={deleteAction} className={styles.deleteForm}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="photoId" value={photo.id} />
                  <label htmlFor={`delete-${photo.id}`}>
                    <input id={`delete-${photo.id}`} type="checkbox" required />
                    Je confirme la suppression
                  </label>
                  <button
                    type="submit"
                    className={`${styles.primaryButton} ${styles.danger}`}
                    aria-label="Supprimer la photo"
                  >
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
