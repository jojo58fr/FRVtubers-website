'use client'

import { useMemo, useState } from 'react'
import emailjs from '@emailjs/browser'

type Status = 'idle' | 'sending' | 'success' | 'error' | 'misconfigured'

type ContactFormProps = {
  className?: string
  successClassName?: string
  errorClassName?: string
}

const ContactForm = ({ className, successClassName, errorClassName }: ContactFormProps) => {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const config = useMemo(() => {
    return {
      serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim() || null,
      templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim() || null,
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim() || null,
    }
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!config.serviceId || !config.templateId || !config.publicKey) {
      setStatus('misconfigured')
      setMessage('Le formulaire n’est pas configuré côté client.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name')?.toString().trim() ?? ''
    const email = formData.get('email')?.toString().trim() ?? ''
    const subject = formData.get('subject')?.toString().trim() ?? ''
    const body = formData.get('message')?.toString().trim() ?? ''

    if (!name || !email || !subject || !body) {
      setStatus('error')
      setMessage('Tous les champs sont obligatoires.')
      return
    }

    setStatus('sending')
    setMessage('')

    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        {
          from_name: name,
          reply_to: email,
          subject,
          message: body,
        },
        { publicKey: config.publicKey }
      )

      form.reset()
      setStatus('success')
      setMessage('Message envoyé. Merci !')
    } catch (error) {
      console.error('EmailJS error', error)
      setStatus('error')
      setMessage('Envoi impossible. Réessaie plus tard.')
    }
  }

  const statusClassName = status === 'success' ? successClassName : errorClassName
  const showMessage = status !== 'idle' && status !== 'sending' && message.length > 0

  return (
    <form className={className} onSubmit={submit} noValidate>
      <label>
        <span>Nom et prénom</span>
        <input type="text" name="name" placeholder="Ton nom complet" required />
      </label>
      <label>
        <span>Adresse e-mail</span>
        <input type="email" name="email" placeholder="nom@domaine.com" required />
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
        {status === 'sending' ? 'Envoi en cours…' : 'Envoyer'}
      </button>
      {showMessage && statusClassName && (
        <p className={statusClassName}>
          {message}
        </p>
      )}
    </form>
  )
}

export default ContactForm
