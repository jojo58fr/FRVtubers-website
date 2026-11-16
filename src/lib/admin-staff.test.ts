import { existsSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_CONTRIBUTIONS_PER_MEMBER,
  MAX_LINKS_PER_MEMBER,
  addContribution,
  createMember,
  deleteContribution,
  deleteMember,
  moveContribution,
  moveMember,
  updateContribution,
  updateMember,
  type ContributionInput,
  type MemberInput,
} from '@/lib/admin-staff'
import prisma from '@/lib/prisma'

let publicDir: string

beforeEach(async () => {
  publicDir = await mkdtemp(path.join(os.tmpdir(), 'admin-staff-'))
  process.env.PUBLIC_DIR = publicDir
})

afterEach(async () => {
  await prisma.staffMember.deleteMany()
  await prisma.event.deleteMany()
  await rm(publicDir, { recursive: true, force: true })
  delete process.env.PUBLIC_DIR
})

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const png = (name = 'a.png', size = 16) =>
  new File([new Uint8Array([...PNG_MAGIC, ...new Array(size - PNG_MAGIC.length).fill(0)])], name, {
    type: 'image/png',
  })

const ls = async (rel: string) => {
  try {
    return await readdir(path.join(publicDir, rel))
  } catch {
    return []
  }
}

const member = (over: Partial<MemberInput> = {}): MemberInput => ({
  name: 'Aka Setsuko',
  title: 'Modératrice',
  bio: 'Bio',
  links: [],
  isActive: true,
  published: false,
  ...over,
})

const contribution = (over: Partial<ContributionInput> = {}): ContributionInput => ({
  text: 'Organisation Genesis',
  year: '2026',
  eventId: '',
  ...over,
})

const created = async (over: Partial<MemberInput> = {}, photo: File | null = null) => {
  const res = await createMember(member(over), photo)
  if (!res.ok) throw new Error(`create failed: ${res.error}`)
  return res.member
}

const makeEvent = (slug = 'genesis-2026', published = false) =>
  prisma.event.create({
    data: { slug, title: slug, type: 'GENESIS', startsAt: new Date('2026-07-01T00:00:00Z'), blocks: [], published },
  })

const added = async (memberId: string, over: Partial<ContributionInput> = {}) => {
  const res = await addContribution(memberId, contribution(over))
  if (!res.ok) throw new Error(`add failed: ${res.error}`)
  return res.contribution
}

const contributionsOf = (memberId: string) =>
  prisma.staffContribution.findMany({ where: { memberId }, orderBy: { sortOrder: 'asc' } })

describe('createMember', () => {
  it('is a draft by default when published is false and slugifies the name', async () => {
    const m = await created({ name: 'Éléa Müller' })
    expect(m.published).toBe(false)
    expect(m.slug).toBe('elea-muller')
  })

  it('requires a name', async () => {
    expect(await createMember(member({ name: '   ' }), null)).toEqual({ ok: false, error: 'missing-name' })
    expect(await prisma.staffMember.count()).toBe(0)
  })

  it('rejects a duplicate slug', async () => {
    await created({ name: 'Aka' })
    expect(await createMember(member({ name: 'aka' }), null)).toEqual({ ok: false, error: 'duplicate-slug' })
    expect(await prisma.staffMember.count()).toBe(1)
  })

  it('trims, caps lengths and turns empty optional fields into null', async () => {
    const m = await created({ name: `  ${'n'.repeat(150)}  `, title: 't'.repeat(150), bio: 'b'.repeat(1500) })
    expect(m.name).toHaveLength(100)
    expect(m.title).toHaveLength(100)
    expect(m.bio).toHaveLength(1000)
    const empty = await created({ name: 'Vide', title: '  ', bio: '   ' })
    expect(empty.title).toBe('') // la colonne title n'est pas nullable
    expect(empty.bio).toBeNull()
  })

  it('appends new members at the end of the order', async () => {
    const a = await created({ name: 'A' })
    const b = await created({ name: 'B' })
    expect(b.sortOrder).toBe(a.sortOrder + 1)
  })

  it('stores clean links only and ignores fully blank rows', async () => {
    const m = await created({
      links: [
        { label: '  Twitter  ', url: ' https://twitter.com/aka ' },
        { label: '', url: '' },
      ],
    })
    expect(m.links).toEqual([{ label: 'Twitter', url: 'https://twitter.com/aka' }])
  })

  it('rejects the whole save when a link is unsafe, and writes nothing', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.fr', 'pas une url']) {
      expect(await createMember(member({ links: [{ label: 'x', url }] }), png())).toEqual({
        ok: false,
        error: 'invalid-link',
      })
    }
    expect(await createMember(member({ links: [{ label: '', url: 'https://x.fr' }] }), null)).toEqual({
      ok: false,
      error: 'invalid-link',
    })
    expect(await createMember(member({ links: [{ label: 'x'.repeat(41), url: 'https://x.fr' }] }), null)).toEqual({
      ok: false,
      error: 'invalid-link',
    })
    expect(
      await createMember(member({ links: [{ label: 'x', url: `https://x.fr/${'a'.repeat(300)}` }] }), null),
    ).toEqual({ ok: false, error: 'invalid-link' })
    expect(await prisma.staffMember.count()).toBe(0)
    expect(await ls('staff')).toEqual([])
  })

  it('caps the number of links', async () => {
    const link = { label: 'l', url: 'https://x.fr' }
    const ok = await createMember(member({ links: Array(MAX_LINKS_PER_MEMBER).fill(link) }), null)
    expect(ok.ok).toBe(true)
    expect(
      await createMember(member({ name: 'Autre', links: Array(MAX_LINKS_PER_MEMBER + 1).fill(link) }), null),
    ).toEqual({ ok: false, error: 'too-many-links' })
  })

  it('refuses oversize, non-image and mismatching photos and writes nothing', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    const pdf = new File([new Uint8Array(8)], 'doc.pdf', { type: 'application/pdf' })
    const fake = new File(['<html></html>'], 'fake.png', { type: 'image/png' })
    for (const file of [big, pdf, fake]) {
      expect(await createMember(member(), file)).toEqual({ ok: false, error: 'invalid-image' })
    }
    expect(await prisma.staffMember.count()).toBe(0)
    expect(await ls('staff')).toEqual([])
  })

  it('saves the photo under staff/<slug>/', async () => {
    const m = await created({ name: 'Photo Girl' }, png())
    expect(m.photoPath?.startsWith('/staff/photo-girl/')).toBe(true)
    expect(existsSync(path.join(publicDir, m.photoPath as string))).toBe(true)
  })
})

describe('updateMember', () => {
  it('keeps the slug immutable even when the name changes', async () => {
    const m = await created({ name: 'Ancien Nom' })
    const res = await updateMember(m.id, member({ name: 'Nouveau Nom', published: true }), null)
    expect(res.ok).toBe(true)
    const row = await prisma.staffMember.findUniqueOrThrow({ where: { id: m.id } })
    expect(row.slug).toBe('ancien-nom')
    expect(row.name).toBe('Nouveau Nom')
    expect(row.published).toBe(true)
  })

  it('validates name, links and returns not-found', async () => {
    const m = await created()
    expect(await updateMember(m.id, member({ name: '' }), null)).toEqual({ ok: false, error: 'missing-name' })
    expect(await updateMember(m.id, member({ links: [{ label: 'x', url: 'javascript:1' }] }), null)).toEqual({
      ok: false,
      error: 'invalid-link',
    })
    expect(await updateMember('nope', member(), null)).toEqual({ ok: false, error: 'not-found' })
  })

  it('keeps the existing photo when no new file is sent', async () => {
    const m = await created({}, png())
    await updateMember(m.id, member({ title: 'Autre' }), null)
    const row = await prisma.staffMember.findUniqueOrThrow({ where: { id: m.id } })
    expect(row.photoPath).toBe(m.photoPath)
  })

  it('replaces the photo and deletes the old file', async () => {
    const m = await created({ name: 'Rep' }, png())
    const res = await updateMember(m.id, member({ name: 'Rep' }), png('b.png'))
    expect(res.ok).toBe(true)
    const row = await prisma.staffMember.findUniqueOrThrow({ where: { id: m.id } })
    expect(row.photoPath).not.toBe(m.photoPath)
    expect(row.photoPath?.startsWith('/staff/rep/')).toBe(true)
    expect(existsSync(path.join(publicDir, m.photoPath as string))).toBe(false)
    expect(existsSync(path.join(publicDir, row.photoPath as string))).toBe(true)
    expect(await ls('staff/rep')).toHaveLength(1)
  })

  it('refuses a bad photo, keeping the old one and writing nothing new', async () => {
    const m = await created({ name: 'Keep' }, png())
    const fake = new File(['<html></html>'], 'fake.png', { type: 'image/png' })
    expect(await updateMember(m.id, member({ name: 'Keep' }), fake)).toEqual({ ok: false, error: 'invalid-image' })
    const row = await prisma.staffMember.findUniqueOrThrow({ where: { id: m.id } })
    expect(row.photoPath).toBe(m.photoPath)
    expect(await ls('staff/keep')).toHaveLength(1)
  })
})

describe('deleteMember', () => {
  it('removes the row, its contributions and its directory', async () => {
    const m = await created({ name: 'Bye' }, png())
    await added(m.id)
    await added(m.id, { text: 'Autre' })
    expect(await deleteMember(m.id)).toEqual({ ok: true })
    expect(await prisma.staffMember.count()).toBe(0)
    expect(await prisma.staffContribution.count()).toBe(0)
    expect(existsSync(path.join(publicDir, 'staff', 'bye'))).toBe(false)
  })

  it('returns not-found for an unknown member', async () => {
    expect(await deleteMember('nope')).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('moveMember', () => {
  const orderOf = async () => (await prisma.staffMember.findMany({ orderBy: { sortOrder: 'asc' } })).map((m) => m.name)

  it('swaps with the neighbour and is a no-op at boundaries', async () => {
    const a = await created({ name: 'A' })
    const b = await created({ name: 'B' })
    const c = await created({ name: 'C' })
    expect(await moveMember(b.id, 'up')).toEqual({ ok: true })
    expect(await orderOf()).toEqual(['B', 'A', 'C'])
    expect(await moveMember(b.id, 'up')).toEqual({ ok: true })
    expect(await orderOf()).toEqual(['B', 'A', 'C'])
    expect(await moveMember(b.id, 'down')).toEqual({ ok: true })
    expect(await orderOf()).toEqual(['A', 'B', 'C'])
    expect(await moveMember(c.id, 'down')).toEqual({ ok: true })
    expect(await orderOf()).toEqual(['A', 'B', 'C'])
    expect(a.id).toBeTruthy()
  })

  it('works when sortOrder values are equal', async () => {
    const x = await prisma.staffMember.create({ data: { name: 'X', slug: 'x', title: '', sortOrder: 0 } })
    const y = await prisma.staffMember.create({ data: { name: 'Y', slug: 'y', title: '', sortOrder: 0 } })
    expect(await moveMember(y.id, 'up')).toEqual({ ok: true })
    const rows = await prisma.staffMember.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(new Set(rows.map((r) => r.sortOrder)).size).toBe(2)
    expect(rows[0].id).toBe(y.id)
    expect(rows[1].id).toBe(x.id)
  })

  it('returns not-found for an unknown member', async () => {
    expect(await moveMember('nope', 'up')).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('addContribution', () => {
  it('adds with trimmed text, null year and no event, ordered at the end', async () => {
    const m = await created()
    const c1 = await added(m.id, { text: '  Premier  ', year: '', eventId: '' })
    const c2 = await added(m.id, { text: 'Second', year: '2025' })
    expect(c1.text).toBe('Premier')
    expect(c1.year).toBeNull()
    expect(c1.eventId).toBeNull()
    expect(c2.sortOrder).toBe(c1.sortOrder + 1)
    expect(c2.year).toBe(2025)
  })

  it('requires text and caps it at 200', async () => {
    const m = await created()
    expect(await addContribution(m.id, contribution({ text: '  ' }))).toEqual({ ok: false, error: 'missing-text' })
    const c = await added(m.id, { text: 't'.repeat(300) })
    expect(c.text).toHaveLength(200)
  })

  it('validates the year', async () => {
    const m = await created()
    for (const year of ['1899', '2101', 'abc', '20.5', '-2000', '2026abc']) {
      expect(await addContribution(m.id, contribution({ year }))).toEqual({ ok: false, error: 'invalid-year' })
    }
    expect((await added(m.id, { year: '1900' })).year).toBe(1900)
    expect((await added(m.id, { year: '2100' })).year).toBe(2100)
    expect(await prisma.staffContribution.count()).toBe(2)
  })

  it('links an existing event, even a draft, and rejects an unknown one', async () => {
    const m = await created()
    const draft = await makeEvent('brouillon', false)
    const c = await added(m.id, { eventId: draft.id })
    expect(c.eventId).toBe(draft.id)
    expect(await addContribution(m.id, contribution({ eventId: 'nope' }))).toEqual({
      ok: false,
      error: 'event-not-found',
    })
    expect(await prisma.staffContribution.count()).toBe(1)
  })

  it('returns not-found for an unknown member', async () => {
    expect(await addContribution('nope', contribution())).toEqual({ ok: false, error: 'not-found' })
  })

  it('caps contributions per member', async () => {
    const m = await created()
    await prisma.staffContribution.createMany({
      data: Array.from({ length: MAX_CONTRIBUTIONS_PER_MEMBER }, (_, i) => ({
        memberId: m.id,
        text: `c${i}`,
        sortOrder: i,
      })),
    })
    expect(await addContribution(m.id, contribution())).toEqual({ ok: false, error: 'too-many-contributions' })
  })
})

describe('updateContribution', () => {
  it('updates text, year and event', async () => {
    const m = await created()
    const ev = await makeEvent()
    const c = await added(m.id)
    const res = await updateContribution(m.id, c.id, { text: ' Nouveau ', year: '', eventId: ev.id })
    expect(res.ok).toBe(true)
    const row = await prisma.staffContribution.findUniqueOrThrow({ where: { id: c.id } })
    expect(row).toMatchObject({ text: 'Nouveau', year: null, eventId: ev.id })
  })

  it('validates text, year and event', async () => {
    const m = await created()
    const c = await added(m.id)
    expect(await updateContribution(m.id, c.id, contribution({ text: '' }))).toEqual({ ok: false, error: 'missing-text' })
    expect(await updateContribution(m.id, c.id, contribution({ year: '1800' }))).toEqual({
      ok: false,
      error: 'invalid-year',
    })
    expect(await updateContribution(m.id, c.id, contribution({ eventId: 'nope' }))).toEqual({
      ok: false,
      error: 'event-not-found',
    })
  })

  it('cannot touch a contribution of another member', async () => {
    const a = await created({ name: 'A' })
    const b = await created({ name: 'B' })
    const c = await added(b.id)
    expect(await updateContribution(a.id, c.id, contribution({ text: 'hack' }))).toEqual({
      ok: false,
      error: 'not-found',
    })
    expect((await prisma.staffContribution.findUniqueOrThrow({ where: { id: c.id } })).text).toBe(c.text)
  })
})

describe('deleteContribution', () => {
  it('deletes its own contribution', async () => {
    const m = await created()
    const c = await added(m.id)
    expect(await deleteContribution(m.id, c.id)).toEqual({ ok: true })
    expect(await prisma.staffContribution.count()).toBe(0)
  })

  it('cannot delete a contribution of another member', async () => {
    const a = await created({ name: 'A' })
    const b = await created({ name: 'B' })
    const c = await added(b.id)
    expect(await deleteContribution(a.id, c.id)).toEqual({ ok: false, error: 'not-found' })
    expect(await prisma.staffContribution.count()).toBe(1)
  })
})

describe('moveContribution', () => {
  const textsOf = async (memberId: string) => (await contributionsOf(memberId)).map((c) => c.text)

  it('swaps with the neighbour and is a no-op at boundaries', async () => {
    const m = await created()
    await added(m.id, { text: 'a' })
    const b = await added(m.id, { text: 'b' })
    const c = await added(m.id, { text: 'c' })
    expect(await moveContribution(m.id, b.id, 'up')).toEqual({ ok: true })
    expect(await textsOf(m.id)).toEqual(['b', 'a', 'c'])
    expect(await moveContribution(m.id, b.id, 'up')).toEqual({ ok: true })
    expect(await textsOf(m.id)).toEqual(['b', 'a', 'c'])
    expect(await moveContribution(m.id, c.id, 'down')).toEqual({ ok: true })
    expect(await textsOf(m.id)).toEqual(['b', 'a', 'c'])
    expect(await moveContribution(m.id, b.id, 'down')).toEqual({ ok: true })
    expect(await textsOf(m.id)).toEqual(['a', 'b', 'c'])
  })

  it('works when sortOrder values are equal', async () => {
    const m = await created()
    await prisma.staffContribution.create({ data: { memberId: m.id, text: 'x', sortOrder: 0 } })
    const y = await prisma.staffContribution.create({ data: { memberId: m.id, text: 'y', sortOrder: 0 } })
    expect(await moveContribution(m.id, y.id, 'up')).toEqual({ ok: true })
    const rows = await contributionsOf(m.id)
    expect(new Set(rows.map((r) => r.sortOrder)).size).toBe(2)
    expect(rows[0].id).toBe(y.id)
  })

  it('cannot move a contribution of another member, nor reorder its siblings', async () => {
    const a = await created({ name: 'A' })
    const b = await created({ name: 'B' })
    await added(b.id, { text: 'one' })
    const two = await added(b.id, { text: 'two' })
    expect(await moveContribution(a.id, two.id, 'up')).toEqual({ ok: false, error: 'not-found' })
    expect(await textsOf(b.id)).toEqual(['one', 'two'])
  })
})
