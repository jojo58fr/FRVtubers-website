import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEvent, deleteEvent, updateEvent, type EventInput } from '@/lib/admin-events'
import prisma from '@/lib/prisma'

let publicDir: string

beforeEach(async () => {
  publicDir = await mkdtemp(path.join(os.tmpdir(), 'admin-events-'))
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

const base = (over: Partial<EventInput> = {}): EventInput => ({
  title: 'Genesis Été 2026',
  type: 'GENESIS',
  startsAt: '2026-07-01',
  endsAt: '',
  summary: '',
  hasArticle: true,
  published: false,
  blocksJson: null,
  ...over,
})

const ls = async (rel: string) => {
  try {
    return await readdir(path.join(publicDir, rel))
  } catch {
    return []
  }
}

const created = async (over: Partial<EventInput> = {}, files = {}) => {
  const res = await createEvent(base(over), files)
  if (!res.ok) throw new Error(`create failed: ${res.error}`)
  return res.event
}

describe('createEvent', () => {
  it('creates a draft with a slug derived from the title', async () => {
    const event = await created({ published: false })
    expect(event.published).toBe(false)
    expect(event.slug).toBe('genesis-ete-2026')
    expect(event.type).toBe('GENESIS')
  })

  it('rejects a duplicate slug with an error code', async () => {
    await created()
    const res = await createEvent(base(), {})
    expect(res).toEqual({ ok: false, error: 'duplicate-slug' })
    expect(await prisma.event.count()).toBe(1)
  })

  it('rejects missing title, bad type and bad dates', async () => {
    expect(await createEvent(base({ title: '  ' }), {})).toEqual({ ok: false, error: 'missing-title' })
    expect(await createEvent(base({ type: 'NOPE' }), {})).toEqual({ ok: false, error: 'invalid-type' })
    expect(await createEvent(base({ startsAt: '' }), {})).toEqual({ ok: false, error: 'invalid-date' })
  })

  it('rejects endsAt before startsAt', async () => {
    const res = await createEvent(base({ endsAt: '2026-06-30' }), {})
    expect(res).toEqual({ ok: false, error: 'end-before-start' })
    expect(await prisma.event.count()).toBe(0)
  })

  it('rejects an oversize or non-image cover and writes nothing', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    expect(await createEvent(base(), { cover: big })).toEqual({ ok: false, error: 'invalid-image' })
    const pdf = new File([new Uint8Array(8)], 'x.pdf', { type: 'application/pdf' })
    expect(await createEvent(base(), { cover: pdf })).toEqual({ ok: false, error: 'invalid-image' })
    expect(await prisma.event.count()).toBe(0)
    expect(await ls('evenements')).toEqual([])
  })

  it('rejects an upload whose bytes do not match its type and writes nothing', async () => {
    const fake = new File(['<html></html>'], 'x.png', { type: 'image/png' })
    expect(await createEvent(base(), { cover: fake })).toEqual({ ok: false, error: 'invalid-image' })
    const blocks = [{ id: 'img1', type: 'image', path: '' }]
    const res = await createEvent(base({ blocksJson: JSON.stringify(blocks) }), { blockImages: { img1: fake } })
    expect(res).toEqual({ ok: false, error: 'invalid-image' })
    expect(await prisma.event.count()).toBe(0)
    expect(await ls('evenements')).toEqual([])
  })

  it('stores the cover under evenements/<slug>/', async () => {
    const event = await created({}, { cover: png('cover.png') })
    expect(event.coverImagePath).toMatch(/^\/evenements\/genesis-ete-2026\/cover-/)
    expect((await ls('evenements/genesis-ete-2026')).length).toBe(1)
  })

  it('reports invalid block JSON without crashing', async () => {
    expect(await createEvent(base({ blocksJson: '{oops' }), {})).toEqual({ ok: false, error: 'invalid-blocks' })
    expect(await createEvent(base({ blocksJson: '{"a":1}' }), {})).toEqual({ ok: false, error: 'invalid-blocks' })
    expect(await prisma.event.count()).toBe(0)
  })

  it('drops a button block with a javascript: url', async () => {
    const blocks = [
      { id: 'b1', type: 'button', label: 'Hack', url: 'javascript:alert(1)' },
      { id: 'b2', type: 'button', label: 'OK', url: 'https://example.com' },
    ]
    const event = await created({ blocksJson: JSON.stringify(blocks) })
    expect(event.blocks).toEqual([{ id: 'b2', type: 'button', label: 'OK', url: 'https://example.com' }])
  })

  it('saves block images under evenements/<slug>/ and stores the public path', async () => {
    const blocks = [{ id: 'img1', type: 'image', path: '', caption: 'Cap' }]
    const event = await created(
      { blocksJson: JSON.stringify(blocks) },
      { blockImages: { img1: png('photo.png') } },
    )
    const stored = event.blocks as Array<{ path: string }>
    expect(stored).toHaveLength(1)
    expect(stored[0].path.startsWith('/evenements/genesis-ete-2026/')).toBe(true)
    expect(existsSync(path.join(publicDir, stored[0].path))).toBe(true)
  })

  it('rejects an invalid block image and writes nothing', async () => {
    const blocks = [{ id: 'img1', type: 'image', path: '' }]
    const pdf = new File([new Uint8Array(8)], 'x.pdf', { type: 'application/pdf' })
    const res = await createEvent(base({ blocksJson: JSON.stringify(blocks) }), { blockImages: { img1: pdf } })
    expect(res).toEqual({ ok: false, error: 'invalid-image' })
    expect(await ls('evenements')).toEqual([])
  })

  it('does not trust image block paths pointing outside the event folder', async () => {
    const blocks = [{ id: 'img1', type: 'image', path: '/evenements/other/secret.png' }]
    const event = await created({ blocksJson: JSON.stringify(blocks) })
    expect(event.blocks).toEqual([])
  })
})

describe('updateEvent', () => {
  it('never changes the slug', async () => {
    const event = await created()
    const res = await updateEvent(event.id, base({ title: 'Titre totalement différent' }), {})
    expect(res.ok).toBe(true)
    const row = await prisma.event.findUniqueOrThrow({ where: { id: event.id } })
    expect(row.slug).toBe('genesis-ete-2026')
    expect(row.title).toBe('Titre totalement différent')
  })

  it('returns not-found for an unknown id', async () => {
    expect(await updateEvent('nope', base(), {})).toEqual({ ok: false, error: 'not-found' })
  })

  it('rejects endsAt before startsAt', async () => {
    const event = await created()
    const res = await updateEvent(event.id, base({ endsAt: '2026-06-01' }), {})
    expect(res).toEqual({ ok: false, error: 'end-before-start' })
  })

  it('replaces the cover and deletes the old file', async () => {
    const event = await created({}, { cover: png('one.png') })
    const [oldFile] = await ls('evenements/genesis-ete-2026')
    const res = await updateEvent(event.id, base(), { cover: png('two.png') })
    expect(res.ok).toBe(true)
    const files = await ls('evenements/genesis-ete-2026')
    expect(files).toHaveLength(1)
    expect(files[0]).not.toBe(oldFile)
  })

  it('keeps the old cover when the new one is invalid', async () => {
    const event = await created({}, { cover: png('one.png') })
    const bad = new File([new Uint8Array(8)], 'x.txt', { type: 'text/plain' })
    expect(await updateEvent(event.id, base(), { cover: bad })).toEqual({ ok: false, error: 'invalid-image' })
    expect(await ls('evenements/genesis-ete-2026')).toHaveLength(1)
  })

  it('deletes a block image no longer referenced, keeps referenced ones', async () => {
    const event = await created(
      {
        blocksJson: JSON.stringify([
          { id: 'i1', type: 'image', path: '' },
          { id: 'i2', type: 'image', path: '' },
        ]),
      },
      { blockImages: { i1: png('one.png'), i2: png('two.png') } },
    )
    const stored = event.blocks as Array<{ id: string; path: string }>
    expect(await ls('evenements/genesis-ete-2026')).toHaveLength(2)

    const res = await updateEvent(event.id, base({ blocksJson: JSON.stringify([stored[1]]) }), {})
    expect(res.ok).toBe(true)
    expect(existsSync(path.join(publicDir, stored[0].path))).toBe(false)
    expect(existsSync(path.join(publicDir, stored[1].path))).toBe(true)
  })

  it('replacing the file of an image block deletes the old file', async () => {
    const event = await created(
      { blocksJson: JSON.stringify([{ id: 'i1', type: 'image', path: '' }]) },
      { blockImages: { i1: png('one.png') } },
    )
    const stored = event.blocks as Array<{ id: string; path: string }>
    const res = await updateEvent(event.id, base({ blocksJson: JSON.stringify(stored) }), {
      blockImages: { i1: png('new.png') },
    })
    expect(res.ok).toBe(true)
    expect(existsSync(path.join(publicDir, stored[0].path))).toBe(false)
    expect(await ls('evenements/genesis-ete-2026')).toHaveLength(1)
  })

  it('keeps stored blocks and their files when hasArticle is unchecked, restoring them on re-check', async () => {
    const event = await created(
      { blocksJson: JSON.stringify([{ id: 'i1', type: 'image', path: '' }]) },
      { blockImages: { i1: png('one.png') } },
    )
    const stored = event.blocks as Array<{ id: string; path: string }>

    // Unchecked: editor absent, so no blocks JSON; even a stray one is ignored.
    const res = await updateEvent(event.id, base({ hasArticle: false, blocksJson: '[]' }), {})
    expect(res.ok).toBe(true)
    const row = await prisma.event.findUniqueOrThrow({ where: { id: event.id } })
    expect(row.hasArticle).toBe(false)
    expect(row.blocks).toEqual(stored)
    expect(existsSync(path.join(publicDir, stored[0].path))).toBe(true)

    // Re-checked without submitting blocks: still there.
    await updateEvent(event.id, base({ hasArticle: true, blocksJson: null }), {})
    const again = await prisma.event.findUniqueOrThrow({ where: { id: event.id } })
    expect(again.blocks).toEqual(stored)
  })
})

describe('server-side caps and ignored blocks', () => {
  it('caps title, summary and slug length', async () => {
    const res = await createEvent(base({ title: 'a'.repeat(5000), summary: 'b'.repeat(5000) }), {})
    if (!res.ok) throw new Error(res.error)
    expect(res.event.title).toHaveLength(200)
    expect(res.event.summary).toHaveLength(500)
    expect(res.event.slug.length).toBeLessThanOrEqual(80)
    expect(res.event.slug.endsWith('-')).toBe(false)
  })

  it('does not leave a trailing dash when the cut falls on a separator', async () => {
    const title = `${'a'.repeat(79)} ${'b'.repeat(50)}`
    const res = await createEvent(base({ title }), {})
    if (!res.ok) throw new Error(res.error)
    expect(res.event.slug).toBe('a'.repeat(79))
  })

  it('reports the number of ignored blocks on create and update', async () => {
    const blocks = [
      { id: 'a', type: 'paragraph', text: 'ok' },
      { id: 'b', type: 'paragraph', text: '   ' },
      { id: 'c', type: 'video', url: 'javascript:alert(1)' },
    ]
    const res = await createEvent(base({ blocksJson: JSON.stringify(blocks) }), {})
    if (!res.ok) throw new Error(res.error)
    expect(res.ignoredBlocks).toBe(2)
    const upd = await updateEvent(res.event.id, base({ blocksJson: JSON.stringify(blocks) }), {})
    if (!upd.ok) throw new Error(upd.error)
    expect(upd.ignoredBlocks).toBe(2)
    const clean = await updateEvent(res.event.id, base({ blocksJson: JSON.stringify(blocks.slice(0, 1)) }), {})
    if (!clean.ok) throw new Error(clean.error)
    expect(clean.ignoredBlocks).toBe(0)
  })
})

describe('deleteEvent', () => {
  it('removes the row, its photos and both directories', async () => {
    const event = await created({}, { cover: png('c.png') })
    await prisma.photo.create({ data: { eventId: event.id, path: '/galerie/genesis-ete-2026/p.jpg' } })
    await mkdir(path.join(publicDir, 'galerie', 'genesis-ete-2026'), { recursive: true })
    await writeFile(path.join(publicDir, 'galerie', 'genesis-ete-2026', 'p.jpg'), 'x')
    await mkdir(path.join(publicDir, 'galerie', 'autre'), { recursive: true })

    expect(await deleteEvent(event.id)).toEqual({ ok: true })
    expect(await prisma.event.count()).toBe(0)
    expect(await prisma.photo.count()).toBe(0)
    expect(existsSync(path.join(publicDir, 'galerie', 'genesis-ete-2026'))).toBe(false)
    expect(existsSync(path.join(publicDir, 'evenements', 'genesis-ete-2026'))).toBe(false)
    expect(existsSync(path.join(publicDir, 'galerie', 'autre'))).toBe(true)
  })

  it('returns not-found for an unknown id', async () => {
    expect(await deleteEvent('nope')).toEqual({ ok: false, error: 'not-found' })
  })
})
