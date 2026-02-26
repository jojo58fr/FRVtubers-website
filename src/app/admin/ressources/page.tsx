import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import type { PlainResourceSubmission, ResourceLanguage, ResourceTag } from '@/lib/resources'
import { RESOURCE_SUBMISSIONS_SAMPLE } from '@/lib/resources'
import prisma from '@/lib/prisma'
import { notifyResourcePublished } from '@/lib/resources-webhook'
import ResourcesManager from './ResourcesManager'
import styles from './page.module.scss'

export const dynamic = 'force-dynamic'

const STATUS_MESSAGES: Record<string, string> = {
  approved: 'Ressource validée.',
  rejected: 'Ressource refusée.',
  featured: 'Ressource mise en avant.',
  unfeatured: 'Ressource retirée de la mise en avant.',
  deleted: 'Ressource supprimée.',
  'asset-created': 'Ressource créée.',
  'asset-updated': 'Ressource mise à jour.',
  'tag-created': 'Tag créé.',
  'tag-deleted': 'Tag supprimé.',
  'tag-updated': 'Tag mis à jour.',
  'tags-updated': 'Tags mis à jour.',
}

const ERROR_MESSAGES: Record<string, string> = {
  'missing-id': 'Identifiant introuvable.',
  'invalid-status': 'Statut invalide.',
  'not-found': 'Ressource introuvable.',
  'update-failed': 'La mise à jour a échoué.',
  'delete-failed': 'La suppression a échoué.',
  'not-approved': 'La ressource doit être validée pour être mise en avant.',
  'tag-invalid': 'Tag invalide.',
  'tag-exists': 'Ce tag existe déjà.',
  'asset-invalid': 'Champs requis manquants ou invalides.',
}

const STATUS_PRIORITY = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

const redirectWithStatus = (code: keyof typeof STATUS_MESSAGES): never => {
  revalidatePath(`${ADMIN_PANEL_PATH}/ressources`)
  return redirect(`${ADMIN_PANEL_PATH}/ressources?status=${encodeURIComponent(code)}`)
}

const redirectWithError = (code: keyof typeof ERROR_MESSAGES): never => {
  revalidatePath(`${ADMIN_PANEL_PATH}/ressources`)
  return redirect(`${ADMIN_PANEL_PATH}/ressources?error=${encodeURIComponent(code)}`)
}

const parseBoolean = (value: FormDataEntryValue | null) => {
  if (value === null) return null
  const normalized = value.toString().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return null
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const parseOptionalString = (value: unknown) => (isNonEmptyString(value) ? value.trim() : null)

const parsePrice = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

const parseLanguagesForm = (values: FormDataEntryValue[]) => {
  const allowed: ResourceLanguage[] = ['FR', 'EN', 'OTHER']
  const normalized = values
    .map((value) => value.toString().trim().toUpperCase())
    .filter((value) => value.length > 0)
  if (normalized.some((value) => !allowed.includes(value as ResourceLanguage))) return null
  return Array.from(new Set(normalized)) as ResourceLanguage[]
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeLanguages = (value: unknown): ResourceLanguage[] => {
  if (!Array.isArray(value)) return []
  const allowed: ResourceLanguage[] = ['FR', 'EN', 'OTHER']
  return value.filter((item): item is ResourceLanguage => typeof item === 'string' && allowed.includes(item as ResourceLanguage))
}

const slugifyTagLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const updateStatusAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  const status = formData.get('status')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  if (status !== 'PENDING' && status !== 'APPROVED' && status !== 'REJECTED') {
    return redirectWithError('invalid-status')
  }

  const existing = await prisma.resourceSubmission.findUnique({ where: { id } })
  if (!existing) {
    return redirectWithError('not-found')
  }

  try {
    const updated = await prisma.resourceSubmission.update({
      where: { id },
      data: {
        status,
        featured: status === 'REJECTED' ? false : existing.featured,
      },
      select: {
        id: true,
        assetTitle: true,
        assetUrl: true,
        status: true,
      },
    })

    if (status === 'APPROVED' && existing.status !== 'APPROVED') {
      await notifyResourcePublished(updated)
    }
  } catch (error) {
    console.error('Impossible de mettre à jour la ressource', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus(status === 'APPROVED' ? 'approved' : 'rejected')
}

const toggleFeaturedAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  const featured = parseBoolean(formData.get('featured'))
  if (!id) {
    return redirectWithError('missing-id')
  }

  if (featured === null) {
    return redirectWithError('update-failed')
  }

  const existing = await prisma.resourceSubmission.findUnique({ where: { id } })
  if (!existing) {
    return redirectWithError('not-found')
  }

  if (existing.status !== 'APPROVED') {
    return redirectWithError('not-approved')
  }

  try {
    await prisma.resourceSubmission.update({
      where: { id },
      data: { featured },
    })
  } catch (error) {
    console.error('Impossible de mettre en avant la ressource', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus(featured ? 'featured' : 'unfeatured')
}

const deleteResourceAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  try {
    await prisma.resourceSubmission.delete({ where: { id } })
  } catch (error) {
    console.error('Impossible de supprimer la ressource', error)
    return redirectWithError('delete-failed')
  }

  return redirectWithStatus('deleted')
}

const createResourceAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const submitterName = parseOptionalString(formData.get('submitterName'))
  const submitterEmail = parseOptionalString(formData.get('submitterEmail'))
  const submitterDiscord = parseOptionalString(formData.get('submitterDiscord'))
  const assetTitle = parseOptionalString(formData.get('assetTitle'))
  const creatorName = parseOptionalString(formData.get('creatorName'))
  const assetType = parseOptionalString(formData.get('assetType'))
  const assetUrl = parseOptionalString(formData.get('assetUrl'))
  const description = parseOptionalString(formData.get('description'))
  const previewImageUrl = parseOptionalString(formData.get('previewImageUrl'))
  const rawPrice = formData.get('price')
  const price = parsePrice(rawPrice)
  const languages = parseLanguagesForm(formData.getAll('languages'))
  const featured = parseBoolean(formData.get('featured')) ?? false

  const requiredFields: Array<string | null> = [submitterName, assetTitle, creatorName, assetUrl]
  if (requiredFields.some((value) => !value)) {
    return redirectWithError('asset-invalid')
  }

  if (assetUrl && !isValidUrl(assetUrl)) {
    return redirectWithError('asset-invalid')
  }

  if (previewImageUrl && !isValidUrl(previewImageUrl)) {
    return redirectWithError('asset-invalid')
  }

  if (rawPrice !== null && rawPrice !== '' && price === null) {
    return redirectWithError('asset-invalid')
  }

  if (languages === null) {
    return redirectWithError('asset-invalid')
  }

  const tagIds = formData
    .getAll('tagIds')
    .map((value) => value.toString())
    .filter((value) => value.length > 0)

  try {
    const created = await prisma.resourceSubmission.create({
      data: {
        submitterName: submitterName!,
        submitterEmail,
        submitterDiscord,
        assetTitle: assetTitle!,
        creatorName: creatorName!,
        assetType,
        assetUrl: assetUrl!,
        description,
        previewImageUrl,
        price,
        languages,
        status: 'APPROVED',
        featured,
        ...(tagIds.length > 0
          ? {
              tags: {
                connect: tagIds.map((tagId) => ({ id: tagId })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        assetTitle: true,
        assetUrl: true,
      },
    })

    await notifyResourcePublished(created)
  } catch (error) {
    console.error('Impossible de créer la ressource', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus('asset-created')
}

const updateResourceAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  const assetTitle = parseOptionalString(formData.get('assetTitle'))
  const creatorName = parseOptionalString(formData.get('creatorName'))
  const assetType = parseOptionalString(formData.get('assetType'))
  const assetUrl = parseOptionalString(formData.get('assetUrl'))
  const description = parseOptionalString(formData.get('description'))
  const previewImageUrl = parseOptionalString(formData.get('previewImageUrl'))
  const rawPrice = formData.get('price')
  const price = parsePrice(rawPrice)
  const languages = parseLanguagesForm(formData.getAll('languages'))

  const requiredFields: Array<string | null> = [assetTitle, creatorName, assetUrl]
  if (requiredFields.some((value) => !value)) {
    return redirectWithError('asset-invalid')
  }

  if (assetUrl && !isValidUrl(assetUrl)) {
    return redirectWithError('asset-invalid')
  }

  if (previewImageUrl && !isValidUrl(previewImageUrl)) {
    return redirectWithError('asset-invalid')
  }

  if (rawPrice !== null && rawPrice !== '' && price === null) {
    return redirectWithError('asset-invalid')
  }

  if (languages === null) {
    return redirectWithError('asset-invalid')
  }

  const tagIds = formData
    .getAll('tagIds')
    .map((value) => value.toString())
    .filter((value) => value.length > 0)

  try {
    await prisma.resourceSubmission.update({
      where: { id },
      data: {
        assetTitle: assetTitle!,
        creatorName: creatorName!,
        assetType,
        assetUrl: assetUrl!,
        description,
        previewImageUrl,
        price,
        languages,
        tags: {
          set: tagIds.map((tagId) => ({ id: tagId })),
        },
      },
    })
  } catch (error) {
    console.error('Impossible de mettre à jour la ressource', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus('asset-updated')
}

const createTagAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const label = formData.get('label')?.toString().trim() ?? ''
  if (!label) {
    return redirectWithError('tag-invalid')
  }

  const slug = slugifyTagLabel(label)
  if (!slug) {
    return redirectWithError('tag-invalid')
  }

  const existing = await prisma.resourceTag.findUnique({ where: { slug } })
  if (existing) {
    return redirectWithError('tag-exists')
  }

  try {
    await prisma.resourceTag.create({
      data: { label, slug },
    })
  } catch (error) {
    console.error('Impossible de créer le tag', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus('tag-created')
}

const deleteTagAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  try {
    await prisma.resourceTag.delete({ where: { id } })
  } catch (error) {
    console.error('Impossible de supprimer le tag', error)
    return redirectWithError('delete-failed')
  }

  return redirectWithStatus('tag-deleted')
}

const updateTagAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  const label = formData.get('label')?.toString().trim() ?? ''
  const slugInput = formData.get('slug')?.toString().trim() ?? ''

  if (!id) {
    return redirectWithError('missing-id')
  }

  const existing = await prisma.resourceTag.findUnique({ where: { id } })
  if (!existing) {
    return redirectWithError('not-found')
  }

  const nextLabel = label || existing.label
  const nextSlug = slugInput || slugifyTagLabel(nextLabel)

  if (!nextLabel || !nextSlug) {
    return redirectWithError('tag-invalid')
  }

  const slugOwner = await prisma.resourceTag.findUnique({ where: { slug: nextSlug } })
  if (slugOwner && slugOwner.id !== id) {
    return redirectWithError('tag-exists')
  }

  try {
    await prisma.resourceTag.update({
      where: { id },
      data: {
        label: nextLabel,
        slug: nextSlug,
      },
    })
  } catch (error) {
    console.error('Impossible de mettre à jour le tag', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus('tag-updated')
}

const updateTagsAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  const tagIds = formData
    .getAll('tagIds')
    .map((value) => value.toString())
    .filter((value) => value.length > 0)

  try {
    await prisma.resourceSubmission.update({
      where: { id },
      data: {
        tags: {
          set: tagIds.map((tagId) => ({ id: tagId })),
        },
      },
    })
  } catch (error) {
    console.error('Impossible de mettre à jour les tags', error)
    return redirectWithError('update-failed')
  }

  return redirectWithStatus('tags-updated')
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>
}

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

export default async function AdminResourcesPage({ searchParams }: PageProps) {
  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/ressources` })

  const params = await searchParams
  const statusCode = firstParamValue(params?.status)
  const errorCode = firstParamValue(params?.error)

  const statusMessage = statusCode ? STATUS_MESSAGES[statusCode] ?? statusCode : null
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? errorCode : null

  const resources = await prisma.resourceSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tags: true,
      _count: {
        select: {
          clicks: true,
        },
      },
    },
  })

  const resourceTags = await prisma.resourceTag.findMany({
    orderBy: { label: 'asc' },
    include: {
      resources: {
        where: { status: 'APPROVED' },
        select: { id: true },
      },
    },
  })

  const useSampleData = process.env.NODE_ENV === 'development' && resources.length === 0

  const serialisedResources: PlainResourceSubmission[] = useSampleData
    ? RESOURCE_SUBMISSIONS_SAMPLE
    : [...resources]
        .sort((a, b) => {
          const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
          if (statusDiff !== 0) return statusDiff
          if (a.featured !== b.featured) return a.featured ? -1 : 1
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
        .map((resource) => ({
          id: resource.id,
          submitterName: resource.submitterName,
          submitterEmail: resource.submitterEmail,
          submitterDiscord: resource.submitterDiscord,
          assetTitle: resource.assetTitle,
          creatorName: resource.creatorName,
          assetType: resource.assetType,
          assetUrl: resource.assetUrl,
          description: resource.description,
          previewImageUrl: resource.previewImageUrl,
          price: resource.price,
          languages: normalizeLanguages(resource.languages),
          status: resource.status,
          featured: resource.featured,
          tags: resource.tags.map((tag) => ({ id: tag.id, label: tag.label, slug: tag.slug })),
          clickCount: resource._count?.clicks ?? 0,
          createdAt: resource.createdAt.toISOString(),
          updatedAt: resource.updatedAt.toISOString(),
        }))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Ressources</h1>
          <p className={styles.subtitle}>
            Valide, refuse ou mets en avant les ressources proposées via FRVResources avant publication sur le site.
          </p>
        </div>
        <div className={styles.feedback}>
          {statusMessage ? <span className={styles.success}>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>
      </header>

      <ResourcesManager
        resources={serialisedResources}
        availableTags={resourceTags.map(
          (tag): ResourceTag => ({
            id: tag.id,
            label: tag.label,
            slug: tag.slug,
            approvedCount: tag.resources.length,
          }),
        )}
        updateStatusAction={updateStatusAction}
        toggleFeaturedAction={toggleFeaturedAction}
        deleteAction={deleteResourceAction}
        updateTagsAction={updateTagsAction}
        createResourceAction={createResourceAction}
        updateResourceAction={updateResourceAction}
        createTagAction={createTagAction}
        deleteTagAction={deleteTagAction}
        updateTagAction={updateTagAction}
      />
    </div>
  )
}
