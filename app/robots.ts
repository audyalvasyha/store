/**
 * robots.txt: crawl semua halaman publik, blokir panel admin & API.
 */
import type { MetadataRoute } from "next"

function baseUrl(): string {
  const configured = process.env.APP_BASE_URL?.replace(/\/$/, "")
  return configured ?? "https://audysignin.freebuff.app"
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  }
}
