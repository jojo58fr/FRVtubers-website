import { existsSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_FILES_PER_UPLOAD,
  addPhotos,
  deletePhoto,
  movePhoto,
  updatePhoto,
} from '@/lib/admin-photos'
import prisma from '@/lib/prisma'

let publicDir: string

beforeEach(async () => {
  publicDir = await mkdtemp(path.join(os.tmpdir(), 'admin-photos-'))
  process.env.PUBLIC_DIR = publicDir
})

afterEach(async () => {
  await prisma.event.deleteMany()
  await rm(publicDir, { recursive: true, force: true })
  delete process.env.PUBLIC_DIR
})

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const png = (name = 'a.png', size = 16) =>
  new File([new Uint8Array([...PNG_MAGIC, ...new Array(size - PNG_MAGIC.length).fill(0)])], name, {
    type: 'image/png',
  })

const makeEvent = async (slug = 'genesis-2026') =>
  prisma.event.create({
    data: { slug, title: slug, type: 'GENESIS', startsAt: new Date('2026-07-01T00:00:00Z'), blocks: [] },
  })

const ls = async (rel: string) => {
  try {
    return await readdir(path.join(publicDir, rel))
  } catch {
    return []
  }
}

const added = async (eventId: string, files: File[]) => {
  const res = await addPhotos(eventId, files)
  if (!res.ok) throw new Error(`add failed: ${res.error}`)
  return res
}

const photosOf = (eventId: string) =>
  prisma.photo.findMany({ where: { eventId }, orderBy: { sortOrder: 'asc' } })

describe('addPhotos', () => {
  it('saves valid files and lists the refused ones without stopping', async () => {
    const event = await makeEvent()
    const pdf = new File([new Uint8Array(8)], 'doc.pdf', { type: 'application/pdf' })
    const fake = new File(['<html></html>'], 'fake.png', { type: 'image/png' })
    const res = await added(event.id, [png('one.png'), pdf, fake, png('two.png')])
    expect(res.saved).toBe(2)
    expect(res.refused).toEqual([
      { name: 'doc.pdf', reason: 'type' },
      { name: 'fake.png', reason: 'content' },
    ])
    expect(await prisma.photo.count({ where: { eventId: event.id } })).toBe(2)
    expect(await ls('galerie/genesis-2026')).toHaveLength(2)
  })

  it('stores files under galerie/<slug>/ and continues sortOrder after the max', async () => {
    const event = await makeEvent()
    await prisma.photo.create({ data: { eventId: event.id, path: '/galerie/genesis-2026/x.png', sortOrder: 7 } })
    await added(event.id, [png('a.png'), png('b.png')])
    const rows = await photosOf(event.id)
    expect(rows.map((r) => r.sortOrder)).toEqual([7, 8, 9])
    for (const row of rows.slice(1)) {
      expect(row.path.startsWith('/galerie/genesis-2026/')).toBe(true)
      expect(existsSync(path.join(publicDir, row.path))).toBe(true)
    }
  })

  it('starts at 0 for an event without photos', async () => {
    const event = await makeEvent()
    await added(event.id, [png()])
    expect((await photosOf(event.id)).map((r) => r.sortOrder)).toEqual([0])
  })

  it('refuses oversize files', async () => {
    const event = await makeEvent()
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    const res = await added(event.id, [big, png('ok.png')])
    expect(res.saved).toBe(1)
    expect(res.refused).toEqual([{ name: 'big.png', reason: 'size' }])
  })

  it('caps the number of files per request and reports the rest as refused', async () => {
    const event = await makeEvent()
    const files = Array.from({ length: MAX_FILES_PER_UPLOAD + 2 }, (_, i) => png(`p${i}.png`))
    const res = await added(event.id, files)
    expect(res.saved).toBe(MAX_FILES_PER_UPLOAD)
    expect(res.refused).toEqual([
      { name: `p${MAX_FILES_PER_UPLOAD}.png`, reason: 'too-many' },
      { name: `p${MAX_FILES_PER_UPLOAD + 1}.png`, reason: 'too-many' },
    ])
    expect(await prisma.photo.count()).toBe(MAX_FILES_PER_UPLOAD)
  }, 60_000)

  it('returns not-found for an unknown event and writes nothing', async () => {
    expect(await addPhotos('nope', [png()])).toEqual({ ok: false, error: 'not-found' })
    expect(await ls('galerie')).toEqual([])
  })

  it('returns no-files when nothing usable is sent', async () => {
    const event = await makeEvent()
    expect(await addPhotos(event.id, [])).toEqual({ ok: false, error: 'no-files' })
  })
})

describe('updatePhoto', () => {
  it('trims, turns empty into null and caps lengths server-side', async () => {
    const event = await makeEvent()
    await added(event.id, [png()])
    const [photo] = await photosOf(event.id)

    let res = await updatePhoto(event.id, photo.id, { caption: '  Belle photo  ', photographer: '   ' })
    expect(res.ok).toBe(true)
    let row = await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })
    expect(row.caption).toBe('Belle photo')
    expect(row.photographer).toBeNull()

    res = await updatePhoto(event.id, photo.id, { caption: 'c'.repeat(500), photographer: 'p'.repeat(200) })
    expect(res.ok).toBe(true)
    row = await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })
    expect(row.caption).toHaveLength(300)
    expect(row.photographer).toHaveLength(100)
  })

  it('rejects a photo of another event', async () => {
    const a = await makeEvent('a')
    const b = await makeEvent('b')
    await added(b.id, [png()])
    const [photo] = await photosOf(b.id)
    expect(await updatePhoto(a.id, photo.id, { caption: 'hack', photographer: '' })).toEqual({
      ok: false,
      error: 'not-found',
    })
    expect((await prisma.photo.findUniqueOrThrow({ where: { id: photo.id } })).caption).toBeNull()
  })

  it('returns not-found for unknown event or photo', async () => {
    const event = await makeEvent()
    expect(await updatePhoto('nope', 'x', { caption: '', photographer: '' })).toEqual({ ok: false, error: 'not-found' })
    expect(await updatePhoto(event.id, 'x', { caption: '', photographer: '' })).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('movePhoto', () => {
  it('swaps sortOrder with the neighbour and is a no-op at boundaries', async () => {
    const event = await makeEvent()
    await added(event.id, [png('a.png'), png('b.png'), png('c.png')])
    const [p0, p1, p2] = await photosOf(event.id)

    expect(await movePhoto(event.id, p1.id, 'up')).toEqual({ ok: true })
    expect((await photosOf(event.id)).map((r) => r.id)).toEqual([p1.id, p0.id, p2.id])

    expect(await movePhoto(event.id, p1.id, 'up')).toEqual({ ok: true })
    expect((await photosOf(event.id)).map((r) => r.id)).toEqual([p1.id, p0.id, p2.id])

    expect(await movePhoto(event.id, p1.id, 'down')).toEqual({ ok: true })
    expect((await photosOf(event.id)).map((r) => r.id)).toEqual([p0.id, p1.id, p2.id])

    expect(await movePhoto(event.id, p2.id, 'down')).toEqual({ ok: true })
    expect((await photosOf(event.id)).map((r) => r.id)).toEqual([p0.id, p1.id, p2.id])
  })

  it('swaps correctly even when sortOrder values are equal', async () => {
    const event = await makeEvent()
    const x = await prisma.photo.create({ data: { eventId: event.id, path: '/galerie/genesis-2026/x.png', sortOrder: 0 } })
    const y = await prisma.photo.create({ data: { eventId: event.id, path: '/galerie/genesis-2026/y.png', sortOrder: 0 } })
    expect(await movePhoto(event.id, y.id, 'up')).toEqual({ ok: true })
    const rows = await photosOf(event.id)
    expect(new Set(rows.map((r) => r.sortOrder)).size).toBe(2)
    expect(rows[0].id).toBe(y.id)
    expect(x.id).toBe(rows[1].id)
  })

  it('rejects a photo of another event without changing anything', async () => {
    const a = await makeEvent('a')
    const b = await makeEvent('b')
    await added(b.id, [png(), png()])
    const before = await photosOf(b.id)
    expect(await movePhoto(a.id, before[0].id, 'down')).toEqual({ ok: false, error: 'not-found' })
    expect((await photosOf(b.id)).map((r) => r.id)).toEqual(before.map((r) => r.id))
  })
})

describe('deletePhoto', () => {
  it('removes the row and the file', async () => {
    const event = await makeEvent()
    await added(event.id, [png()])
    const [photo] = await photosOf(event.id)
    expect(await deletePhoto(event.id, photo.id)).toEqual({ ok: true })
    expect(await prisma.photo.count()).toBe(0)
    expect(existsSync(path.join(publicDir, photo.path))).toBe(false)
  })

  it('cannot delete a photo of another event and its file survives', async () => {
    const a = await makeEvent('a')
    const b = await makeEvent('b')
    await added(b.id, [png()])
    const [photo] = await photosOf(b.id)
    expect(await deletePhoto(a.id, photo.id)).toEqual({ ok: false, error: 'not-found' })
    expect(await prisma.photo.count()).toBe(1)
    expect(existsSync(path.join(publicDir, photo.path))).toBe(true)
  })

  it('returns not-found for an unknown event', async () => {
    expect(await deletePhoto('nope', 'x')).toEqual({ ok: false, error: 'not-found' })
  })
})
