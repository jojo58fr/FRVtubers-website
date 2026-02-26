'use client'

import { useRef, useState } from 'react'
import emailjs, { type EmailJSResponseStatus } from '@emailjs/browser'
import styles from '@/app/contact/page.module.scss'

type SubmitState = 'idle' | 'sending' | 'success' | 'error'

const getEnv = (key: string) => {
  const value = process.env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

const serviceId = getEnv('NEXT_PUBLIC_EMAILJS_SERVICE_ID')
const templateId = getEnv('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID')
const publicKey = getEnv('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY')

const ContactForm = () => {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [status, setStatus] = useState<SubmitState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!serviceId || !templateId || !publicKey) {
      setStatus('error')
      setMessage('Configuration EmailJS manquante.')
      return
    }

    setStatus('sending')
    setMessage(null)

    try {
      const response = await emailjs.sendForm(serviceId, templateId, formRef.current, {
        publicKey,
      })

      if (response.status !== 200) {
        throw new Error(response.text)
      }

      formRef.current.reset()
      setStatus('success')
      setMessage('Message envoyé. Merci !')
    } catch (error) {
      const errorText =
        error && typeof error === 'object' && 'text' in error
          ? (error as EmailJSResponseStatus).text
          : 'Erreur inconnue.'
      setStatus('error')
      setMessage(`Envoi impossible. ${errorText}`)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} ref={formRef} method="post" action="">
      <label>
        <span>Nom et prénom</span>
        <input type="text" name="from_name" placeholder="Ton nom complet" required />
      </label>
      <label>
        <span>Adresse e-mail</span>
        <input type="email" name="reply_to" placeholder="nom@domaine.com" required />
      </label>
      <label>
        <span>Objet</span>
        <input type="text" name="subject" placeholder="Sujet de ton message" required />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={5} placeholder="Raconte-nous tout" required />
      </label>
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Envoi...' : 'Envoyer'}
      </button>
      {message && (
        <p className={status === 'success' ? styles.successMessage : styles.errorMessage}>{message}</p>
      )}
    </form>
  )
}

export default ContactForm
