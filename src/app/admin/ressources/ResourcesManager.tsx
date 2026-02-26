'use client'

import { useMemo, useState } from 'react'
import type { PlainResourceSubmission, ResourceLanguage, ResourceTag } from '@/lib/resources'
import { RESOURCE_LANGUAGE_LABELS, RESOURCE_STATUS_LABELS } from '@/lib/resources'
import styles from './page.module.scss'

type ServerAction = (formData: FormData) => Promise<void>

type ResourcesManagerProps = {
  resources: PlainResourceSubmission[]
  availableTags: ResourceTag[]
  updateStatusAction: ServerAction
  toggleFeaturedAction: ServerAction
  deleteAction: ServerAction
  updateTagsAction: ServerAction
  createResourceAction: ServerAction
  updateResourceAction: ServerAction
  createTagAction: ServerAction
  deleteTagAction: ServerAction
  updateTagAction: ServerAction
}

type ResourceStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
type ResourceLanguageFilter = 'ALL' | ResourceLanguage

const statusBadgeClass: Record<Exclude<ResourceStatusFilter, 'ALL'>, string> = {
  PENDING: styles.badgePending,
  APPROVED: styles.badgeApproved,
  REJECTED: styles.badgeRejected,
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const formatPrice = (price: number | null) => {
  if (price == null) return 'Non précisé'
  if (price === 0) return 'Gratuit'
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
  } catch {
    return `${price}€`
  }
}

const formatLanguages = (languages: ResourceLanguage[]) => {
  if (!languages || languages.length === 0) return 'Non précisé'
  return languages.map((lang) => RESOURCE_LANGUAGE_LABELS[lang]).join(', ')
}

const contains = (value: string | null | undefined, query: string) =>
  value ? value.toLowerCase().includes(query) : false

const ResourcesManager = ({
  resources,
  availableTags,
  updateStatusAction,
  toggleFeaturedAction,
  deleteAction,
  updateTagsAction,
  createResourceAction,
  updateResourceAction,
  createTagAction,
  deleteTagAction,
  updateTagAction,
}: ResourcesManagerProps) => {
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>('ALL')
  const [languageFilter, setLanguageFilter] = useState<ResourceLanguageFilter>('ALL')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [creatingResource, setCreatingResource] = useState(false)
  const [editingResourceDetailsId, setEditingResourceDetailsId] = useState<string | null>(null)

  const editingResource = useMemo(
    () => resources.find((resource) => resource.id === editingResourceId) ?? null,
    [resources, editingResourceId],
  )

  const editingResourceDetails = useMemo(
    () => resources.find((resource) => resource.id === editingResourceDetailsId) ?? null,
    [resources, editingResourceDetailsId],
  )

  const editingTag = useMemo(
    () => availableTags.find((tag) => tag.id === editingTagId) ?? null,
    [availableTags, editingTagId],
  )

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return resources.filter((resource) => {
      if (statusFilter !== 'ALL' && resource.status !== statusFilter) {
        return false
      }

      if (languageFilter !== 'ALL' && !resource.languages.includes(languageFilter)) {
        return false
      }

      if (tagFilter.length > 0 && !tagFilter.every((tagId) => resource.tags.some((tag) => tag.id === tagId))) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        contains(resource.assetTitle, normalizedQuery) ||
        contains(resource.creatorName, normalizedQuery) ||
        contains(resource.submitterName, normalizedQuery) ||
        contains(resource.submitterEmail, normalizedQuery) ||
        contains(resource.submitterDiscord, normalizedQuery)
      )
    })
  }, [query, resources, statusFilter, languageFilter, tagFilter])

  return (
    <section className={styles.manager}>
      <div className={styles.createAssetBar}>
        <div>
          <h2>Ajouter un asset</h2>
          <p>Publiez une ressource directement validée.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setCreatingResource(true)}>
          Nouveau
        </button>
      </div>

      <div className={styles.tagsPanel}>
        <div className={styles.tagsHeader}>
          <div>
            <h2>Tags</h2>
            <p>Créez des tags et assignez-les aux ressources validées.</p>
          </div>
          <form action={createTagAction} className={styles.tagForm}>
            <input type="text" name="label" placeholder="Nouveau tag" required />
            <button type="submit" className={styles.primaryButton}>
              Ajouter
            </button>
          </form>
        </div>
        {availableTags.length === 0 ? (
          <div className={styles.emptyState}>Aucun tag pour le moment.</div>
        ) : (
          <div className={styles.tagList}>
            {availableTags.map((tag) => (
              <div key={tag.id} className={styles.tagItem}>
                <span>{tag.label}</span>
                <small>/{tag.slug}</small>
                <small className={styles.tagCount}>{tag.approvedCount ?? 0} approuvée(s)</small>
                <div className={styles.tagActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setEditingTagId(tag.id)}
                  >
                    Modifier
                  </button>
                  <form action={deleteTagAction}>
                    <input type="hidden" name="id" value={tag.id} />
                    <button type="submit" className={styles.secondaryButton}>
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <label htmlFor="resources-search">Rechercher</label>
          <input
            id="resources-search"
            type="search"
            placeholder="Titre, créateur ou auteur…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className={styles.filterBox}>
          <label htmlFor="resources-status">Statut</label>
          <select
            id="resources-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ResourceStatusFilter)}
          >
            <option value="ALL">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Validées</option>
            <option value="REJECTED">Refusées</option>
          </select>
        </div>
        <div className={styles.filterBox}>
          <label htmlFor="resources-language">Langue</label>
          <select
            id="resources-language"
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value as ResourceLanguageFilter)}
          >
            <option value="ALL">Toutes</option>
            <option value="FR">FR</option>
            <option value="EN">EN</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>
        <div className={styles.filterBox}>
          <label htmlFor="resources-tags">Tags</label>
          <select
            id="resources-tags"
            multiple
            value={tagFilter}
            onChange={(event) => {
              const selected = Array.from(event.currentTarget.selectedOptions).map((option) => option.value)
              setTagFilter(selected)
            }}
            disabled={availableTags.length === 0}
          >
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.countBox}>
          <span>{filteredResources.length}</span>
          <small>ressource(s)</small>
        </div>
      </div>

      <div className={styles.cards}>
        {filteredResources.length === 0 ? (
          <div className={styles.emptyState}>Aucune ressource ne correspond à ce filtre.</div>
        ) : (
          filteredResources.map((resource) => {
            const isApproved = resource.status === 'APPROVED'
            const isRejected = resource.status === 'REJECTED'
            const statusLabel = RESOURCE_STATUS_LABELS[resource.status]
            const statusClass = statusBadgeClass[resource.status]
            return (
              <article key={resource.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3>{resource.assetTitle}</h3>
                    <p className={styles.creatorLine}>Créateur : {resource.creatorName}</p>
                  </div>
                  <div className={styles.badges}>
                    <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
                    {resource.featured ? <span className={styles.featuredBadge}>Mis en avant</span> : null}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.preview}>
                    {resource.previewImageUrl ? (
                      <img src={resource.previewImageUrl} alt={`Aperçu de ${resource.assetTitle}`} />
                    ) : (
                      <div className={styles.previewPlaceholder}>Aucun aperçu</div>
                    )}
                  </div>
                  <div className={styles.details}>
                    <p className={styles.assetUrl}>
                      <a href={resource.assetUrl} target="_blank" rel="noopener noreferrer">
                        Voir l&apos;asset
                      </a>
                    </p>
                    <p className={styles.price}>{formatPrice(resource.price)}</p>
                    <p>Langue(s) : {formatLanguages(resource.languages)}</p>
                    {resource.assetType ? <p>Type : {resource.assetType}</p> : null}
                    <p className={styles.description}>
                      {resource.description || 'Aucune description fournie.'}
                    </p>
                    <div className={styles.tagSection}>
                      <div className={styles.tagChips}>
                        {resource.tags.length === 0 ? (
                          <span className={styles.tagEmpty}>Aucun tag</span>
                        ) : (
                          resource.tags.map((tag) => (
                            <span key={tag.id} className={styles.tagChip}>
                              {tag.label}
                            </span>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setEditingResourceId(resource.id)}
                        disabled={availableTags.length === 0}
                      >
                        Editer les tags
                      </button>
                    </div>
                    <div className={styles.submitter}>
                      <span>Soumis par {resource.submitterName}</span>
                      <span>
                        {resource.submitterEmail ? `Email : ${resource.submitterEmail}` : 'Email non fourni'}
                      </span>
                      <span>
                        {resource.submitterDiscord ? `Discord : ${resource.submitterDiscord}` : 'Discord non fourni'}
                      </span>
                    </div>
                    <div className={styles.timestamps}>
                      <span>Soumis le {formatDate(resource.createdAt)}</span>
                      <span>Mis à jour le {formatDate(resource.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setEditingResourceDetailsId(resource.id)}
                  >
                    Modifier
                  </button>
                  {!isApproved ? (
                    <form action={updateStatusAction}>
                      <input type="hidden" name="id" value={resource.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <button type="submit" className={styles.primaryButton}>
                        Valider
                      </button>
                    </form>
                  ) : null}
                  {!isRejected ? (
                    <form action={updateStatusAction}>
                      <input type="hidden" name="id" value={resource.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <button type="submit" className={styles.secondaryButton}>
                        Refuser
                      </button>
                    </form>
                  ) : null}
                  <form action={toggleFeaturedAction}>
                    <input type="hidden" name="id" value={resource.id} />
                    <input type="hidden" name="featured" value={resource.featured ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className={resource.featured ? styles.secondaryButton : styles.primaryButton}
                      disabled={!isApproved}
                    >
                      {resource.featured ? 'Retirer la mise en avant' : 'Mettre en avant'}
                    </button>
                  </form>
                  <form
                    action={deleteAction}
                    onSubmit={(event) => {
                      if (!window.confirm('Supprimer définitivement cette ressource ?')) {
                        event.preventDefault()
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={resource.id} />
                    <button type="submit" className={styles.dangerButton}>
                      Supprimer
                    </button>
                  </form>
                </div>
              </article>
            )
          })
        )}
      </div>

      {editingResource ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setEditingResourceId(null)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <h3>Tags pour {editingResource.assetTitle}</h3>
                <p>Sélectionnez un ou plusieurs tags à associer.</p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEditingResourceId(null)}
              >
                Fermer
              </button>
            </header>
            <form action={updateTagsAction} className={styles.modalBody}>
              <input type="hidden" name="id" value={editingResource.id} />
              <select name="tagIds" multiple defaultValue={editingResource.tags.map((tag) => tag.id)}>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label}
                  </option>
                ))}
              </select>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Enregistrer
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEditingResourceId(null)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingResourceDetails ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setEditingResourceDetailsId(null)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <h3>Modifier la ressource</h3>
                <p>Mettez à jour les informations de l&apos;asset.</p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEditingResourceDetailsId(null)}
              >
                Fermer
              </button>
            </header>
            <form action={updateResourceAction} className={styles.modalBody}>
              <input type="hidden" name="id" value={editingResourceDetails.id} />
              <div className={styles.assetGrid}>
                <label className={styles.modalField}>
                  <span>Titre de l'asset</span>
                  <input type="text" name="assetTitle" defaultValue={editingResourceDetails.assetTitle} required />
                </label>
                <label className={styles.modalField}>
                  <span>Créateur</span>
                  <input type="text" name="creatorName" defaultValue={editingResourceDetails.creatorName} required />
                </label>
                <label className={styles.modalField}>
                  <span>Type</span>
                  <input type="text" name="assetType" defaultValue={editingResourceDetails.assetType ?? ''} />
                </label>
                <label className={styles.modalField}>
                  <span>URL de l'asset</span>
                  <input type="url" name="assetUrl" defaultValue={editingResourceDetails.assetUrl} required />
                </label>
                <label className={styles.modalField}>
                  <span>URL de l'aperçu</span>
                  <input
                    type="url"
                    name="previewImageUrl"
                    defaultValue={editingResourceDetails.previewImageUrl ?? ''}
                  />
                </label>
                <label className={styles.modalField}>
                  <span>Prix (€)</span>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    defaultValue={editingResourceDetails.price ?? ''}
                  />
                </label>
                <label className={styles.modalField}>
                  <span>Langues</span>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        name="languages"
                        value="FR"
                        defaultChecked={editingResourceDetails.languages.includes('FR')}
                      />
                      FR
                    </label>
                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        name="languages"
                        value="EN"
                        defaultChecked={editingResourceDetails.languages.includes('EN')}
                      />
                      EN
                    </label>
                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        name="languages"
                        value="OTHER"
                        defaultChecked={editingResourceDetails.languages.includes('OTHER')}
                      />
                      Autre
                    </label>
                  </div>
                </label>
                <label className={styles.modalField}>
                  <span>Tags</span>
                  <select
                    name="tagIds"
                    multiple
                    defaultValue={editingResourceDetails.tags.map((tag) => tag.id)}
                    disabled={availableTags.length === 0}
                  >
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.modalField}>
                <span>Description</span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingResourceDetails.description ?? ''}
                  placeholder="Description (optionnel)"
                ></textarea>
              </label>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Enregistrer
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setEditingResourceDetailsId(null)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {creatingResource ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setCreatingResource(false)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <h3>Nouvel asset</h3>
                <p>Ajoutez une ressource directement validée.</p>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={() => setCreatingResource(false)}>
                Fermer
              </button>
            </header>
            <form action={createResourceAction} className={styles.modalBody}>
              <div className={styles.assetGrid}>
                <label className={styles.modalField}>
                  <span>Nom du soumetteur</span>
                  <input type="text" name="submitterName" defaultValue="FRVtubers" readOnly required />
                </label>
                <label className={styles.modalField}>
                  <span>Titre de l'asset</span>
                  <input type="text" name="assetTitle" required />
                </label>
                <label className={styles.modalField}>
                  <span>Créateur</span>
                  <input type="text" name="creatorName" required />
                </label>
                <label className={styles.modalField}>
                  <span>Type</span>
                  <input type="text" name="assetType" placeholder="Overlay, Emotes..." />
                </label>
                <label className={styles.modalField}>
                  <span>URL de l'asset</span>
                  <input type="url" name="assetUrl" placeholder="https://..." required />
                </label>
                <label className={styles.modalField}>
                  <span>URL de l'aperçu</span>
                  <input type="url" name="previewImageUrl" placeholder="https://..." />
                </label>
                <label className={styles.modalField}>
                  <span>Prix (€)</span>
                  <input type="number" name="price" min="0" step="0.01" />
                </label>
                <label className={styles.modalField}>
                  <span>Langues</span>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxItem}>
                      <input type="checkbox" name="languages" value="FR" />
                      FR
                    </label>
                    <label className={styles.checkboxItem}>
                      <input type="checkbox" name="languages" value="EN" />
                      EN
                    </label>
                    <label className={styles.checkboxItem}>
                      <input type="checkbox" name="languages" value="OTHER" />
                      Autre
                    </label>
                  </div>
                </label>
                <label className={styles.modalField}>
                  <span>Tags</span>
                  <select name="tagIds" multiple disabled={availableTags.length === 0}>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.modalField}>
                  <span>Mettre en avant</span>
                  <div className={styles.checkboxItem}>
                    <input type="checkbox" name="featured" value="true" />
                    Oui
                  </div>
                </label>
              </div>
              <label className={styles.modalField}>
                <span>Description</span>
                <textarea name="description" rows={4} placeholder="Description (optionnel)"></textarea>
              </label>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Créer
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setCreatingResource(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingTag ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setEditingTagId(null)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <h3>Modifier le tag</h3>
                <p>Changez le nom ou l&apos;URL associée.</p>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={() => setEditingTagId(null)}>
                Fermer
              </button>
            </header>
            <form action={updateTagAction} className={styles.modalBody}>
              <input type="hidden" name="id" value={editingTag.id} />
              <label className={styles.modalField}>
                <span>Nom du tag</span>
                <input type="text" name="label" defaultValue={editingTag.label} required />
              </label>
              <label className={styles.modalField}>
                <span>URL</span>
                <input type="text" name="slug" defaultValue={editingTag.slug} required />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.primaryButton}>
                  Enregistrer
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setEditingTagId(null)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ResourcesManager
