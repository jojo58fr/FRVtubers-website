import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(slugify('Genesis 2026 : Édition spéciale')).toBe('genesis-2026-edition-speciale')
  })

  it('utilise le préfixe de repli quand rien ne reste', () => {
    expect(slugify('!!!', 'evenement')).toMatch(/^evenement-[0-9a-f]{6}$/)
  })

  it('ne laisse aucun tiret en début ou fin', () => {
    expect(slugify('--- Hello World ---')).toBe('hello-world')
  })
})
