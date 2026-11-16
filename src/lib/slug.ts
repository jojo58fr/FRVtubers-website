import { randomUUID } from 'node:crypto'

export const slugify = (value: string, fallbackPrefix = 'item'): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `${fallbackPrefix}-${randomUUID().slice(0, 6)}`
