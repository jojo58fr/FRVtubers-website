import Link from 'next/link'
import { isSafeHttpUrl, parseVideoUrl, type EventBlock } from '@/lib/event-blocks'
import type { PhotoSummary } from '@/lib/events'
import styles from './BlockRenderer.module.scss'

type Props = {
  blocks: EventBlock[]
  eventSlug: string
  photos: PhotoSummary[]
}

const GALLERY_PREVIEW_COUNT = 6

const buildEmbedUrl = (embedUrl: string, provider: 'youtube' | 'twitch') => {
  if (provider !== 'twitch') return embedUrl
  const parent = process.env.NEXT_PUBLIC_SITE_HOSTNAME ?? 'localhost'
  return `${embedUrl}&parent=${encodeURIComponent(parent)}`
}

const BlockRenderer = ({ blocks, eventSlug, photos }: Props) => {
  return (
    <div className={styles.blocks}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return block.level === 3 ? (
              <h3 key={block.id} className={styles.heading3}>
                {block.text}
              </h3>
            ) : (
              <h2 key={block.id} className={styles.heading2}>
                {block.text}
              </h2>
            )
          case 'paragraph':
            return (
              <p key={block.id} className={styles.paragraph}>
                {block.text}
              </p>
            )
          case 'image':
            return (
              <figure key={block.id} className={styles.figure}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.path} alt={block.caption ?? ''} loading="lazy" className={styles.image} />
                {block.caption ? <figcaption>{block.caption}</figcaption> : null}
              </figure>
            )
          case 'video': {
            const video = parseVideoUrl(block.url)
            if (!video) return null
            return (
              <div key={block.id} className={styles.video}>
                <iframe
                  src={buildEmbedUrl(video.embedUrl, video.provider)}
                  title={video.provider === 'youtube' ? 'Vidéo YouTube' : 'Vidéo Twitch'}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            )
          }
          case 'lineup':
            if (block.entries.length === 0) return null
            return (
              <ul key={block.id} className={styles.lineup}>
                {block.entries.map((entry, index) => (
                  <li key={`${entry.name}-${index}`}>
                    {entry.url && isSafeHttpUrl(entry.url) ? (
                      <a href={entry.url} target="_blank" rel="noreferrer noopener">
                        {entry.name}
                      </a>
                    ) : (
                      <span>{entry.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )
          case 'button':
            if (!isSafeHttpUrl(block.url)) return null
            return (
              <p key={block.id} className={styles.buttonRow}>
                <a className={styles.button} href={block.url} target="_blank" rel="noreferrer noopener">
                  {block.label}
                </a>
              </p>
            )
          case 'gallery':
            if (photos.length === 0) return null
            return (
              <section key={block.id} className={styles.gallery} aria-label="Aperçu des photos">
                <ul className={styles.galleryGrid}>
                  {photos.slice(0, GALLERY_PREVIEW_COUNT).map((photo) => (
                    <li key={photo.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.path} alt={photo.caption ?? ''} loading="lazy" />
                    </li>
                  ))}
                </ul>
                <Link className={styles.button} href={`/galerie/${eventSlug}`}>
                  Voir toutes les photos
                </Link>
              </section>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

export default BlockRenderer
