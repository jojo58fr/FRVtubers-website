import { Prisma } from '@prisma/client'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ADMIN_PANEL_PATH, requireAdminSession } from '@/lib/admin-auth'
import type { PlainMagazine } from '@/lib/magazines'
import {
  MAX_COVER_SIZE_BYTES,
  MAX_COVER_SIZE_LABEL,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_SIZE_LABEL,
} from '@/lib/magazine-upload-constraints'
import prisma from '@/lib/prisma'
import MagazinesManager from './MagazinesManager'
import styles from './page.module.scss'

const STATUS_MESSAGES: Record<string, string> = {
  created: 'Magazine créé avec succès.',
  updated: 'Magazine mis à jour.',
  deleted: 'Magazine supprimé.',
}

const ERROR_MESSAGES: Record<string, string> = {
  'missing-title': 'Le titre est obligatoire.',
  'missing-files': 'Ajoute un PDF et une couverture avant de valider.',
  'duplicate-slug': 'Ce slug est déjà utilisé.',
  'creation-failed': 'La création a échoué.',
  'missing-id': 'Identifiant introuvable.',
  'not-found': 'Magazine introuvable.',
  'update-failed': 'La mise à jour a échoué.',
  'delete-failed': 'La suppression a échoué.',
  'file-too-large': `Les fichiers dépassent la taille maximale autorisée (PDF : ${MAX_PDF_SIZE_LABEL}, miniature : ${MAX_COVER_SIZE_LABEL}).`,
}

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const PDF_DIR = path.join(PUBLIC_DIR, 'magazines')
const COVER_DIR = path.join(PDF_DIR, 'covers')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim() || `magazine-${randomUUID().slice(0, 6)}`

const parseDateInput = (value: string | null, fallback?: Date) => {
  if (!value) {
    return fallback ?? null
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    return fallback ?? null
  }

  return parsed
}

const getValidFile = (entry: FormDataEntryValue | null) =>
  entry instanceof File && entry.size > 0 && entry.name ? entry : null

const ensureDir = async (dir: string) => {
  await mkdir(dir, { recursive: true })
}

const toPublicPath = (absolutePath: string) =>
  `/${path.relative(PUBLIC_DIR, absolutePath).replace(/\\/g, '/')}`

const saveUploadedFile = async (file: File, directory: string, baseName: string, fallbackExt: string) => {
  await ensureDir(directory)
  const buffer = Buffer.from(await file.arrayBuffer())
  const originalExt = path.extname(file.name).toLowerCase()
  const extension = originalExt || fallbackExt
  const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 6)}${extension}`
  const absolutePath = path.join(directory, filename)
  await writeFile(absolutePath, buffer)
  return { absolutePath, publicPath: toPublicPath(absolutePath) }
}

const removeIfLocal = async (maybePath: string | null | undefined) => {
  if (!maybePath || !maybePath.startsWith('/magazines/')) {
    return
  }

  const absolutePath = path.join(PUBLIC_DIR, maybePath.replace(/^\/+/, '').replace(/\\/g, '/'))
  try {
    await unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Impossible de supprimer le fichier', absolutePath, error)
    }
  }
}

const redirectWithStatus = (code: keyof typeof STATUS_MESSAGES): never => {
  revalidatePath(ADMIN_PANEL_PATH)
  revalidatePath('/kokori-mag')
  revalidatePath('/kokori-mag/[slug]')
  return redirect(`${ADMIN_PANEL_PATH}/magazines?status=${encodeURIComponent(code)}`)
}

const redirectWithError = (code: keyof typeof ERROR_MESSAGES): never => {
  revalidatePath(ADMIN_PANEL_PATH)
  return redirect(`${ADMIN_PANEL_PATH}/magazines?error=${encodeURIComponent(code)}`)
}

const handlePrismaError = (error: unknown, fallback: keyof typeof ERROR_MESSAGES): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return redirectWithError('duplicate-slug')
  }

  console.error('Erreur Prisma inattendue', error)
  return redirectWithError(fallback)
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>
}

const createMagazineAction = async (formData: FormData) => {
  'use server'

  const session = await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/magazines` })

  const rawTitle = formData.get('title')?.toString().trim() ?? ''
  if (!rawTitle) {
    return redirectWithError('missing-title')
  }

  const rawSlug = formData.get('slug')?.toString().trim() ?? ''
  const slug = slugify(rawSlug || rawTitle)
  const issueNumber = formData.get('issueNumber')?.toString().trim() || null
  const releaseDateValue = formData.get('releaseDate')?.toString() ?? ''
  const description = formData.get('description')?.toString().trim() || null
  const published = formData.get('published') !== null
  const pdfFile = getValidFile(formData.get('pdfFile'))
  const coverFile = getValidFile(formData.get('coverImageFile'))

  if (!pdfFile || !coverFile) {
    return redirectWithError('missing-files')
  }

  if (pdfFile.size > MAX_PDF_SIZE_BYTES || coverFile.size > MAX_COVER_SIZE_BYTES) {
    return redirectWithError('file-too-large')
  }

  const releaseDate = parseDateInput(releaseDateValue) ?? new Date()

  try {
    const [{ publicPath: pdfPath }, { publicPath: coverImageUrl }] = await Promise.all([
      saveUploadedFile(pdfFile, PDF_DIR, slug, '.pdf'),
      saveUploadedFile(coverFile, COVER_DIR, slug, '.png'),
    ])

    await prisma.magazine.create({
      data: {
        slug,
        title: rawTitle,
        issueNumber,
        releaseDate,
        description,
        pdfPath,
        coverImageUrl,
        published,
        createdById: session.user?.id ?? null,
      },
    })
  } catch (error) {
    return handlePrismaError(error, 'creation-failed')
  }

  return redirectWithStatus('created')
}

const updateMagazineAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/magazines` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  const existing = await prisma.magazine.findUnique({ where: { id } })
  if (!existing) {
    return redirectWithError('not-found')
  }

  const rawTitle = formData.get('title')?.toString().trim() || existing.title
  const rawSlug = formData.get('slug')?.toString().trim() || existing.slug
  const slug = slugify(rawSlug)
  const issueNumber = formData.get('issueNumber')?.toString().trim() || null
  const releaseDateValue = formData.get('releaseDate')?.toString() ?? existing.releaseDate.toISOString().slice(0, 10)
  const description = formData.get('description')?.toString().trim() || null
  const published = formData.get('published') !== null
  const pdfFile = getValidFile(formData.get('pdfFile'))
  const coverFile = getValidFile(formData.get('coverImageFile'))

  const releaseDate = parseDateInput(releaseDateValue, existing.releaseDate) ?? existing.releaseDate

  let pdfPath = existing.pdfPath
  let coverImageUrl = existing.coverImageUrl

  if ((pdfFile && pdfFile.size > MAX_PDF_SIZE_BYTES) || (coverFile && coverFile.size > MAX_COVER_SIZE_BYTES)) {
    return redirectWithError('file-too-large')
  }

  try {
    if (pdfFile) {
      const stored = await saveUploadedFile(pdfFile, PDF_DIR, slug, '.pdf')
      await removeIfLocal(existing.pdfPath)
      pdfPath = stored.publicPath
    }

    if (coverFile) {
      const stored = await saveUploadedFile(coverFile, COVER_DIR, slug, '.png')
      await removeIfLocal(existing.coverImageUrl)
      coverImageUrl = stored.publicPath
    }

    await prisma.magazine.update({
      where: { id },
      data: {
        slug,
        title: rawTitle,
        issueNumber,
        releaseDate,
        description,
        pdfPath,
        coverImageUrl,
        published,
      },
    })
  } catch (error) {
    return handlePrismaError(error, 'update-failed')
  }

  return redirectWithStatus('updated')
}

const deleteMagazineAction = async (formData: FormData) => {
  'use server'

  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/magazines` })

  const id = formData.get('id')?.toString()
  if (!id) {
    return redirectWithError('missing-id')
  }

  const existing = await prisma.magazine.findUnique({ where: { id } })
  if (!existing) {
    return redirectWithError('not-found')
  }

  try {
    await prisma.magazine.delete({ where: { id } })
    await Promise.all([removeIfLocal(existing.pdfPath), removeIfLocal(existing.coverImageUrl)])
  } catch (error) {
    console.error('Impossible de supprimer le magazine', error)
    return redirectWithError('delete-failed')
  }

  return redirectWithStatus('deleted')
}

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

export default async function AdminMagazinesPage({ searchParams }: PageProps) {
  await requireAdminSession({ redirectTo: `${ADMIN_PANEL_PATH}/magazines` })

  const params = await searchParams
  const statusCode = firstParamValue(params?.status)
  const errorCode = firstParamValue(params?.error)

  const statusMessage = statusCode ? STATUS_MESSAGES[statusCode] ?? statusCode : null
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? errorCode : null

  const magazines = await prisma.magazine.findMany({
    orderBy: { releaseDate: 'desc' },
  })

  const serialisedMagazines: PlainMagazine[] = magazines.map((magazine) => ({
    id: magazine.id,
    slug: magazine.slug,
    title: magazine.title,
    issueNumber: magazine.issueNumber,
    releaseDate: magazine.releaseDate.toISOString(),
    description: magazine.description,
    pdfPath: magazine.pdfPath,
    coverImageUrl: magazine.coverImageUrl,
    published: magazine.published,
  }))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Magazines</h1>
          <p className={styles.subtitle}>
            Gère les publications de Kokori Mag, upload les PDF et les miniatures, puis publie ou enregistre en
            brouillon.
          </p>
        </div>
        <div className={styles.feedback}>
          {statusMessage ? <span className={styles.success}>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>
      </header>

      <MagazinesManager
        magazines={serialisedMagazines}
        createAction={createMagazineAction}
        updateAction={updateMagazineAction}
        deleteAction={deleteMagazineAction}
      />
    </div>
  )
}



