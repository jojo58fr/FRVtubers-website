import 'server-only'

import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { securityLog } from '@/lib/security-log'

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

  if (/^\/avatars\/discord\/[a-zA-Z0-9_-]+\.(png|gif)$/.test(value)) {
    return value
  }

  try {
    const url = new URL(value)
    return /^\/avatars\/discord\/[a-zA-Z0-9_-]+\.(png|gif)$/.test(url.pathname) ? url.pathname : null
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
      securityLog('warn', 'storage.operation_failed')
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
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || !/^\d{1,20}$/.test(discordId) ||
      !/^(a_)?[a-f0-9]{32}$/.test(avatarHash) ||
      extension !== getDiscordAvatarExtension(avatarHash)) {
    throw new Error('Invalid avatar configuration')
  }
  // A keyed digest prevents recovering a Discord ID from a public filename.
  // Stable names also avoid downloading the same image on every sign-in.
  const opaqueName = createHmac('sha256', secret)
    .update(`discord-avatar:${discordId}:${avatarHash}`)
    .digest('hex')
  const expectedUrl = buildDiscordAvatarUrl(discordId, avatarHash)
  if (sourceUrl !== expectedUrl) throw new Error('Unexpected avatar source')
  await mkdir(AVATAR_DIR, { recursive: true })

  const filename = `${opaqueName}.${extension}`
  const absolutePath = path.join(AVATAR_DIR, filename)

  if (!(await fileExists(absolutePath))) {
    const response = await fetch(expectedUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new Error(`Discord avatar download failed (${response.status})`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Empty avatar response')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 5 * 1024 * 1024) {
          await reader.cancel()
          throw new Error('Avatar too large')
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    const buffer = Buffer.concat(chunks)
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const isGif = ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
    if (extension === 'png' ? !isPng : !isGif) throw new Error('Unexpected avatar format')
    await writeFile(absolutePath, buffer)
  }

  return {
    publicPath: toPublicPath(absolutePath),
    absolutePath,
  }
}
