/**
 * Sitemap SEO publik: beranda, /games, dan semua halaman top-up per game.
 * Katalog dibaca dari katalog statis (tanpa DB) supaya sitemap.js bisa
 * di-pre-render saat build tanpa butuh koneksi Mongo.
 */
import type { MetadataRoute } from "next"
import { GAMES } from "@/lib/catalog"

function baseUrl(): string {
  const configured = process.env.APP_BASE_URL?.replace(/\/$/, "")
  return configured ?? "https://audysignin.freebuff.app"
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl()
  const now = new Date()

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/games`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/orders`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    ...GAMES.map((g) => ({
      url: `${base}/top-up/${g.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
