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
    const file = new File(['hello'], 'photo.PNG', { type: 'image/png' })
    const { publicPath } = await saveUploadedFile(file, 'galerie/test', 'cover')
    expect(publicPath).toMatch(/^\/galerie\/test\/cover-\d+-[0-9a-f]{6}\.png$/)
    expect(existsSync(path.join(publicDir, publicPath))).toBe(true)
  })

  it('neutralise les ../ dans baseName et subdir', async () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' })
    const { publicPath } = await saveUploadedFile(file, 'galerie/test', '../../etc')
    expect(publicPath.startsWith('/galerie/test/')).toBe(true)
    expect(publicPath).not.toContain('..')

    const evil = await saveUploadedFile(file, '../../outside', 'x')
    expect(evil.publicPath).not.toContain('..')
    expect(existsSync(path.join(root, 'outside'))).toBe(false)
    expect(path.resolve(publicDir, evil.publicPath.slice(1)).startsWith(publicDir + path.sep)).toBe(true)
  })
})

describe('removePublicFile', () => {
  it('supprime un fichier sous un préfixe autorisé', async () => {
    const { publicPath } = await saveUploadedFile(new File(['x'], 'a.png'), 'galerie/a', 'img')
    await removePublicFile(publicPath, ['/galerie/'])
    expect(existsSync(path.join(publicDir, publicPath))).toBe(false)
  })

  it('refuse les chemins avec .. et hors préfixe', async () => {
    const target = path.join(root, 'package.json')
    writeFileSync(target, '{}')
    await removePublicFile('/galerie/../../package.json', ['/galerie/'])
    expect(existsSync(target)).toBe(true)

    const { publicPath } = await saveUploadedFile(new File(['x'], 'a.png'), 'staff', 'img')
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
    await saveUploadedFile(new File(['x'], 'a.png'), 'galerie/album', 'img')
    await removePublicDir('galerie/album')
    expect(existsSync(path.join(publicDir, 'galerie', 'album'))).toBe(false)
  })

  it('ne sort jamais de public/', async () => {
    const outside = path.join(root, 'outside')
    await saveUploadedFile(new File(['x'], 'a.png'), 'galerie', 'img')
    writeFileSync(path.join(root, 'keep.txt'), 'k')
    await removePublicDir('../')
    await removePublicDir('')
    expect(existsSync(path.join(root, 'keep.txt'))).toBe(true)
    expect(readdirSync(publicDir)).toContain('galerie')
    expect(existsSync(outside)).toBe(false)
  })
})
