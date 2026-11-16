import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPublicDir } from '@/lib/uploads'

// Next.js ne sert que les fichiers de public/ présents au démarrage : les images envoyées
// ensuite par l'admin sont donc servies par l'application elle-même.

export type UploadRoot = 'galerie' | 'evenements' | 'staff'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Noms générés par saveUploadedFile : <base assainie>-<horodatage>-<uuid6>.<ext>
const FILE = /^[A-Za-z0-9_-]+\.(jpg|png|webp|gif)$/
const ROOTS: readonly string[] = ['galerie', 'evenements', 'staff']
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const notFound = () => new Response('Not found', { status: 404 })

export const serveUpload = async (root: UploadRoot, slug: string, file: string): Promise<Response> => {
  if (!ROOTS.includes(root) || !SLUG.test(slug)) return notFound()
  const match = FILE.exec(file)
  if (!match) return notFound()

  const publicDir = getPublicDir()
  const absolute = path.join(publicDir, root, slug, file)
  if (!absolute.startsWith(publicDir + path.sep)) return notFound()

  let data: Buffer
  try {
    data = await readFile(absolute)
  } catch {
    return notFound()
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[match[1]],
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
