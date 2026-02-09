import type { ResourceStatus } from '@prisma/client'

export type ResourceLanguage = 'FR' | 'EN' | 'OTHER'

export const RESOURCE_LANGUAGE_LABELS: Record<ResourceLanguage, string> = {
  FR: 'FR',
  EN: 'EN',
  OTHER: 'Autre',
}

export type PlainResourceSubmission = {
  id: string
  submitterName: string
  submitterEmail: string | null
  submitterDiscord: string | null
  assetTitle: string
  creatorName: string
  assetType: string | null
  assetUrl: string
  description: string | null
  previewImageUrl: string | null
  price: number | null
  languages: ResourceLanguage[]
  status: ResourceStatus
  featured: boolean
  tags: ResourceTag[]
  clickCount: number
  createdAt: string
  updatedAt: string
}

export type ResourceTag = {
  id: string
  label: string
  slug: string
  approvedCount?: number
}

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Validée',
  REJECTED: 'Refusée',
}

export const RESOURCE_SUBMISSIONS_SAMPLE: PlainResourceSubmission[] = [
  {
    id: 'sample-1',
    submitterName: 'Mina R.',
    submitterEmail: 'mina@example.com',
    submitterDiscord: 'mina#0420',
    assetTitle: 'Overlay pastel pour Streamlabs',
    creatorName: 'Léna Artworks',
    assetType: 'overlay',
    assetUrl: 'https://example.com/overlay-pastel',
    description: 'Pack complet avec alertes et transitions. Palette douce et typographie lisible.',
    previewImageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
    price: 0,
    languages: ['FR'],
    status: 'PENDING',
    featured: false,
    tags: [],
    clickCount: 0,
    createdAt: '2026-01-24T18:22:00.000Z',
    updatedAt: '2026-01-24T18:22:00.000Z',
  },
  {
    id: 'sample-2',
    submitterName: 'Ryo K.',
    submitterEmail: null,
    submitterDiscord: 'ryok#1199',
    assetTitle: 'Pack d’émotes chibi (12)',
    creatorName: 'Studio Neko',
    assetType: 'emotes',
    assetUrl: 'https://example.com/emotes-chibi',
    description: '12 émotes HD prêtes pour Twitch/Discord, livraison PNG + PSD.',
    previewImageUrl: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546',
    price: 18,
    languages: ['FR', 'EN'],
    status: 'APPROVED',
    featured: true,
    tags: [],
    clickCount: 0,
    createdAt: '2026-01-20T09:10:00.000Z',
    updatedAt: '2026-01-28T14:45:00.000Z',
  },
  {
    id: 'sample-3',
    submitterName: 'Camille D.',
    submitterEmail: 'camille@example.com',
    submitterDiscord: null,
    assetTitle: 'BGM chill lofi 30 min',
    creatorName: 'Kita Sound',
    assetType: 'audio',
    assetUrl: 'https://example.com/lofi-bgm',
    description: null,
    previewImageUrl: null,
    price: 5,
    languages: ['OTHER'],
    status: 'REJECTED',
    featured: false,
    tags: [],
    clickCount: 0,
    createdAt: '2026-01-18T12:35:00.000Z',
    updatedAt: '2026-01-19T08:00:00.000Z',
  },
]
