import type { MetadataRoute } from "next"

// Sitemap kini dinamis: halaman publik + SEMUA game (katalog statis + DB).
// Game DB yang tadinya tidak diikutin supaya gak kena koneksi DB saat build,
// sekarang ditarik runtime dengan revalidate 1 jam + fallback aman ke katalog
// statis kalau DB down — route ini gak akan bikin isi sitemap kosong/hilang.
import { GAMES } from "@/lib/catalog"
import { getDynamicGames } from "@/lib/content"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Basis: katalog statis (urutan stabil, selalu ada).
  let slugs = GAMES.map((g) => g.slug)

  try {
    const all = await getDynamicGames()
    if (all?.length) {
      // Merge + dedupe, jaga urutan lama di depan supaya gak bolak-balik tiap revalidate.
      slugs = [...slugs, ...all.map((g) => g.slug).filter((s) => !slugs.includes(s))]
    }
  } catch {
    // DB down atau belum di-set → sitemap tetap ada dengan katalog statis.
  }

  return [
    { url: `${SITE_URL()}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL()}/games`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL()}/top-up/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}

function SITE_URL(): string {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"
}
