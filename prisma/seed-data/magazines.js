/** @type {import('../seed.js').SeedMagazine[]} */
const seedMagazines = [
  {
    slug: 'volume-1',
    title: 'Kokori Mag Volume 1',
    issueNumber: '#1',
    releaseDate: '2024-02-01',
    pdfPath: '/magazines/kokori-mag-volume-1.pdf',
    coverImageUrl: 'https://placehold.co/600x800/e2c3ff/1b0f3f?text=Kokori+Mag+Vol.+1',
    description:
      'Premiere edition de Kokori Mag avec un focus sur les debuts des VTubers francophones et les coulisses de la communaute FRVtubers.',
    published: true,
  },
  {
    slug: 'volume-2',
    title: 'Kokori Mag Volume 2',
    issueNumber: '#2',
    releaseDate: '2024-05-15',
    pdfPath: '/magazines/kokori-mag-volume-2.pdf',
    coverImageUrl: 'https://placehold.co/600x800/fbd7c8/291624?text=Kokori+Mag+Vol.+2',
    description:
      'Une edition speciale dediee aux collaborations printemps/ete, avec interviews de createurs et retours sur les evenements phares.',
    published: true,
  },
]

module.exports = {
  seedMagazines,
}
