import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

type ApplicationPayload = {
  vtuberType?: string
  pseudo?: string
  platforms?: string
  links?: string
  socials?: string
}

const requiredFields: (keyof ApplicationPayload)[] = ['vtuberType', 'pseudo', 'platforms', 'links']

const webhookUrl = process.env.DISCORD_APPLICATION_WEBHOOK_URL

function sanitize(value: string | undefined) {
  return value?.trim()
}

export async function POST(request: Request) {
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 500 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = (await request.json()) as ApplicationPayload
  const payload = {
    vtuberType: sanitize(body.vtuberType),
    pseudo: sanitize(body.pseudo),
    platforms: sanitize(body.platforms),
    links: sanitize(body.links),
    socials: sanitize(body.socials),
  }

  for (const field of requiredFields) {
    if (!payload[field]) {
      return NextResponse.json({ error: `Champ requis: ${field}` }, { status: 400 })
    }
  }

  const mention = session.user?.id ? `<@${session.user.id}>` : null
  const submitterLabel = mention ?? session.user?.name ?? 'Utilisateur'

  const content = [
    'Nouvelle candidature FRVTubers',
    `**Type** : ${payload.vtuberType}`,
    `**Pseudo** : ${payload.pseudo}`,
    `**Plateforme** : ${payload.platforms}`,
    `**Liens** : ${payload.links}`,
    `**Réseaux** : ${payload.socials || 'N/A'}`,
    `**Soumis par** : ${session.user?.name} (${submitterLabel})`,
  ].join('\n')

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Envoi webhook impossible' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
