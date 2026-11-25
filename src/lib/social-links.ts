// Client-safe helpers (no server imports) shared by the admin staff form and the public staff page.
// Links stay stored as `{ label, url }`: the platform is derived from the URL host, so no
// schema change is needed and existing links get their icon automatically.

export type PlatformId = 'twitch' | 'twitter' | 'bluesky' | 'instagram' | 'youtube' | 'vgen'

export type Platform = {
  id: PlatformId
  label: string
  placeholder: string
  hosts: string[]
}

export const PLATFORMS: Platform[] = [
  { id: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/pseudo', hosts: ['twitch.tv', 'twitch.com'] },
  { id: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/pseudo', hosts: ['twitter.com', 'x.com'] },
  { id: 'bluesky', label: 'Bluesky', placeholder: 'https://bsky.app/profile/pseudo.bsky.social', hosts: ['bsky.app'] },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/pseudo', hosts: ['instagram.com'] },
  {
    id: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@pseudo',
    hosts: ['youtube.com', 'youtu.be'],
  },
  { id: 'vgen', label: 'VGen', placeholder: 'https://vgen.co/pseudo', hosts: ['vgen.co'] },
]

export const getPlatform = (id: PlatformId): Platform => PLATFORMS.find((p) => p.id === id) as Platform

/** Returns the platform matching the URL host (www./m. prefixes and subdomains included), or null. */
export const detectPlatform = (url: string): PlatformId | null => {
  let hostname: string
  try {
    hostname = new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
  const match = PLATFORMS.find((platform) =>
    platform.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
  )
  return match?.id ?? null
}
