import { Buffer } from 'node:buffer'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const AVATAR_DIR = path.join(PUBLIC_DIR, 'avatars', 'discord')

const toPublicPath = (absolutePath: string) =>
  `/${path.relative(PUBLIC_DIR, absolutePath).replace(/\\/g, '/')}`

const fileExists = async (absolutePath: string) => {
  try {
    await stat(absolutePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw error
  }
}

export const getDiscordAvatarExtension = (avatarHash: string) =>
  avatarHash.startsWith('a_') ? 'gif' : 'png'

export const buildDiscordAvatarUrl = (discordId: string, avatarHash: string) => {
  const ext = getDiscordAvatarExtension(avatarHash)
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=256`
}

const getLocalAvatarPath = (value?: string | null) => {
  if (!value) {
    return null
  }

  if (value.startsWith('/avatars/discord/')) {
    return value
  }

  try {
    const url = new URL(value)
    return url.pathname.startsWith('/avatars/discord/') ? url.pathname : null
  } catch {
    return null
  }
}

export const isLocalDiscordAvatar = (value?: string | null) =>
  Boolean(getLocalAvatarPath(value))

export const removeLocalDiscordAvatar = async (value?: string | null) => {
  const localPath = getLocalAvatarPath(value)
  if (!localPath) {
    return
  }

  const absolutePath = path.join(PUBLIC_DIR, localPath.replace(/^\/+/, ''))
  try {
    await unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Impossible de supprimer l’avatar local', absolutePath, error)
    }
  }
}

export const persistDiscordAvatar = async ({
  discordId,
  avatarHash,
  sourceUrl,
  extension,
}: {
  discordId: string
  avatarHash: string
  sourceUrl: string
  extension: string
}) => {
  await mkdir(AVATAR_DIR, { recursive: true })

  const filename = `${discordId}-${avatarHash}.${extension}`
  const absolutePath = path.join(AVATAR_DIR, filename)

  if (!(await fileExists(absolutePath))) {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`Discord avatar download failed (${response.status})`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(absolutePath, buffer)
  }

  return {
    publicPath: toPublicPath(absolutePath),
    absolutePath,
  }
}
