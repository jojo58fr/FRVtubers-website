import { Prisma } from '@prisma/client'
import { sanitizeBlocks, type EventBlock } from '@/lib/event-blocks'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { InvalidUploadError, isAllowedImage, removePublicDir, removePublicFile, saveUploadedFile } from '@/lib/uploads'

// Logique métier de l'admin évènements, sur des entrées simples (testable sans session).
// Les server actions de la page se limitent à l'authentification, au parsing du FormData
// et aux redirections.

export const EVENT_TYPES = ['GENESIS', 'FRVMON', 'OTHER'] as const
export type EventTypeValue = (typeof EVENT_TYPES)[number]

export type EventInput = {
  title: string
  type: string
  /** AAAA-MM-JJ */
  startsAt: string
  /** AAAA-MM-JJ ou vide */
  endsAt: string
  summary: string
  hasArticle: boolean
  published: boolean
  /**
   * JSON sérialisé par l'éditeur de blocs. `null` = pas d'éditeur dans le formulaire :
   * les blocs stockés sont conservés tels quels.
   */
  blocksJson: string | null
}

export type EventFiles = {
  cover?: File | null
  /** Fichiers d'images de blocs, indexés par identifiant de bloc. */
  blockImages?: Record<string, File>
}

export type EventErrorCode =
  | 'missing-title'
  | 'invalid-type'
  | 'invalid-date'
  | 'end-before-start'
  | 'invalid-image'
  | 'invalid-blocks'
  | 'duplicate-slug'
  | 'not-found'
  | 'failed'

type DbEvent = NonNullable<Awaited<ReturnType<typeof prisma.event.findUnique>>>

export type EventResult = { ok: true; event: DbEvent } | { ok: false; error: EventErrorCode }

const fail = (error: EventErrorCode): { ok: false; error: EventErrorCode } => ({ ok: false, error })

const parseDay = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

type Validated = {
  title: string
  type: EventTypeValue
  startsAt: Date
  endsAt: Date | null
  summary: string | null
}

const validateFields = (input: EventInput): Validated | { error: EventErrorCode } => {
  const title = input.title.trim()
  if (!title) return { error: 'missing-title' }
  if (!(EVENT_TYPES as readonly string[]).includes(input.type)) return { error: 'invalid-type' }
  const startsAt = parseDay(input.startsAt)
  if (!startsAt) return { error: 'invalid-date' }
  let endsAt: Date | null = null
  if (input.endsAt) {
    endsAt = parseDay(input.endsAt)
    if (!endsAt) return { error: 'invalid-date' }
    if (endsAt.getTime() < startsAt.getTime()) return { error: 'end-before-start' }
  }
  return {
    title,
    type: input.type as EventTypeValue,
    startsAt,
    endsAt,
    summary: input.summary.trim() || null,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const prefixFor = (slug: string) => `/evenements/${slug}/`

const imagePaths = (blocks: EventBlock[]): string[] =>
  blocks.flatMap((block) => (block.type === 'image' ? [block.path] : []))

type PreparedBlocks = { blocks: EventBlock[]; savedPaths: string[] } | { error: EventErrorCode }

/**
 * Parse le JSON (défensif), enregistre les images de blocs, puis ne renvoie que la sortie
 * de `sanitizeBlocks`. Les fichiers sont validés avant toute écriture.
 */
const prepareBlocks = async (
  blocksJson: string,
  slug: string,
  blockImages: Record<string, File>,
): Promise<PreparedBlocks> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(blocksJson)
  } catch {
    return { error: 'invalid-blocks' }
  }
  if (!Array.isArray(parsed)) return { error: 'invalid-blocks' }

  const prefix = prefixFor(slug)
  const raws = parsed.map((raw): unknown => (isRecord(raw) ? { ...raw } : raw))

  const uploads: Array<{ raw: Record<string, unknown>; file: File }> = []
  for (const raw of raws) {
    if (!isRecord(raw) || raw.type !== 'image') continue
    const file = typeof raw.id === 'string' ? blockImages[raw.id] : undefined
    if (file && file.size > 0) {
      if (!isAllowedImage(file)) return { error: 'invalid-image' }
      uploads.push({ raw, file })
    } else if (typeof raw.path !== 'string' || !raw.path.startsWith(prefix)) {
      // Un chemin existant ne peut venir que du dossier de cet évènement.
      raw.path = ''
    }
  }

  const savedPaths: string[] = []
  try {
    for (const { raw, file } of uploads) {
      const { publicPath } = await saveUploadedFile(file, `evenements/${slug}`, 'bloc')
      savedPaths.push(publicPath)
      raw.path = publicPath
    }
  } catch (error) {
    await Promise.all(savedPaths.map((p) => removePublicFile(p, [prefix])))
    if (error instanceof InvalidUploadError) return { error: 'invalid-image' }
    console.error('Enregistrement des images de blocs impossible', error)
    return { error: 'failed' }
  }

  return { blocks: sanitizeBlocks(raws), savedPaths }
}

const toJson = (blocks: EventBlock[]) => blocks as unknown as Prisma.InputJsonValue

export const createEvent = async (
  input: EventInput,
  files: EventFiles,
  createdById: string | null = null,
): Promise<EventResult> => {
  const fields = validateFields(input)
  if ('error' in fields) return fail(fields.error)

  const cover = files.cover && files.cover.size > 0 ? files.cover : null
  if (cover && !isAllowedImage(cover)) return fail('invalid-image')

  const slug = slugify(fields.title, 'evenement')
  if (await prisma.event.findUnique({ where: { slug }, select: { id: true } })) {
    return fail('duplicate-slug')
  }

  const saved: string[] = []
  const cleanup = () => Promise.all(saved.map((p) => removePublicFile(p, [prefixFor(slug)])))

  try {
    let blocks: EventBlock[] = []
    if (input.hasArticle && input.blocksJson !== null) {
      const prepared = await prepareBlocks(input.blocksJson, slug, files.blockImages ?? {})
      if ('error' in prepared) return fail(prepared.error)
      blocks = prepared.blocks
      saved.push(...prepared.savedPaths)
    }

    let coverImagePath: string | null = null
    if (cover) {
      coverImagePath = (await saveUploadedFile(cover, `evenements/${slug}`, 'cover')).publicPath
      saved.push(coverImagePath)
    }

    const event = await prisma.event.create({
      data: {
        slug,
        ...fields,
        coverImagePath,
        hasArticle: input.hasArticle,
        published: input.published,
        blocks: toJson(blocks),
        createdById,
      },
    })
    return { ok: true, event }
  } catch (error) {
    await cleanup()
    if (error instanceof InvalidUploadError) return fail('invalid-image')
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return fail('duplicate-slug')
    }
    console.error('Création de l’évènement impossible', error)
    return fail('failed')
  }
}

export const updateEvent = async (
  id: string,
  input: EventInput,
  files: EventFiles,
): Promise<EventResult> => {
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return fail('not-found')

  const fields = validateFields(input)
  if ('error' in fields) return fail(fields.error)

  const cover = files.cover && files.cover.size > 0 ? files.cover : null
  if (cover && !isAllowedImage(cover)) return fail('invalid-image')

  // Le slug est immuable : il vient toujours de la base, jamais de l'entrée.
  const slug = existing.slug
  const prefix = prefixFor(slug)
  const saved: string[] = []
  const cleanup = () => Promise.all(saved.map((p) => removePublicFile(p, [prefix])))

  try {
    // Choix : quand « hasArticle » est décoché (ou que le formulaire n'envoie pas de blocs),
    // les blocs stockés restent intacts en base et sur disque ; ils sont simplement ignorés
    // à l'affichage public. Recocher la case les restaure.
    let blocksUpdate: { blocks: Prisma.InputJsonValue } | Record<string, never> = {}
    const toRemove: string[] = []
    if (input.hasArticle && input.blocksJson !== null) {
      const prepared = await prepareBlocks(input.blocksJson, slug, files.blockImages ?? {})
      if ('error' in prepared) return fail(prepared.error)
      saved.push(...prepared.savedPaths)
      blocksUpdate = { blocks: toJson(prepared.blocks) }
      const kept = new Set(imagePaths(prepared.blocks))
      toRemove.push(...imagePaths(sanitizeBlocks(existing.blocks)).filter((p) => !kept.has(p)))
    }

    let coverImagePath = existing.coverImagePath
    if (cover) {
      coverImagePath = (await saveUploadedFile(cover, `evenements/${slug}`, 'cover')).publicPath
      saved.push(coverImagePath)
      if (existing.coverImagePath) toRemove.push(existing.coverImagePath)
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...fields,
        coverImagePath,
        hasArticle: input.hasArticle,
        published: input.published,
        ...blocksUpdate,
      },
    })

    await Promise.all(toRemove.map((p) => removePublicFile(p, [prefix])))
    return { ok: true, event }
  } catch (error) {
    await cleanup()
    if (error instanceof InvalidUploadError) return fail('invalid-image')
    console.error('Mise à jour de l’évènement impossible', error)
    return fail('failed')
  }
}

export const deleteEvent = async (
  id: string,
): Promise<{ ok: true } | { ok: false; error: EventErrorCode }> => {
  const existing = await prisma.event.findUnique({ where: { id }, select: { slug: true } })
  if (!existing) return fail('not-found')

  try {
    // Les photos sont supprimées en cascade par la base.
    await prisma.event.delete({ where: { id } })
    await Promise.all([
      removePublicDir(`galerie/${existing.slug}`),
      removePublicDir(`evenements/${existing.slug}`),
    ])
    return { ok: true }
  } catch (error) {
    console.error('Suppression de l’évènement impossible', error)
    return fail('failed')
  }
}
