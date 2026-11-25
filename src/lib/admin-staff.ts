import { Prisma } from '@prisma/client'
import { isSafeHttpUrl } from '@/lib/event-blocks'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { InvalidUploadError, isAllowedImage, removePublicDir, removePublicFile, saveUploadedFile } from '@/lib/uploads'

// Logique métier de l'admin staff, sur des entrées simples (testable sans session).
// Les server actions de la page se limitent à l'authentification, au parsing du FormData
// et aux redirections. Les chemins disque viennent toujours du slug stocké en base.

export const NAME_MAX_LENGTH = 100
export const TITLE_MAX_LENGTH = 100
export const BIO_MAX_LENGTH = 1000
export const LINK_LABEL_MAX_LENGTH = 40
export const LINK_URL_MAX_LENGTH = 300
export const MAX_LINKS_PER_MEMBER = 10
export const CONTRIBUTION_TEXT_MAX_LENGTH = 200
export const MAX_CONTRIBUTIONS_PER_MEMBER = 30
export const YEAR_MIN = 1900
export const YEAR_MAX = 2100

export type StaffErrorCode =
  | 'missing-name'
  | 'invalid-link'
  | 'too-many-links'
  | 'invalid-image'
  | 'duplicate-slug'
  | 'missing-text'
  | 'invalid-year'
  | 'event-not-found'
  | 'too-many-contributions'
  | 'not-found'
  | 'failed'

export type LinkInput = { label: string; url: string }

export type MemberInput = {
  name: string
  title: string
  bio: string
  links: LinkInput[]
  isActive: boolean
  published: boolean
}

export type ContributionInput = {
  text: string
  /** Chaîne du formulaire : vide ou entier entre 1900 et 2100. */
  year: string
  /** Identifiant d'évènement ou chaîne vide. */
  eventId: string
}

type DbMember = NonNullable<Awaited<ReturnType<typeof prisma.staffMember.findUnique>>>
type DbContribution = NonNullable<Awaited<ReturnType<typeof prisma.staffContribution.findUnique>>>

export type MemberResult = { ok: true; member: DbMember } | { ok: false; error: StaffErrorCode }
export type ContributionResult = { ok: true; contribution: DbContribution } | { ok: false; error: StaffErrorCode }
export type StaffResult = { ok: true } | { ok: false; error: StaffErrorCode }

const fail = (error: StaffErrorCode): { ok: false; error: StaffErrorCode } => ({ ok: false, error })

const prefixFor = (slug: string) => `/staff/${slug}/`

const clean = (value: string, max: number): string | null => value.trim().slice(0, max).trim() || null

type CleanLinks = { links: LinkInput[] } | { error: StaffErrorCode }

/**
 * Choix : une ligne partiellement remplie ou invalide (URL non http(s), libellé vide, libellé
 * ou URL trop long) REFUSE toute la sauvegarde, plutôt que d'être supprimée en silence ;
 * l'admin voit ainsi que son lien n'a pas été enregistré. Les lignes entièrement vides sont
 * ignorées (lignes ajoutées puis laissées blanches). Seuls `{label, url}` sont stockés.
 */
const cleanLinks = (rows: LinkInput[]): CleanLinks => {
  const links: LinkInput[] = []
  for (const row of rows) {
    const label = row.label.trim()
    const url = row.url.trim()
    if (!label && !url) continue
    if (!label || !url) return { error: 'invalid-link' }
    if (label.length > LINK_LABEL_MAX_LENGTH || url.length > LINK_URL_MAX_LENGTH) return { error: 'invalid-link' }
    if (!isSafeHttpUrl(url)) return { error: 'invalid-link' }
    links.push({ label, url })
  }
  if (links.length > MAX_LINKS_PER_MEMBER) return { error: 'too-many-links' }
  return { links }
}

type Fields = {
  name: string
  title: string
  bio: string | null
  links: LinkInput[]
  isActive: boolean
  published: boolean
}

const validateMember = (input: MemberInput): Fields | { error: StaffErrorCode } => {
  const name = clean(input.name, NAME_MAX_LENGTH)
  if (!name) return { error: 'missing-name' }
  const links = cleanLinks(input.links)
  if ('error' in links) return { error: links.error }
  return {
    name,
    // La colonne `title` n'est pas nullable : un rôle vide est stocké comme chaîne vide.
    title: clean(input.title, TITLE_MAX_LENGTH) ?? '',
    bio: clean(input.bio, BIO_MAX_LENGTH),
    links: links.links,
    isActive: input.isActive,
    published: input.published,
  }
}

const linksJson = (links: LinkInput[]) => links as unknown as Prisma.InputJsonValue

const usablePhoto = (file: File | null | undefined): File | null => (file && file.size > 0 ? file : null)

export const createMember = async (input: MemberInput, photo: File | null): Promise<MemberResult> => {
  const fields = validateMember(input)
  if ('error' in fields) return fail(fields.error)

  const file = usablePhoto(photo)
  if (file && !isAllowedImage(file)) return fail('invalid-image')

  const slug = slugify(fields.name, 'membre')
  if (await prisma.staffMember.findUnique({ where: { slug }, select: { id: true } })) {
    return fail('duplicate-slug')
  }

  let photoPath: string | null = null
  try {
    if (file) photoPath = (await saveUploadedFile(file, `staff/${slug}`, 'photo')).publicPath

    const aggregate = await prisma.staffMember.aggregate({ _max: { sortOrder: true } })
    const member = await prisma.staffMember.create({
      data: {
        ...fields,
        links: linksJson(fields.links),
        slug,
        photoPath,
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
      },
    })
    return { ok: true, member }
  } catch (error) {
    if (photoPath) await removePublicFile(photoPath, [prefixFor(slug)])
    if (error instanceof InvalidUploadError) return fail('invalid-image')
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return fail('duplicate-slug')
    }
    console.error('Création du membre impossible', error)
    return fail('failed')
  }
}

export const updateMember = async (id: string, input: MemberInput, photo: File | null): Promise<MemberResult> => {
  const existing = await prisma.staffMember.findUnique({ where: { id } })
  if (!existing) return fail('not-found')

  const fields = validateMember(input)
  if ('error' in fields) return fail(fields.error)

  const file = usablePhoto(photo)
  if (file && !isAllowedImage(file)) return fail('invalid-image')

  // Le slug est immuable : il vient toujours de la base, jamais de l'entrée.
  const slug = existing.slug
  const prefix = prefixFor(slug)

  let newPhotoPath: string | null = null
  try {
    if (file) newPhotoPath = (await saveUploadedFile(file, `staff/${slug}`, 'photo')).publicPath

    const member = await prisma.staffMember.update({
      where: { id },
      data: {
        ...fields,
        links: linksJson(fields.links),
        ...(newPhotoPath ? { photoPath: newPhotoPath } : {}),
      },
    })

    // L'ancien fichier n'est supprimé qu'une fois la base à jour.
    if (newPhotoPath) await removePublicFile(existing.photoPath, [prefix])
    return { ok: true, member }
  } catch (error) {
    if (newPhotoPath) await removePublicFile(newPhotoPath, [prefix])
    if (error instanceof InvalidUploadError) return fail('invalid-image')
    console.error('Mise à jour du membre impossible', error)
    return fail('failed')
  }
}

export const deleteMember = async (id: string): Promise<StaffResult> => {
  const existing = await prisma.staffMember.findUnique({ where: { id }, select: { slug: true } })
  if (!existing) return fail('not-found')
  try {
    // Les contributions sont supprimées en cascade par la base.
    await prisma.staffMember.delete({ where: { id } })
    await removePublicDir(`staff/${existing.slug}`)
    return { ok: true }
  } catch (error) {
    console.error('Suppression du membre impossible', error)
    return fail('failed')
  }
}

/** Nouvel ordre après échange avec le voisin, ou null si c'est un no-op (bords). */
const swapped = <T extends { id: string }>(items: T[], id: string, direction: 'up' | 'down'): T[] | null => {
  const index = items.findIndex((item) => item.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || target < 0 || target >= items.length) return null
  const reordered = [...items]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  return reordered
}

export const moveMember = async (id: string, direction: 'up' | 'down'): Promise<StaffResult> => {
  const member = await prisma.staffMember.findUnique({ where: { id }, select: { id: true } })
  if (!member) return fail('not-found')
  try {
    const siblings = await prisma.staffMember.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true, sortOrder: true },
    })
    const reordered = swapped(siblings, id, direction)
    if (!reordered) return { ok: true }
    // Renumérotation 0..n-1 : robuste même si des sortOrder sont égaux.
    const updates = reordered.flatMap((m, i) =>
      m.sortOrder === i ? [] : [prisma.staffMember.update({ where: { id: m.id }, data: { sortOrder: i } })],
    )
    await prisma.$transaction(updates)
    return { ok: true }
  } catch (error) {
    console.error('Réordonnancement du membre impossible', error)
    return fail('failed')
  }
}

type ContributionFields = { text: string; year: number | null; eventId: string | null }

const validateContribution = async (input: ContributionInput): Promise<ContributionFields | { error: StaffErrorCode }> => {
  const text = clean(input.text, CONTRIBUTION_TEXT_MAX_LENGTH)
  if (!text) return { error: 'missing-text' }

  let year: number | null = null
  const rawYear = input.year.trim()
  if (rawYear) {
    year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : Number.NaN
    if (!(year >= YEAR_MIN && year <= YEAR_MAX)) return { error: 'invalid-year' }
  }

  // L'évènement lié peut être un brouillon (la page publique masque alors le lien).
  const eventId = input.eventId.trim() || null
  if (eventId && !(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) {
    return { error: 'event-not-found' }
  }
  return { text, year, eventId }
}

/** Retrouve la contribution uniquement si elle appartient au membre donné. */
const findOwned = async (memberId: string, contributionId: string) => {
  const found = await prisma.staffContribution.findUnique({ where: { id: contributionId } })
  return found && found.memberId === memberId ? found : null
}

export const addContribution = async (memberId: string, input: ContributionInput): Promise<ContributionResult> => {
  const member = await prisma.staffMember.findUnique({ where: { id: memberId }, select: { id: true } })
  if (!member) return fail('not-found')

  const fields = await validateContribution(input)
  if ('error' in fields) return fail(fields.error)

  try {
    const count = await prisma.staffContribution.count({ where: { memberId } })
    if (count >= MAX_CONTRIBUTIONS_PER_MEMBER) return fail('too-many-contributions')
    const aggregate = await prisma.staffContribution.aggregate({ where: { memberId }, _max: { sortOrder: true } })
    const contribution = await prisma.staffContribution.create({
      data: { memberId, ...fields, sortOrder: (aggregate._max.sortOrder ?? -1) + 1 },
    })
    return { ok: true, contribution }
  } catch (error) {
    console.error('Ajout de la contribution impossible', error)
    return fail('failed')
  }
}

export const updateContribution = async (
  memberId: string,
  contributionId: string,
  input: ContributionInput,
): Promise<ContributionResult> => {
  const existing = await findOwned(memberId, contributionId)
  if (!existing) return fail('not-found')

  const fields = await validateContribution(input)
  if ('error' in fields) return fail(fields.error)

  try {
    const contribution = await prisma.staffContribution.update({ where: { id: existing.id }, data: fields })
    return { ok: true, contribution }
  } catch (error) {
    console.error('Mise à jour de la contribution impossible', error)
    return fail('failed')
  }
}

export const deleteContribution = async (memberId: string, contributionId: string): Promise<StaffResult> => {
  const existing = await findOwned(memberId, contributionId)
  if (!existing) return fail('not-found')
  try {
    await prisma.staffContribution.delete({ where: { id: existing.id } })
    return { ok: true }
  } catch (error) {
    console.error('Suppression de la contribution impossible', error)
    return fail('failed')
  }
}

export const moveContribution = async (
  memberId: string,
  contributionId: string,
  direction: 'up' | 'down',
): Promise<StaffResult> => {
  const existing = await findOwned(memberId, contributionId)
  if (!existing) return fail('not-found')
  try {
    const siblings = await prisma.staffContribution.findMany({
      where: { memberId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, sortOrder: true },
    })
    const reordered = swapped(siblings, existing.id, direction)
    if (!reordered) return { ok: true }
    const updates = reordered.flatMap((c, i) =>
      c.sortOrder === i ? [] : [prisma.staffContribution.update({ where: { id: c.id }, data: { sortOrder: i } })],
    )
    await prisma.$transaction(updates)
    return { ok: true }
  } catch (error) {
    console.error('Réordonnancement de la contribution impossible', error)
    return fail('failed')
  }
}
