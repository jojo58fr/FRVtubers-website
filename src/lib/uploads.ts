import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// Résolu à chaque appel pour pouvoir être surchargé (PUBLIC_DIR) dans les tests.
export const getPublicDir = () => path.resolve(process.env.PUBLIC_DIR || path.join(process.cwd(), 'public'))

export class InvalidUploadError extends Error {}

// Extension dérivée UNIQUEMENT du type MIME autorisé, jamais du nom envoyé par le client.
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const startsWithBytes = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((b, i) => buffer[offset + i] === b)

// Vérification légère des octets de tête par rapport au type déclaré.
const matchesMagic = (type: string, buffer: Buffer): boolean => {
  switch (type) {
    case 'image/png':
      return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47])
    case 'image/jpeg':
      return startsWithBytes(buffer, [0xff, 0xd8, 0xff])
    case 'image/gif':
      return startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38])
    case 'image/webp':
      return startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWithBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8)
    default:
      return false
  }
}

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

  const extension = EXTENSION_BY_TYPE[file.type]
  if (!extension) {
    throw new InvalidUploadError('Type de fichier non autorisé')
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!matchesMagic(file.type, buffer)) {
    throw new InvalidUploadError('Le contenu du fichier ne correspond pas à son type')
  }

  const safeBase = sanitizeName(baseName) || 'file'
  const filename = `${safeBase}-${Date.now()}-${randomUUID().slice(0, 6)}${extension}`

  const directory = path.join(getPublicDir(), ...segments)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, filename), buffer)

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

// Supprime un sous-dossier d'un dossier racine (ex. "staff/<slug>"). Garde-fou : au moins deux
// segments, tous déjà "propres" (identiques à leur version assainie). Sinon un slug invalide
// ("..", "", "%%") pourrait se réduire à la racine et effacer tout un dossier d'uploads.
export const removePublicDir = async (publicSubdir: string): Promise<void> => {
  const raw = publicSubdir.split('/')
  const clean = raw.every((segment) => segment !== '' && segment === sanitizeName(segment))
  if (raw.length < 2 || !clean) {
    throw new Error('Sous-dossier à supprimer invalide')
  }
  await rm(path.join(getPublicDir(), ...raw), { recursive: true, force: true })
}
