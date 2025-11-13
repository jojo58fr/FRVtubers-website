'use client'

import { useCallback, useMemo, useState } from 'react'
import type { PlainMagazine } from '@/lib/magazines'
import {
  MAX_COVER_SIZE_BYTES,
  MAX_COVER_SIZE_LABEL,
  MAX_PDF_SIZE_BYTES,
  MAX_PDF_SIZE_LABEL,
} from '@/lib/magazine-upload-constraints'
import styles from './page.module.scss'

type ServerAction = (formData: FormData) => Promise<void>

type MagazinesManagerProps = {
  magazines: PlainMagazine[]
  createAction: ServerAction
  updateAction: ServerAction
  deleteAction: ServerAction
}

type ModalMode = 'create' | 'edit' | null

const formatDate = (value: string) => {
  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
  return formatter.format(new Date(value))
}

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')

const todayInputValue = () => new Date().toISOString().slice(0, 10)

const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) => (
  <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => event.stopPropagation()}
    >
      <header className={styles.modalHeader}>
        <h2>{title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fermer la fenêtre">
          ×
        </button>
      </header>
      <div className={styles.modalContent}>{children}</div>
    </div>
  </div>
)

const MagazinesManager = ({ magazines, createAction, updateAction, deleteAction }: MagazinesManagerProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(magazines[0]?.id ?? null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  const effectiveSelectedId = useMemo(() => {
    if (selectedId && magazines.some((magazine) => magazine.id === selectedId)) {
      return selectedId
    }
    return magazines[0]?.id ?? null
  }, [magazines, selectedId])

  const selectedMagazine = useMemo(
    () => magazines.find((magazine) => magazine.id === effectiveSelectedId) ?? null,
    [magazines, effectiveSelectedId],
  )

  const closeModals = () => {
    setModalMode(null)
    setConfirmOpen(false)
    setClientError(null)
  }

  const validateFiles = useCallback((form: HTMLFormElement) => {
    const pdfInput = form.elements.namedItem('pdfFile') as HTMLInputElement | null
    const coverInput = form.elements.namedItem('coverImageFile') as HTMLInputElement | null

    const pdfFile = pdfInput?.files?.[0]
    const coverFile = coverInput?.files?.[0]

    if (pdfFile && pdfFile.size > MAX_PDF_SIZE_BYTES) {
      return `Le PDF est trop volumineux (${Math.round(pdfFile.size / (1024 * 1024))} Mo). La taille maximale autorisée est de ${MAX_PDF_SIZE_LABEL}.`
    }

    if (coverFile && coverFile.size > MAX_COVER_SIZE_BYTES) {
      return `La miniature est trop volumineuse (${Math.round(coverFile.size / (1024 * 1024))} Mo). La taille maximale autorisée est de ${MAX_COVER_SIZE_LABEL}.`
    }

    return null
  }, [])

  const handleCreateSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const form = event.currentTarget
      const error = validateFiles(form)
      if (error) {
        event.preventDefault()
        setClientError(error)
      } else {
        setClientError(null)
      }
    },
    [validateFiles],
  )

  const handleEditSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const form = event.currentTarget
      const error = validateFiles(form)
      if (error) {
        event.preventDefault()
        setClientError(error)
      } else {
        setClientError(null)
      }
    },
    [validateFiles],
  )

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => setModalMode('create')}
        >
          Nouveau
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          disabled={!selectedMagazine}
          onClick={() => setModalMode('edit')}
        >
          Éditer
        </button>
        <button
          type="button"
          className={classes(styles.toolbarButton, styles.danger)}
          disabled={!selectedMagazine}
          onClick={() => setConfirmOpen(true)}
        >
          Supprimer
        </button>
      </div>

      <div className={styles.managerLayout}>
        <div className={styles.listPane}>
          <div className={styles.listHeader}>
            <span>Titre</span>
            <span>Date</span>
            <span>Statut</span>
          </div>
          <ul className={styles.list} role="listbox" aria-label="Magazines Kokori" tabIndex={0}>
            {magazines.length === 0 ? (
              <li className={styles.emptyState}>Aucun magazine enregistré pour le moment.</li>
            ) : (
              magazines.map((magazine) => (
                <li
                  key={magazine.id}
                  role="option"
                  aria-selected={magazine.id === effectiveSelectedId}
                  tabIndex={-1}
                  className={classes(styles.listItem, magazine.id === effectiveSelectedId && styles.listItemSelected)}
                  onClick={() => setSelectedId(magazine.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedId(magazine.id)
                    }
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault()
                      const currentIndex = magazines.findIndex((item) => item.id === effectiveSelectedId)
                      const offset = event.key === 'ArrowUp' ? -1 : 1
                      const nextIndex = Math.min(Math.max(currentIndex + offset, 0), magazines.length - 1)
                      setSelectedId(magazines[nextIndex]?.id ?? magazines[0]?.id ?? null)
                    }
                  }}
                >
                  <span className={styles.primaryCell}>{magazine.title}</span>
                  <span>{formatDate(magazine.releaseDate)}</span>
                  <span className={magazine.published ? styles.badgePublished : styles.badgeDraft}>
                    {magazine.published ? 'Publié' : 'Brouillon'}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <aside className={styles.previewPane}>
          {selectedMagazine ? (
            <>
              <div className={styles.previewCover}>
                <img src={selectedMagazine.coverImageUrl} alt={`Couverture de ${selectedMagazine.title}`} />
              </div>
              <div className={styles.previewContent}>
                <h2>{selectedMagazine.title}</h2>
                <p className={styles.previewMeta}>
                  <span>Slug : {selectedMagazine.slug}</span>
                  <span>Numéro : {selectedMagazine.issueNumber ?? '—'}</span>
                  <span>Publication : {formatDate(selectedMagazine.releaseDate)}</span>
                  <span>Statut : {selectedMagazine.published ? 'Publié' : 'Brouillon'}</span>
                </p>
                {selectedMagazine.description ? (
                  <p className={styles.previewDescription}>{selectedMagazine.description}</p>
                ) : (
                  <p className={styles.previewDescriptionMuted}>
                    Aucune description. Édite ce magazine pour en ajouter une.
                  </p>
                )}
                <div className={styles.previewLinks}>
                  <a href={selectedMagazine.pdfPath} target="_blank" rel="noopener noreferrer">
                    Ouvrir le PDF
                  </a>
                  <a href={selectedMagazine.coverImageUrl} target="_blank" rel="noopener noreferrer">
                    Ouvrir la couverture
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.previewPlaceholder}>
              Sélectionne un magazine pour voir les détails.
            </div>
          )}
        </aside>
      </div>

      {modalMode === 'create' ? (
        <Modal title="Ajouter un magazine" onClose={closeModals}>
          <form action={createAction} className={styles.form} onSubmit={handleCreateSubmit}>
            {clientError ? <div className={styles.formError}>{clientError}</div> : null}
            <div className={styles.formRow}>
              <label htmlFor="create-title">Titre</label>
              <input id="create-title" name="title" required placeholder="Kokori Mag Volume 5" />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="create-slug">Slug (optionnel)</label>
              <input id="create-slug" name="slug" placeholder="volume-5" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label htmlFor="create-issue-number">Numéro</label>
                <input id="create-issue-number" name="issueNumber" placeholder="#5" />
              </div>
              <div className={styles.formRow}>
                <label htmlFor="create-release-date">Date de publication</label>
                <input
                  id="create-release-date"
                  name="releaseDate"
                  type="date"
                  defaultValue={todayInputValue()}
                  required
                />
              </div>
              <div className={styles.formRowCheckbox}>
                <input id="create-published" name="published" type="checkbox" defaultChecked />
                <label htmlFor="create-published">Publier dès l&apos;enregistrement</label>
              </div>
            </div>
            <div className={styles.formRow}>
              <label htmlFor="create-cover">Miniature (JPEG/PNG)</label>
              <input id="create-cover" name="coverImageFile" type="file" accept="image/*" required />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="create-pdf">PDF</label>
              <input id="create-pdf" name="pdfFile" type="file" accept="application/pdf" required />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="create-description">Description</label>
              <textarea
                id="create-description"
                name="description"
                placeholder="Résumé de l’édition, invités, interviews…"
                rows={4}
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModals}>
                Annuler
              </button>
              <button type="submit" className={styles.primaryButton} formEncType="multipart/form-data">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modalMode === 'edit' && selectedMagazine ? (
        <Modal title={`Modifier ${selectedMagazine.title}`} onClose={closeModals}>
          <form action={updateAction} className={styles.form} onSubmit={handleEditSubmit}>
            {clientError ? <div className={styles.formError}>{clientError}</div> : null}
            <input type="hidden" name="id" value={selectedMagazine.id} />
            <div className={styles.formRow}>
              <label htmlFor="edit-title">Titre</label>
              <input id="edit-title" name="title" defaultValue={selectedMagazine.title} required />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="edit-slug">Slug</label>
              <input id="edit-slug" name="slug" defaultValue={selectedMagazine.slug} required />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label htmlFor="edit-issue-number">Numéro</label>
                <input id="edit-issue-number" name="issueNumber" defaultValue={selectedMagazine.issueNumber ?? ''} />
              </div>
              <div className={styles.formRow}>
                <label htmlFor="edit-release-date">Date de publication</label>
                <input
                  id="edit-release-date"
                  name="releaseDate"
                  type="date"
                  defaultValue={selectedMagazine.releaseDate.slice(0, 10)}
                  required
                />
              </div>
              <div className={styles.formRowCheckbox}>
                <input
                  id="edit-published"
                  name="published"
                  type="checkbox"
                  defaultChecked={selectedMagazine.published}
                />
                <label htmlFor="edit-published">Publié</label>
              </div>
            </div>
            <div className={styles.formRow}>
              <label htmlFor="edit-cover">Nouvelle miniature (facultatif)</label>
              <input id="edit-cover" name="coverImageFile" type="file" accept="image/*" />
              <p className={styles.helperText}>Miniature actuelle : {selectedMagazine.coverImageUrl}</p>
            </div>
            <div className={styles.formRow}>
              <label htmlFor="edit-pdf">Nouveau PDF (facultatif)</label>
              <input id="edit-pdf" name="pdfFile" type="file" accept="application/pdf" />
              <p className={styles.helperText}>PDF actuel : {selectedMagazine.pdfPath}</p>
            </div>
            <div className={styles.formRow}>
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                name="description"
                defaultValue={selectedMagazine.description ?? ''}
                rows={4}
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModals}>
                Annuler
              </button>
              <button type="submit" className={styles.primaryButton} formEncType="multipart/form-data">
                Sauvegarder
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmOpen && selectedMagazine ? (
        <Modal title="Confirmer la suppression" onClose={closeModals}>
          <form action={deleteAction} className={styles.form}>
            <input type="hidden" name="id" value={selectedMagazine.id} />
            <p>
              Tu es sur le point de supprimer <strong>{selectedMagazine.title}</strong>. Le PDF et la miniature locaux
              seront également supprimés. Continuer ?
            </p>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeModals}>
                Annuler
              </button>
              <button type="submit" className={classes(styles.primaryButton, styles.danger)}>
                Supprimer
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

export default MagazinesManager
