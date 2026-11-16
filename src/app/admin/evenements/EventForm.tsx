'use client'

import { useState } from 'react'
import BlockEditor from '@/components/admin/BlockEditor'
// Import de type uniquement : event-blocks.ts dépend de node:crypto, hors du bundle client.
import type { EventBlock } from '@/lib/event-blocks'
import styles from './page.module.scss'

export type PlainAdminEvent = {
  id: string
  slug: string
  title: string
  type: string
  startsAt: string
  endsAt: string
  summary: string
  coverImagePath: string | null
  hasArticle: boolean
  published: boolean
  blocks: EventBlock[]
}

type EventFormProps = {
  action: (formData: FormData) => Promise<void>
  idPrefix: string
  event?: PlainAdminEvent
}

const TYPE_OPTIONS = [
  { value: 'GENESIS', label: 'Genesis' },
  { value: 'FRVMON', label: 'FRVmon' },
  { value: 'OTHER', label: 'Autre' },
]

const EventForm = ({ action, idPrefix, event }: EventFormProps) => {
  const [hasArticle, setHasArticle] = useState(event?.hasArticle ?? true)
  const id = (suffix: string) => `${idPrefix}-${suffix}`

  return (
    <form action={action} className={styles.form}>
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className={styles.formRow}>
        <label htmlFor={id('title')}>Titre</label>
        <input id={id('title')} name="title" required defaultValue={event?.title ?? ''} maxLength={200} />
        {event ? (
          <p className={styles.helperText}>Adresse : /evenements/{event.slug} (non modifiable)</p>
        ) : (
          <p className={styles.helperText}>L’adresse est générée à partir du titre et ne pourra plus changer.</p>
        )}
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formRow}>
          <label htmlFor={id('type')}>Type</label>
          <select id={id('type')} name="type" defaultValue={event?.type ?? 'OTHER'}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formRow}>
          <label htmlFor={id('starts')}>Début</label>
          <input id={id('starts')} name="startsAt" type="date" required defaultValue={event?.startsAt ?? ''} />
        </div>
        <div className={styles.formRow}>
          <label htmlFor={id('ends')}>Fin (facultatif)</label>
          <input id={id('ends')} name="endsAt" type="date" defaultValue={event?.endsAt ?? ''} />
        </div>
      </div>

      <div className={styles.formRow}>
        <label htmlFor={id('summary')}>Résumé</label>
        <textarea id={id('summary')} name="summary" rows={3} defaultValue={event?.summary ?? ''} maxLength={1000} />
      </div>

      <div className={styles.formRow}>
        <label htmlFor={id('cover')}>
          {event?.coverImagePath ? 'Nouvelle couverture (facultatif)' : 'Couverture (facultatif)'}
        </label>
        <input id={id('cover')} name="coverImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
        {event?.coverImagePath ? (
          <p className={styles.helperText}>Couverture actuelle : {event.coverImagePath}</p>
        ) : null}
      </div>

      <div className={styles.checkboxes}>
        <div className={styles.formRowCheckbox}>
          <input
            id={id('has-article')}
            name="hasArticle"
            type="checkbox"
            checked={hasArticle}
            onChange={(e) => setHasArticle(e.target.checked)}
          />
          <label htmlFor={id('has-article')}>Cet évènement a une page d’article</label>
        </div>
        <div className={styles.formRowCheckbox}>
          <input id={id('published')} name="published" type="checkbox" defaultChecked={event?.published ?? false} />
          <label htmlFor={id('published')}>Publié</label>
        </div>
      </div>

      {hasArticle ? (
        <fieldset className={styles.blocksFieldset}>
          <legend>Contenu de l’article</legend>
          <BlockEditor initialBlocks={event?.blocks ?? []} name="blocks" />
        </fieldset>
      ) : event ? (
        <p className={styles.helperText}>
          Le contenu de l’article déjà saisi est conservé et sera restauré si tu recoches la case.
        </p>
      ) : null}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton}>
          {event ? 'Sauvegarder' : 'Créer l’évènement'}
        </button>
      </div>
    </form>
  )
}

export default EventForm
