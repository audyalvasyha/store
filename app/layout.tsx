import React from "react"
import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const _bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const _jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'GAS STORE // Top Up Game Online',
  description: 'Top up game favorit lo: Diamond MLBB, UC PUBG, VP Valorant, Genesis Genshin. Proses kilat, harga bersahabat, layanan 24 jam.',
  openGraph: {
    title: 'GAS STORE // Top Up Game Online',
    description: 'Top up instant, jalur resmi publisher, layanan 24 jam. Pilih game, isi ID, gas!',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#080808',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${_bebasNeue.variable} ${_jetbrainsMono.variable}`}>
      <body className="font-mono antialiased overflow-x-hidden">{children}</body>
    </html>
  )
}
