import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBluesky,
  faInstagram,
  faTwitch,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons'
import { faLink, faPalette } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { PlatformId } from '@/lib/social-links'

// FontAwesome has no VGen glyph: the palette icon stands in for it (commission platform).
const ICONS: Record<PlatformId, IconDefinition> = {
  twitch: faTwitch,
  twitter: faXTwitter,
  bluesky: faBluesky,
  instagram: faInstagram,
  youtube: faYoutube,
  vgen: faPalette,
}

/** Decorative icon: the accessible name always comes from the adjacent text / aria-label. */
export default function SocialIcon({ platform, className }: { platform: PlatformId | null; className?: string }) {
  return (
    <FontAwesomeIcon icon={platform ? ICONS[platform] : faLink} className={className} fixedWidth aria-hidden="true" />
  )
}
