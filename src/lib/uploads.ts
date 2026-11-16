import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// Résolu à chaque appel pour pouvoir être surchargé (PUBLIC_DIR) dans les tests.
const getPublicDir = () => path.resolve(process.env.PUBLIC_DIR || path.join(process.cwd(), 'public'))

export const isAllowedImage = (file: File): boolean =>
  ALLOWED_IMAGE_TYPES.has(file.type) && file.size <= IMAGE_MAX_BYTES

const sanitizeName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Assainit un sous-dossier : segments sans "." / ".." / caractères spéciaux.
const sanitizeSubdir = (subdir: string): string[] =>
  subdir
    .split(/[/\\]+/)
    .map(sanitizeName)
    .filter(Boolean)

export const saveUploadedFile = async (
  file: File,
  publicSubdir: string,
  baseName: string,
): Promise<{ publicPath: string }> => {
  const segments = sanitizeSubdir(publicSubdir)
  if (segments.length === 0) {
    throw new Error('Sous-dossier de destination invalide')
  }

  const safeBase = sanitizeName(baseName) || 'file'
  const rawExt = path.extname(file.name).toLowerCase()
  const extension = /^\.[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : ''
  const filename = `${safeBase}-${Date.now()}-${randomUUID().slice(0, 6)}${extension}`

  const directory = path.join(getPublicDir(), ...segments)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()))

  return { publicPath: `/${[...segments, filename].join('/')}` }
}

export const removePublicFile = async (
  publicPath: string | null | undefined,
  allowedPrefixes: string[],
): Promise<void> => {
  if (!publicPath || publicPath.includes('..') || publicPath.includes(String.fromCharCode(92))) {
    return
  }
  if (!allowedPrefixes.some((prefix) => publicPath.startsWith(prefix))) {
    return
  }

  const publicDir = getPublicDir()
  const absolutePath = path.resolve(publicDir, publicPath.replace(/^\/+/, ''))
  if (!absolutePath.startsWith(publicDir + path.sep)) {
    return
  }

  try {
    await unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Impossible de supprimer le fichier', absolutePath, error)
    }
  }
}

export const removePublicDir = async (publicSubdir: string): Promise<void> => {
  const segments = sanitizeSubdir(publicSubdir)
  if (segments.length === 0) {
    return
  }
  await rm(path.join(getPublicDir(), ...segments), { recursive: true, force: true })
}
