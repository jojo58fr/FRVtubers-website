import path from 'node:path'

const DEFAULT_MAGAZINE_DIR = path.join(process.cwd(), 'public', 'magazines')

export const MAGAZINE_DIR = path.resolve(
  process.env.MAGAZINE_UPLOAD_DIR || DEFAULT_MAGAZINE_DIR,
)

export const MAGAZINE_COVER_DIR = path.join(MAGAZINE_DIR, 'covers')

export const toMagazinePublicPath = (absolutePath: string) => {
  const relativePath = path.relative(MAGAZINE_DIR, absolutePath)

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Le fichier du magazine se trouve hors du répertoire de stockage.')
  }

  return `/magazines/${relativePath.replace(/\\/g, '/')}`
}

export const resolveMagazinePath = (segments: string[]) => {
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('/') ||
        segment.includes('\\') ||
        segment.includes('\0'),
    )
  ) {
    return null
  }

  const absolutePath = path.resolve(MAGAZINE_DIR, ...segments)
  const relativePath = path.relative(MAGAZINE_DIR, absolutePath)

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  return absolutePath
}
