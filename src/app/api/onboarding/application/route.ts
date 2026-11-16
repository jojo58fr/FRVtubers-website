import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isTrustedMutation, readJsonObject } from '@/lib/request-security'
import { securityLog } from '@/lib/security-log'

const fieldLimits = { vtuberType: 80, pseudo: 100, platforms: 160, links: 700, socials: 300 }

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  if (!isTrustedMutation(request) || session.isGuildMember !== true || session.discordMember?.pending === true) {
    securityLog('warn', 'discord.application_denied')
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }
  if (session.hasVtuberRole) {
    return NextResponse.json({ error: 'Candidature déjà validée' }, { status: 409 })
  }
  const webhookUrl = process.env.DISCORD_APPLICATION_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  }
  let body: Record<string, unknown>
  try {
    body = await readJsonObject(request)
  } catch (error) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, {
      status: error instanceof RangeError ? 413 : 400,
    })
  }
  const payload: Record<string, string> = {}
  for (const [field, limit] of Object.entries(fieldLimits)) {
    const value = body[field]
    if ((field !== 'socials' && (typeof value !== 'string' || !value.trim())) ||
        (value !== undefined && (typeof value !== 'string' || value.trim().length > limit))) {
      return NextResponse.json({ error: `Champ invalide : ${field}` }, { status: 400 })
    }
    payload[field] = typeof value === 'string' ? value.trim() : ''
  }
  const content = [
    'Nouvelle candidature FRVTubers',
    `**Type** : ${payload.vtuberType}`,
    `**Pseudo** : ${payload.pseudo}`,
    `**Plateforme** : ${payload.platforms}`,
    `**Liens** : ${payload.links}`,
    `**Réseaux** : ${payload.socials || 'N/A'}`,
    `**Soumis par** : ${session.user.discordId ? `<@${session.user.discordId}>` : 'Membre authentifié'}`,
  ].join('\n')
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return NextResponse.json({ ok: true })
    securityLog('warn', 'discord.webhook_failed', response.status)
  } catch {
    securityLog('warn', 'discord.webhook_failed')
  }
  return NextResponse.json({ error: 'Envoi impossible. Réessaie plus tard.' }, { status: 502 })
}
