import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  IMAGE_MAX_BYTES,
  isAllowedImage,
  removePublicDir,
  removePublicFile,
  saveUploadedFile,
} from './uploads'

const MAGIC: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  'image/gif': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
}
const img = (name = 'a.png', type = 'image/png') =>
  new File([new Uint8Array([...MAGIC[type], 1, 2, 3])], name, { type })

let root: string
let publicDir: string

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'uploads-test-'))
  publicDir = path.join(root, 'public')
  process.env.PUBLIC_DIR = publicDir
})

afterEach(() => {
  delete process.env.PUBLIC_DIR
  rmSync(root, { recursive: true, force: true })
})

describe('isAllowedImage', () => {
  it('accepte jpeg, png, webp et gif', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(isAllowedImage(new File(['x'], 'a.img', { type }))).toBe(true)
    }
  })

  it('refuse un pdf et un svg', () => {
    expect(isAllowedImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false)
    expect(isAllowedImage(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).toBe(false)
  })

  it('refuse un fichier trop gros', () => {
    const big = new File([new Uint8Array(IMAGE_MAX_BYTES + 1)], 'a.png', { type: 'image/png' })
    expect(isAllowedImage(big)).toBe(false)
  })
})

describe('saveUploadedFile', () => {
  it('écrit sous public/<subdir> avec un nom généré', async () => {
    const file = img('photo.PNG')
    const { publicPath } = await saveUploadedFile(file, 'galerie/test', 'cover')
    expect(publicPath).toMatch(/^\/galerie\/test\/cover-\d+-[0-9a-f]{6}\.png$/)
    expect(existsSync(path.join(publicDir, publicPath))).toBe(true)
  })

  it('neutralise les ../ dans baseName et subdir', async () => {
    const file = img('photo.png')
    const { publicPath } = await saveUploadedFile(file, 'galerie/test', '../../etc')
    expect(publicPath.startsWith('/galerie/test/')).toBe(true)
    expect(publicPath).not.toContain('..')

    const evil = await saveUploadedFile(file, '../../outside', 'x')
    expect(evil.publicPath).not.toContain('..')
    expect(existsSync(path.join(root, 'outside'))).toBe(false)
    expect(path.resolve(publicDir, evil.publicPath.slice(1)).startsWith(publicDir + path.sep)).toBe(true)
  })
})

describe('saveUploadedFile : sécurité du type', () => {
  it('dérive l’extension du type MIME, pas du nom', async () => {
    const { publicPath } = await saveUploadedFile(img('x.html'), 'evenements/t', 'b')
    expect(publicPath).toMatch(/\.png$/)
    expect(existsSync(path.join(publicDir, publicPath))).toBe(true)
    const jpg = await saveUploadedFile(img('x.svg', 'image/jpeg'), 'evenements/t', 'b')
    expect(jpg.publicPath).toMatch(/\.jpg$/)
  })

  it('refuse un fichier déclaré png dont le contenu est du HTML, sans rien écrire', async () => {
    const html = new File(['<script>alert(1)</script>'], 'x.png', { type: 'image/png' })
    await expect(saveUploadedFile(html, 'evenements/t', 'b')).rejects.toThrow()
    expect(existsSync(path.join(publicDir, 'evenements'))).toBe(false)
  })

  it('refuse image/svg+xml et un type absent', async () => {
    const svg = new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })
    await expect(saveUploadedFile(svg, 'evenements/t', 'b')).rejects.toThrow()
    await expect(saveUploadedFile(new File(['x'], 'a.png'), 'evenements/t', 'b')).rejects.toThrow()
    expect(existsSync(path.join(publicDir, 'evenements'))).toBe(false)
  })
})

describe('removePublicFile', () => {
  it('supprime un fichier sous un préfixe autorisé', async () => {
    const { publicPath } = await saveUploadedFile(img('a.png'), 'galerie/a', 'img')
    await removePublicFile(publicPath, ['/galerie/'])
    expect(existsSync(path.join(publicDir, publicPath))).toBe(false)
  })

  it('refuse les chemins avec .. et hors préfixe', async () => {
    const target = path.join(root, 'package.json')
    writeFileSync(target, '{}')
    await removePublicFile('/galerie/../../package.json', ['/galerie/'])
    expect(existsSync(target)).toBe(true)

    const { publicPath } = await saveUploadedFile(img('a.png'), 'staff', 'img')
    await removePublicFile(publicPath, ['/galerie/'])
    expect(existsSync(path.join(publicDir, publicPath))).toBe(true)
  })

  it('ignore null, undefined et fichier absent', async () => {
    await expect(removePublicFile(null, ['/galerie/'])).resolves.toBeUndefined()
    await expect(removePublicFile(undefined, ['/galerie/'])).resolves.toBeUndefined()
    await expect(removePublicFile('/galerie/nope.png', ['/galerie/'])).resolves.toBeUndefined()
  })
})

describe('removePublicDir', () => {
  it('supprime le dossier et son contenu', async () => {
    await saveUploadedFile(img('a.png'), 'galerie/album', 'img')
    await removePublicDir('galerie/album')
    expect(existsSync(path.join(publicDir, 'galerie', 'album'))).toBe(false)
  })

  it('ne sort jamais de public/', async () => {
    const outside = path.join(root, 'outside')
    await saveUploadedFile(img('a.png'), 'galerie', 'img')
    writeFileSync(path.join(root, 'keep.txt'), 'k')
    await expect(removePublicDir('../')).rejects.toThrow()
    await expect(removePublicDir('')).rejects.toThrow()
    expect(existsSync(path.join(root, 'keep.txt'))).toBe(true)
    expect(readdirSync(publicDir)).toContain('galerie')
    expect(existsSync(outside)).toBe(false)
  })

  it.each(['staff/..', 'staff/', 'staff', 'staff\\x', 'galerie/%%', 'galerie/.', '', '../'])(
    'refuse %j sans toucher à la racine ni aux voisins',
    async (subdir) => {
      await saveUploadedFile(img('a.png'), 'staff/other', 'img')
      await saveUploadedFile(img('a.png'), 'galerie/album', 'img')
      writeFileSync(path.join(publicDir, 'staff', 'sibling.txt'), 's')
      await expect(removePublicDir(subdir)).rejects.toThrow()
      expect(existsSync(path.join(publicDir, 'staff', 'sibling.txt'))).toBe(true)
      expect(existsSync(path.join(publicDir, 'staff', 'other'))).toBe(true)
      expect(existsSync(path.join(publicDir, 'galerie', 'album'))).toBe(true)
    },
  )

  it('supprime un slug légitime sous staff/ sans toucher au voisin', async () => {
    await saveUploadedFile(img('a.png'), 'staff/some-slug', 'img')
    await saveUploadedFile(img('a.png'), 'staff/other', 'img')
    await removePublicDir('staff/some-slug')
    expect(existsSync(path.join(publicDir, 'staff', 'some-slug'))).toBe(false)
    expect(existsSync(path.join(publicDir, 'staff', 'other'))).toBe(true)
  })
})
