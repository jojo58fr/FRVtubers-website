import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.scss'
import AuthProvider from '../components/SessionProvider'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'

config.autoAddCss = false

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FRVtubers - Serveur communautaire de vtubing francophone',
  description:
    'Serveur communautaire de vtubing francophone. Retrouvez toutes les informations sur vos créateurs préférés et découvrez un Discord communautaire pour les fans de vtubing.',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeInitScript = `
(function() {
  try {
    var storageKey = 'theme';
    var root = document.documentElement;
    var stored = window.localStorage.getItem(storageKey);
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
  } catch (error) {
    console.warn('Unable to apply saved theme preference', error);
  }
})();`.replace('</script>', '<\\/script>')

  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
