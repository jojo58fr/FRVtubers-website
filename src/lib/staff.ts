import prisma from '@/lib/prisma'

export async function listPublishedStaff() {
  const members = await prisma.staffMember.findMany({
    where: { published: true },
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      contributions: {
        orderBy: { sortOrder: 'asc' },
        include: { event: { select: { slug: true, published: true } } },
      },
    },
  })
  return members.map(({ contributions, ...member }) => ({
    ...member,
    contributions: contributions.map((c) => ({
      id: c.id,
      text: c.text,
      year: c.year,
      sortOrder: c.sortOrder,
      // Only link to events that are publicly visible.
      eventSlug: c.event?.published ? c.event.slug : null,
    })),
  }))
}
