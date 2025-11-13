// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { seedMagazines } = require('./seed-data/magazines')

/**
 * @typedef {Object} SeedMagazine
 * @property {string} slug
 * @property {string} title
 * @property {string=} issueNumber
 * @property {string} releaseDate
 * @property {string} pdfPath
 * @property {string} coverImageUrl
 * @property {string=} description
 * @property {boolean=} published
 */

const prisma = new PrismaClient()

async function main() {
  for (const magazine of seedMagazines) {
    await prisma.magazine.upsert({
      where: { slug: magazine.slug },
      update: {
        title: magazine.title,
        issueNumber: magazine.issueNumber ?? null,
        releaseDate: new Date(magazine.releaseDate),
        description: magazine.description ?? null,
        pdfPath: magazine.pdfPath,
        coverImageUrl: magazine.coverImageUrl,
        published: magazine.published ?? true,
      },
      create: {
        slug: magazine.slug,
        title: magazine.title,
        issueNumber: magazine.issueNumber ?? null,
        releaseDate: new Date(magazine.releaseDate),
        description: magazine.description ?? null,
        pdfPath: magazine.pdfPath,
        coverImageUrl: magazine.coverImageUrl,
        published: magazine.published ?? true,
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
