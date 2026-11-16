import { afterEach, describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import { listPublishedStaff } from '@/lib/staff'

afterEach(async () => {
  await prisma.staffMember.deleteMany()
  await prisma.event.deleteMany()
})

const mkEvent = (slug: string, published: boolean) =>
  prisma.event.create({
    data: { slug, title: slug, type: 'OTHER', startsAt: new Date(), published },
  })

describe('listPublishedStaff', () => {
  it('excludes unpublished members, active first then sortOrder', async () => {
    const m = (slug: string, o: object) =>
      prisma.staffMember.create({
        data: { slug, name: slug, title: 't', published: true, ...o },
      })
    await m('inactive', { isActive: false, sortOrder: 0 })
    await m('b', { sortOrder: 2 })
    await m('a', { sortOrder: 1 })
    await m('hidden', { published: false })
    expect((await listPublishedStaff()).map((s) => s.slug)).toEqual([
      'a',
      'b',
      'inactive',
    ])
  })

  it('exposes eventSlug only for published events, contributions sorted', async () => {
    const pub = await mkEvent('pub', true)
    const draft = await mkEvent('draft-event', false)
    await prisma.staffMember.create({
      data: {
        slug: 'x',
        name: 'x',
        title: 't',
        published: true,
        contributions: {
          create: [
            { text: 'third', sortOrder: 3 },
            { text: 'linked-draft', sortOrder: 2, eventId: draft.id },
            { text: 'linked-pub', sortOrder: 1, eventId: pub.id, year: 2026 },
          ],
        },
      },
    })
    const [member] = await listPublishedStaff()
    expect(member.contributions.map((c) => c.text)).toEqual([
      'linked-pub',
      'linked-draft',
      'third',
    ])
    expect(member.contributions.map((c) => c.eventSlug)).toEqual([
      'pub',
      null,
      null,
    ])
    const json = JSON.stringify(member)
    expect(json).not.toContain('draft-event')
    expect(json).not.toContain(draft.id)
  })
})
