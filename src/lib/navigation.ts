import type { NavItem } from '@/components/home/SiteHeader'

export const mainNavItems: NavItem[] = [
  {
    label: 'La communauté',
    href: '#',
    children: [
      { label: 'Faire un don', href: '/dons' },
      { label: 'Partenaires', href: '/partenaires' },
    ],
  },
  {
    label: 'Projets FRVtubers',
    href: '#',
    children: [
      { label: 'FRVStream', href: 'https://stream.frvtubers.com/', openInNewTab: true },
      { label: 'FRVArt', href: 'https://art.frvtubers.com/', openInNewTab: true},
      { label: 'FRVDocs', href: 'https://docs.frvtubers.com/', openInNewTab: true},
      { label: 'FRVBento', href: 'https://bento.frvtubers.com/', openInNewTab: true},
      { label: 'FRVRessources', href: 'https://resources.frvtubers.com/', openInNewTab: true},
    ],
  },
  { label: 'Kokori Mag', href: '/kokori-mag' },
  { label: 'Kokori pour les créateurs', href: '/kokori-pour-les-createurs' },
  { label: 'Contact', href: '/contact' },
]
