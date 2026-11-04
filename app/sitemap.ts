import type { MetadataRoute } from "next"

// Sitemap statis: halaman publik + semua game kurasi (lib/catalog).
// Game dinamis dari DB sengaja tidak diikutin biar route ini gak kena
// koneksi DB saat build/revalidate — /games tetap mencakup semuanya.
import { GAMES } from "@/lib/catalog"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/games`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...GAMES.map((game) => ({
      url: `${SITE_URL}/top-up/${game.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
