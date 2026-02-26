type ResourceWebhookPayload = {
  id: string
  assetTitle: string
  assetUrl: string
}

const buildResourceUrl = (resource: ResourceWebhookPayload) => {
  const template = process.env.FRVRESOURCES_RESOURCE_URL_TEMPLATE
  if (template && template.includes('{id}')) {
    return template.replace('{id}', encodeURIComponent(resource.id))
  }

  if (template) {
    return `${template.replace(/\/$/, '')}/${encodeURIComponent(resource.id)}`
  }

  return resource.assetUrl
}

export const notifyResourcePublished = async (resource: ResourceWebhookPayload) => {
  const webhookUrl = process.env.DISCORD_RESOURCES_WEBHOOK_URL
  if (!webhookUrl) return

  const resourceUrl = buildResourceUrl(resource)
  const payload = {
    content: `Nouveau asset sur le site FRVResources: **${resource.assetTitle}**.`,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Voir l'asset",
            url: resourceUrl,
          },
        ],
      },
    ],
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error("Impossible d'envoyer le webhook FRVResources", await response.text())
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du webhook FRVResources", error)
  }
}
