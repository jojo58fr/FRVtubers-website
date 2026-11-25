'use client'

import { useState } from 'react'
import SocialIcon from '@/components/SocialIcon'
import { PLATFORMS, detectPlatform, getPlatform, type PlatformId } from '@/lib/social-links'
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

// `platform` null = lien libre (libellé + adresse saisis à la main).
type Row = { key: number; platform: PlatformId | null; label: string; url: string }

const buildInitialRows = (links: Array<{ label: string; url: string }>): Row[] => {
  const rows: Row[] = []
  const used = new Set<number>()
  PLATFORMS.forEach((platform) => {
    const index = links.findIndex((link, i) => !used.has(i) && detectPlatform(link.url) === platform.id)
    if (index >= 0) used.add(index)
    rows.push({ key: rows.length, platform: platform.id, label: '', url: index >= 0 ? links[index].url : '' })
  })
  links.forEach((link, i) => {
    if (!used.has(i)) rows.push({ key: rows.length, platform: null, label: link.label, url: link.url })
  })
  return rows
}

const MemberForm = ({ action, idPrefix, member, maxLinks, limits }: MemberFormProps) => {
  const [rows, setRows] = useState<Row[]>(() => buildInitialRows(member?.links ?? []))
  const [nextKey, setNextKey] = useState(rows.length)
  const id = (suffix: string) => `${idPrefix}-${suffix}`

  const usedPlatforms = new Set(rows.map((row) => row.platform))
  const missingPlatforms = PLATFORMS.filter((platform) => !usedPlatforms.has(platform.id))
  const addRow = (platform: PlatformId | null) => {
    setRows((current) => [...current, { key: nextKey, platform, label: '', url: '' }])
    setNextKey(nextKey + 1)
  }

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
        <p className={styles.helperText}>
          Laisse l’adresse vide pour ignorer un réseau. Le bouton de droite retire la ligne du formulaire.
        </p>
        <div className={styles.linkRows}>
          {rows.map((row, index) => {
            const platform = row.platform ? getPlatform(row.platform) : null
            const submittedLabel = platform ? (row.url.trim() ? platform.label : '') : row.label
            const name = platform ? platform.label : `lien libre ${index + 1}`
            const detected = platform ? row.platform : detectPlatform(row.url)
            const previewUrl = /^https?:\/\//i.test(row.url.trim()) ? row.url.trim() : null

            return (
              <div key={row.key} className={platform ? styles.linkRow : `${styles.linkRow} ${styles.linkRowCustom}`}>
                <span className={styles.linkIcon} title={name}>
                  <SocialIcon platform={detected} />
                  {platform ? <span className={styles.linkPlatform}>{platform.label}</span> : null}
                </span>

                {platform ? (
                  <input type="hidden" name="linkLabel" value={submittedLabel} />
                ) : (
                  <input
                    name="linkLabel"
                    aria-label={`Libellé du ${name}`}
                    placeholder="Libellé"
                    maxLength={limits.linkLabel}
                    value={row.label}
                    onChange={(e) => updateRow(row.key, { label: e.target.value })}
                  />
                )}
                <input
                  name="linkUrl"
                  type="url"
                  aria-label={platform ? `Adresse ${platform.label}` : `Adresse du ${name}`}
                  placeholder={platform ? platform.placeholder : 'https://…'}
                  maxLength={limits.linkUrl}
                  value={row.url}
                  onChange={(e) => updateRow(row.key, { url: e.target.value })}
                />

                <div className={styles.linkActions}>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.iconButton}
                      aria-label={`Ouvrir ${platform ? platform.label : (row.label || 'le lien')} dans un nouvel onglet`}
                    >
                      ↗
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    aria-label={`Retirer ${platform ? platform.label : name}`}
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    Retirer
                  </button>
                </div>
              </div>
            )
          })}

          <div className={styles.linkAdd}>
            {missingPlatforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                className={styles.secondaryButton}
                disabled={rows.length >= maxLinks}
                onClick={() => addRow(platform.id)}
              >
                <SocialIcon platform={platform.id} /> {platform.label}
              </button>
            ))}
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={rows.length >= maxLinks}
              onClick={() => addRow(null)}
            >
              <SocialIcon platform={null} /> Autre lien
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
