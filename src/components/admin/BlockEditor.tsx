'use client'

import { useState } from 'react'
// Import de type uniquement : event-blocks.ts dépend de node:crypto, hors du bundle client.
import type { EventBlock } from '@/lib/event-blocks'
import styles from './BlockEditor.module.scss'

type BlockEditorProps = {
  initialBlocks: EventBlock[]
  name: string
}

type BlockType = EventBlock['type']

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Titre',
  paragraph: 'Paragraphe',
  image: 'Image',
  video: 'Vidéo',
  lineup: 'Line-up',
  button: 'Bouton',
  gallery: 'Galerie photos',
}

const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[]

const newId = () => globalThis.crypto.randomUUID()

const createBlock = (type: BlockType): EventBlock => {
  const id = newId()
  switch (type) {
    case 'heading':
      return { id, type, text: '', level: 2 }
    case 'paragraph':
      return { id, type, text: '' }
    case 'image':
      return { id, type, path: '', caption: '' }
    case 'video':
      return { id, type, url: '' }
    case 'lineup':
      return { id, type, entries: [{ name: '', url: '' }] }
    case 'button':
      return { id, type, label: '', url: '' }
    case 'gallery':
      return { id, type }
  }
}

const BlockEditor = ({ initialBlocks, name }: BlockEditorProps) => {
  const [blocks, setBlocks] = useState<EventBlock[]>(initialBlocks)

  const patch = (id: string, changes: Record<string, unknown>) =>
    setBlocks((current) =>
      current.map((block) => (block.id === id ? ({ ...block, ...changes } as EventBlock) : block)),
    )

  const remove = (id: string) => setBlocks((current) => current.filter((block) => block.id !== id))

  const move = (index: number, offset: -1 | 1) =>
    setBlocks((current) => {
      const target = index + offset
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const renderFields = (block: EventBlock) => {
    const fieldId = (suffix: string) => `${name}-${block.id}-${suffix}`

    switch (block.type) {
      case 'heading':
        return (
          <>
            <div className={styles.field}>
              <label htmlFor={fieldId('text')}>Texte du titre</label>
              <input
                id={fieldId('text')}
                value={block.text}
                maxLength={200}
                onChange={(event) => patch(block.id, { text: event.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={fieldId('level')}>Niveau</label>
              <select
                id={fieldId('level')}
                value={block.level}
                onChange={(event) => patch(block.id, { level: event.target.value === '3' ? 3 : 2 })}
              >
                <option value={2}>Titre (niveau 2)</option>
                <option value={3}>Sous-titre (niveau 3)</option>
              </select>
            </div>
          </>
        )
      case 'paragraph':
        return (
          <div className={styles.field}>
            <label htmlFor={fieldId('text')}>Texte</label>
            <textarea
              id={fieldId('text')}
              rows={5}
              value={block.text}
              maxLength={5000}
              onChange={(event) => patch(block.id, { text: event.target.value })}
            />
          </div>
        )
      case 'image':
        return (
          <>
            {block.path ? (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.path} alt="" />
                <span className={styles.hint}>Image actuelle : {block.path}</span>
              </div>
            ) : null}
            <div className={styles.field}>
              <label htmlFor={fieldId('file')}>
                {block.path ? 'Remplacer l’image' : 'Image'} (JPEG, PNG, WebP ou GIF, 10 Mo max)
              </label>
              <input
                id={fieldId('file')}
                type="file"
                name={`blockImage:${block.id}`}
                accept="image/jpeg,image/png,image/webp,image/gif"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={fieldId('caption')}>Légende (facultatif)</label>
              <input
                id={fieldId('caption')}
                value={block.caption ?? ''}
                maxLength={300}
                onChange={(event) => patch(block.id, { caption: event.target.value })}
              />
            </div>
          </>
        )
      case 'video':
        return (
          <div className={styles.field}>
            <label htmlFor={fieldId('url')}>Lien YouTube ou Twitch</label>
            <input
              id={fieldId('url')}
              type="url"
              value={block.url}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(event) => patch(block.id, { url: event.target.value })}
            />
          </div>
        )
      case 'lineup':
        return (
          <div className={styles.lineup}>
            {block.entries.map((entry, entryIndex) => {
              const updateEntry = (changes: Partial<typeof entry>) =>
                patch(block.id, {
                  entries: block.entries.map((item, i) => (i === entryIndex ? { ...item, ...changes } : item)),
                })
              return (
                <div key={entryIndex} className={styles.lineupRow}>
                  <div className={styles.field}>
                    <label htmlFor={fieldId(`name-${entryIndex}`)}>Nom {entryIndex + 1}</label>
                    <input
                      id={fieldId(`name-${entryIndex}`)}
                      value={entry.name}
                      maxLength={80}
                      onChange={(event) => updateEntry({ name: event.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={fieldId(`url-${entryIndex}`)}>Lien {entryIndex + 1} (facultatif)</label>
                    <input
                      id={fieldId(`url-${entryIndex}`)}
                      type="url"
                      value={entry.url ?? ''}
                      placeholder="https://…"
                      onChange={(event) => updateEntry({ url: event.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.smallButton}
                    aria-label={`Retirer l’artiste ${entryIndex + 1}`}
                    onClick={() =>
                      patch(block.id, { entries: block.entries.filter((_, i) => i !== entryIndex) })
                    }
                  >
                    Retirer
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => patch(block.id, { entries: [...block.entries, { name: '', url: '' }] })}
            >
              Ajouter un artiste
            </button>
          </div>
        )
      case 'button':
        return (
          <>
            <div className={styles.field}>
              <label htmlFor={fieldId('label')}>Texte du bouton</label>
              <input
                id={fieldId('label')}
                value={block.label}
                maxLength={80}
                onChange={(event) => patch(block.id, { label: event.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={fieldId('url')}>Lien (http ou https)</label>
              <input
                id={fieldId('url')}
                type="url"
                value={block.url}
                placeholder="https://…"
                onChange={(event) => patch(block.id, { url: event.target.value })}
              />
            </div>
          </>
        )
      case 'gallery':
        return <p className={styles.hint}>Affiche les photos de la galerie de cet évènement.</p>
    }
  }

  return (
    <div className={styles.editor}>
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 ? <p className={styles.empty}>Aucun bloc pour le moment.</p> : null}

      <ol className={styles.blockList}>
        {blocks.map((block, index) => {
          const label = BLOCK_LABELS[block.type]
          return (
            <li key={block.id} className={styles.block}>
              <div className={styles.blockHeader}>
                <strong>
                  {index + 1}. {label}
                </strong>
                <div className={styles.blockActions}>
                  <button
                    type="button"
                    className={styles.smallButton}
                    aria-label={`Monter le bloc ${index + 1} (${label})`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.smallButton}
                    aria-label={`Descendre le bloc ${index + 1} (${label})`}
                    disabled={index === blocks.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${styles.smallButton} ${styles.danger}`}
                    aria-label={`Supprimer le bloc ${index + 1} (${label})`}
                    onClick={() => remove(block.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <div className={styles.blockBody}>{renderFields(block)}</div>
            </li>
          )
        })}
      </ol>

      <div className={styles.addBar} role="group" aria-label="Ajouter un bloc">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={styles.addButton}
            onClick={() => setBlocks((current) => [...current, createBlock(type)])}
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BlockEditor
