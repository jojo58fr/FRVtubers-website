'use client'

import { useState } from 'react'
import styles from './page.module.scss'

export type PlainAdminMember = {
  id: string
  slug: string
  name: string
  title: string
  bio: string
  photoPath: string | null
  links: Array<{ label: string; url: string }>
  isActive: boolean
  published: boolean
}

type MemberFormProps = {
  action: (formData: FormData) => Promise<void>
  idPrefix: string
  member?: PlainAdminMember
  // Valeurs dupliquées ici pour éviter d'importer le module serveur (prisma) côté client.
  maxLinks: number
  limits: { name: number; title: number; bio: number; linkLabel: number; linkUrl: number }
}

type Row = { key: number; label: string; url: string }

const MemberForm = ({ action, idPrefix, member, maxLinks, limits }: MemberFormProps) => {
  const [rows, setRows] = useState<Row[]>(() =>
    (member?.links ?? []).map((link, index) => ({ key: index, label: link.label, url: link.url })),
  )
  const [nextKey, setNextKey] = useState(rows.length)
  const id = (suffix: string) => `${idPrefix}-${suffix}`

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  return (
    <form action={action} className={styles.form}>
      {member ? <input type="hidden" name="id" value={member.id} /> : null}

      <div className={styles.formRow}>
        <label htmlFor={id('name')}>Nom</label>
        <input id={id('name')} name="name" required maxLength={limits.name} defaultValue={member?.name ?? ''} />
        {member ? (
          <p className={styles.helperText}>Identifiant : {member.slug} (non modifiable)</p>
        ) : (
          <p className={styles.helperText}>L’identifiant est généré à partir du nom et ne pourra plus changer.</p>
        )}
      </div>

      <div className={styles.formRow}>
        <label htmlFor={id('title')}>Rôle affiché</label>
        <input id={id('title')} name="title" maxLength={limits.title} defaultValue={member?.title ?? ''} />
      </div>

      <div className={styles.formRow}>
        <label htmlFor={id('bio')}>Bio</label>
        <textarea id={id('bio')} name="bio" rows={3} maxLength={limits.bio} defaultValue={member?.bio ?? ''} />
      </div>

      <div className={styles.formRow}>
        <label htmlFor={id('photo')}>{member?.photoPath ? 'Nouvelle photo (facultatif)' : 'Photo (facultatif)'}</label>
        {member?.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoPath} alt={`Photo de ${member.name}`} className={styles.photoPreview} />
        ) : null}
        <input id={id('photo')} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </div>

      <fieldset className={styles.blocksFieldset}>
        <legend>Liens (http ou https uniquement)</legend>
        <div className={styles.linkRows}>
          {rows.map((row, index) => (
            <div key={row.key} className={styles.linkRow}>
              <input
                name="linkLabel"
                aria-label={`Libellé du lien ${index + 1}`}
                placeholder="Libellé"
                maxLength={limits.linkLabel}
                value={row.label}
                onChange={(e) => updateRow(row.key, { label: e.target.value })}
              />
              <input
                name="linkUrl"
                type="url"
                aria-label={`Adresse du lien ${index + 1}`}
                placeholder="https://…"
                maxLength={limits.linkUrl}
                value={row.url}
                onChange={(e) => updateRow(row.key, { url: e.target.value })}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                aria-label={`Retirer le lien ${index + 1}`}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              >
                Retirer
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={rows.length >= maxLinks}
              onClick={() => {
                setRows((current) => [...current, { key: nextKey, label: '', url: '' }])
                setNextKey(nextKey + 1)
              }}
            >
              Ajouter un lien
            </button>
          </div>
        </div>
      </fieldset>

      <div className={styles.checkboxes}>
        <div className={styles.formRowCheckbox}>
          <input id={id('active')} name="isActive" type="checkbox" defaultChecked={member?.isActive ?? true} />
          <label htmlFor={id('active')}>Membre actuel (décoché : ancien membre)</label>
        </div>
        <div className={styles.formRowCheckbox}>
          <input id={id('published')} name="published" type="checkbox" defaultChecked={member?.published ?? false} />
          <label htmlFor={id('published')}>Publié</label>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton}>
          {member ? 'Sauvegarder' : 'Créer le membre'}
        </button>
      </div>
    </form>
  )
}

export default MemberForm
