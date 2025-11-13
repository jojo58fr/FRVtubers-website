'use client'

import { useCallback, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import styles from './CreditExampleList.module.scss'

type CreditExampleListProps = {
  examples: string[]
}

const COPY_TIMEOUT_MS = 2000

const CreditExampleList = ({ examples }: CreditExampleListProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = useCallback((text: string, index: number) => {
    const runCopy = async () => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        setTimeout(() => {
          setCopiedIndex((current) => (current === index ? null : current))
        }, COPY_TIMEOUT_MS)
      } catch {
        // As a fallback, try using the legacy execCommand API
        try {
          const textarea = document.createElement('textarea')
          textarea.value = text
          textarea.setAttribute('readonly', '')
          textarea.style.position = 'absolute'
          textarea.style.left = '-9999px'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
          setCopiedIndex(index)
          setTimeout(() => {
            setCopiedIndex((current) => (current === index ? null : current))
          }, COPY_TIMEOUT_MS)
        } catch {
          // ignore silently; we deliberately avoid a toast to keep UI minimal
        }
      }
    }

    void runCopy()
  }, [])

  return (
    <ul className={styles.list}>
      {examples.map((item, index) => {
        const isCopied = copiedIndex === index
        const buttonLabel = isCopied
          ? 'Crédit copié'
          : `Copier le crédit ${index + 1}`

        return (
          <li key={item} className={styles.item}>
            <div className={styles.text}>
              <span aria-hidden="true" className={styles.quoteMark}>
                “
              </span>
              <p>{item}</p>
              <span aria-hidden="true" className={styles.quoteMark}>
                ”
              </span>
            </div>
            <FontAwesomeIcon onClick={() => handleCopy(item, index)} icon={isCopied ? faCheck : faCopy} />
          </li>
        )
      })}
    </ul>
  )
}

export default CreditExampleList

