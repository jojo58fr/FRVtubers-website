import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.scss"
import AuthProvider from "../components/SessionProvider"
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'

config.autoAddCss = false

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FRVtubers - Serveur communautaire de Vtubing Francophone",
  description:
    "Serveur communautaire de Vtubing francophone. Retrouvez toutes les informations sur vos createurs preferes via le wiki et decouvrez un discord communautaire pour les fans de vtubing.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
