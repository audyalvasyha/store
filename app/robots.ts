import type { MetadataRoute } from "next"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin panel (kredensial), API (internal), dan halaman detail order
      // (berisi PII user, diakses via kode order) jangan ikut diindeks.
      disallow: ["/admin", "/api/", "/orders"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
