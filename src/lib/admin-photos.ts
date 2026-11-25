import prisma from '@/lib/prisma'
import { IMAGE_MAX_BYTES, InvalidUploadError, isAllowedImage, removePublicFile, saveUploadedFile } from '@/lib/uploads'

// Logique métier de l'admin photos, sur des entrées simples (testable sans session).
// Les server actions de la page se limitent à l'authentification, au parsing du FormData
// et aux redirections. Le dossier de destination vient toujours du slug stocké en base.

export const MAX_FILES_PER_UPLOAD = 50
export const CAPTION_MAX_LENGTH = 300
export const PHOTOGRAPHER_MAX_LENGTH = 100

export type RefusalReason = 'type' | 'size' | 'content' | 'too-many' | 'failed'
export type RefusedFile = { name: string; reason: RefusalReason }

export type PhotoErrorCode = 'not-found' | 'no-files' | 'failed'

export type AddPhotosResult =
  | { ok: true; saved: number; refused: RefusedFile[] }
  | { ok: false; error: PhotoErrorCode }
export type PhotoResult = { ok: true } | { ok: false; error: PhotoErrorCode }

const fail = (error: PhotoErrorCode): { ok: false; error: PhotoErrorCode } => ({ ok: false, error })

const prefixFor = (slug: string) => `/galerie/${slug}/`

export const addPhotos = async (eventId: string, files: File[]): Promise<AddPhotosResult> => {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, slug: true } })
  if (!event) return fail('not-found')
  if (files.length === 0) return fail('no-files')

  const prefix = prefixFor(event.slug)
  const refused: RefusedFile[] = []
  let saved = 0

  const aggregate = await prisma.photo.aggregate({ where: { eventId: event.id }, _max: { sortOrder: true } })
  let nextOrder = (aggregate._max.sortOrder ?? -1) + 1

  for (const [index, file] of files.entries()) {
    const name = file.name
    if (index >= MAX_FILES_PER_UPLOAD) {
      refused.push({ name, reason: 'too-many' })
      continue
    }
    if (file.size > IMAGE_MAX_BYTES) {
      refused.push({ name, reason: 'size' })
      continue
    }
    if (!isAllowedImage(file)) {
      refused.push({ name, reason: 'type' })
      continue
    }

    let publicPath: string
    try {
      publicPath = (await saveUploadedFile(file, `galerie/${event.slug}`, 'photo')).publicPath
    } catch (error) {
      if (error instanceof InvalidUploadError) {
        refused.push({ name, reason: 'content' })
      } else {
        console.error('Enregistrement de la photo impossible', error)
        refused.push({ name, reason: 'failed' })
      }
      continue
    }

    try {
      await prisma.photo.create({ data: { eventId: event.id, path: publicPath, sortOrder: nextOrder } })
      nextOrder += 1
      saved += 1
    } catch (error) {
      console.error('Création de la photo impossible', error)
      await removePublicFile(publicPath, [prefix])
      refused.push({ name, reason: 'failed' })
    }
  }

  return { ok: true, saved, refused }
}

/** Retrouve la photo uniquement si elle appartient à l'évènement donné. */
const findOwned = async (eventId: string, photoId: string) => {
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { event: { select: { slug: true } } } })
  return photo && photo.eventId === eventId ? photo : null
}

const clean = (value: string, max: number): string | null => value.trim().slice(0, max).trim() || null

export const updatePhoto = async (
  eventId: string,
  photoId: string,
  input: { caption: string; photographer: string },
): Promise<PhotoResult> => {
  const photo = await findOwned(eventId, photoId)
  if (!photo) return fail('not-found')
  try {
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        caption: clean(input.caption, CAPTION_MAX_LENGTH),
        photographer: clean(input.photographer, PHOTOGRAPHER_MAX_LENGTH),
      },
    })
    return { ok: true }
  } catch (error) {
    console.error('Mise à jour de la photo impossible', error)
    return fail('failed')
  }
}

export const movePhoto = async (
  eventId: string,
  photoId: string,
  direction: 'up' | 'down',
): Promise<PhotoResult> => {
  const photo = await findOwned(eventId, photoId)
  if (!photo) return fail('not-found')
  try {
    const siblings = await prisma.photo.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, sortOrder: true },
    })
    const index = siblings.findIndex((p) => p.id === photo.id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= siblings.length) return { ok: true }

    // On renumérote 0..n-1 après l'échange : robuste même si des sortOrder sont égaux.
    const reordered = [...siblings]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const updates = reordered.flatMap((p, i) =>
      p.sortOrder === i ? [] : [prisma.photo.update({ where: { id: p.id }, data: { sortOrder: i } })],
    )
    await prisma.$transaction(updates)
    return { ok: true }
  } catch (error) {
    console.error('Réordonnancement de la photo impossible', error)
    return fail('failed')
  }
}

export const deletePhoto = async (eventId: string, photoId: string): Promise<PhotoResult> => {
  const photo = await findOwned(eventId, photoId)
  if (!photo) return fail('not-found')
  try {
    await prisma.photo.delete({ where: { id: photo.id } })
  } catch (error) {
    console.error('Suppression de la photo impossible', error)
    return fail('failed')
  }
  await removePublicFile(photo.path, [prefixFor(photo.event.slug)])
  return { ok: true }
}
