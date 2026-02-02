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
  { label: 'Kokori Mag', href: '/kokori-mag' },
  { label: 'Kokori pour les créateurs', href: '/kokori-pour-les-createurs' },
  { label: 'Contact', href: '/contact' },
]
