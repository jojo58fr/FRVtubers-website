import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { serveUpload } from './serve-upload'

let root: string
const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'serve-test-'))
  process.env.PUBLIC_DIR = path.join(root, 'public')
  mkdirSync(path.join(root, 'public', 'galerie', 'ev-1'), { recursive: true })
  writeFileSync(path.join(root, 'public', 'galerie', 'ev-1', 'photo-1700000000-abc123.png'), bytes)
  writeFileSync(path.join(root, 'public', 'galerie', 'ev-1', 'page.html'), '<script>1</script>')
  writeFileSync(path.join(root, 'secret.png'), bytes)
})
afterEach(() => {
  delete process.env.PUBLIC_DIR
  rmSync(root, { recursive: true, force: true })
})

describe('serveUpload', () => {
  it('serves an existing image with safe headers', async () => {
    const res = await serveUpload('galerie', 'ev-1', 'photo-1700000000-abc123.png')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'")
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes)
  })

  it.each([
    ['..', 'secret.png'],
    ['ev-1', '../../secret.png'],
    ['ev-1', '..%2F..%2Fsecret.png'],
    ['ev-1', '%2e%2e.png'],
    ['ev-1', 'a/b.png'],
    ['ev-1', 'a\b.png'],
    ['ev-1', '..png'],
    ['ev-1', 'page.html'],
    ['ev-1', 'x.svg'],
    ['ev-1', 'missing-1-abcdef.png'],
    ['Bad_Slug', 'photo-1700000000-abc123.png'],
    ['ev-1/..', 'photo-1700000000-abc123.png'],
    ['', 'photo-1700000000-abc123.png'],
  ])('returns 404 for slug=%s file=%s', async (slug, file) => {
    const res = await serveUpload('galerie', slug, file)
    expect(res.status).toBe(404)
  })

  it('returns 404 for a wrong root and an invalid root', async () => {
    expect((await serveUpload('staff', 'ev-1', 'photo-1700000000-abc123.png')).status).toBe(404)
    expect((await serveUpload('..' as never, 'ev-1', 'photo-1700000000-abc123.png')).status).toBe(404)
  })
})
