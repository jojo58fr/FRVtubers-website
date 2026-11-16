'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import PrivacyNotice from '@/components/legal/PrivacyNotice'

export default function LoginPage() {
  return (
    <div lang="fr" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition duration-200 dark:text-indigo-400 dark:bg-indigo-900 dark:hover:bg-indigo-800">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Retour à l’accueil
          </Link>
        </div>
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Connexion à FRVtubers
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Retrouve ton compte avec Discord
          </p>
        </div>
        <div className="space-y-6">
          <PrivacyNotice kind="discord" />
          <button
            onClick={() => signIn('discord', { callbackUrl: '/' })}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#5865F2] hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] transition duration-200"
          >
            <FontAwesomeIcon icon={faDiscord} className="mr-2" />
            Se connecter avec Discord
          </button>

          <Link href="/mentions-legales" className="block text-center text-sm underline">Mentions légales</Link>
        </div>
      </div>
    </div>
  )
}
