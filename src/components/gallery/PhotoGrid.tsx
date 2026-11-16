'use client'

import { useEffect, useRef, useState } from 'react'
import type { PhotoSummary } from '@/lib/events'
import styles from './PhotoGrid.module.scss'

type PhotoGridProps = {
  photos: PhotoSummary[]
  altPrefix?: string
}

const PhotoGrid = ({ photos, altPrefix = 'Photo' }: PhotoGridProps) => {
  const [current, setCurrent] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])
  const openerRef = useRef<number | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (current !== null && dialog && !dialog.open) dialog.showModal()
  }, [current])

  const count = photos.length
  const photo = current !== null ? photos[current] : null

  const openAt = (index: number) => {
    openerRef.current = index
    setCurrent(index)
  }

  // Navigation circulaire : après la dernière photo, retour à la première.
  const move = (delta: number) => {
    setCurrent((index) => (index === null || count === 0 ? index : (index + delta + count) % count))
  }

  const handleClose = () => {
    setCurrent(null)
    const opener = openerRef.current
    if (opener !== null) thumbRefs.current[opener]?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
  }

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close()
  }

  const altFor = (item: PhotoSummary) => item.caption ?? altPrefix

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.thumb}
              ref={(node) => {
                thumbRefs.current[index] = node
              }}
              onClick={() => openAt(index)}
              aria-label={`Agrandir la photo ${index + 1} sur ${count}${item.caption ? ` : ${item.caption}` : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.path}
                alt={altFor(item)}
                loading="lazy"
                width={item.width ?? undefined}
                height={item.height ?? undefined}
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="Visionneuse de photos"
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        onClick={handleDialogClick}
      >
        {photo ? (
          <div className={styles.viewer}>
            <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Fermer la visionneuse">
              ✕
            </button>
            <div className={styles.stage}>
              {count > 1 ? (
                <button type="button" className={styles.nav} onClick={() => move(-1)} aria-label="Photo précédente">
                  ‹
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.path} alt={altFor(photo)} className={styles.full} />
              {count > 1 ? (
                <button type="button" className={styles.nav} onClick={() => move(1)} aria-label="Photo suivante">
                  ›
                </button>
              ) : null}
            </div>
            <div className={styles.info} aria-live="polite">
              {photo.caption ? <p className={styles.caption}>{photo.caption}</p> : null}
              {photo.photographer ? <p className={styles.credit}>Photo : {photo.photographer}</p> : null}
              <p className={styles.counter}>
                {(current ?? 0) + 1} / {count}
              </p>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  )
}

export default PhotoGrid
