import React from "react"
import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'
import { SiteSidebar } from '@/components/site-sidebar'
import { safeJsonLd } from '@/lib/jsonld'

const _bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const _jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? 'https://gastros.id'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GASTROS - Top Up Game Online Murah & Proses Kilat',
    template: '%s // GASTROS',
  },
  description: 'Top up game favorit lo: Diamond MLBB, Diamond FF, CP CODM, RP LoL, dan 100+ game lainnya. Proses kilat, jalur resmi publisher, harga bersahabat, layanan 24 jam di gastros.id.',
  keywords: [
    'top up game',
    'top up game murah',
    'top up murah',
    'gastros',
    'gastros.id',
    'top up mobile legends',
    'diamond mlbb murah',
    'top up ml termurah',
    'top up free fire',
    'diamond free fire murah',
    'top up pubg mobile',
    'uc pubg termurah',
    'top up valorant',
    'vp valorant',
    'top up genshin impact',
    'genesis crystal murah',
    'top up honkai star rail',
    'top up codm',
    'cp codm murah',
    'isi diamond',
    'top up via qris',
    'top up dana gopay ovo',
    'top up game 24 jam',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GASTROS - Top Up Game Online Murah & Proses Kilat',
    description: 'Top up instant, jalur resmi publisher, layanan 24 jam. Pilih game, isi ID, gas!',
    url: SITE_URL,
    siteName: 'GASTROS',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GASTROS — Top Up Game Online',
    description: 'Top up instant, jalur resmi publisher, layanan 24 jam. Pilih game, isi ID, gas!',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'PQJzBS9c22AmTxaG6JCT40dDqEAIeYlxJbjh_JBwyUg',
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
  // JSON-LD: identitas situs buat Google — Organization + WebSite.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'GASTROS',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        description:
          'Layanan top up game dan produk digital untuk pemain Indonesia, dengan proses kilat lewat jalur resmi publisher.',
        email: 'cs@gastros.id',
        sameAs: [
          'https://www.instagram.com/gastros.id_',
          'https://www.tiktok.com/@gastros.id_',
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'cs@gastros.id',
            telephone: '+6281373634190',
            areaServed: 'ID',
            availableLanguage: ['id'],
            url: `${SITE_URL}/tentang`,
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'GASTROS',
        url: SITE_URL,
        inLanguage: 'id-ID',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  }

  return (
    <html lang="id" className={`${_bebasNeue.variable} ${_jetbrainsMono.variable}`}>
      <body className="font-mono antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        {children}
        <SiteSidebar />
        <FloatingWhatsApp />
        <Analytics />
      </body>
    </html>
  )
}
