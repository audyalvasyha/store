/** @type {import('next').NextConfig} */

// CSP dev vs prod beda: dev butuh 'unsafe-eval' buat HMR/React refresh;
// prod makin ketat (tanpa eval). 'unsafe-inline' di script tetap perlu
// karena Next.js menulis payload/JSON inline di HTML langsung.
const isDev = process.env.NODE_ENV !== "production"
// Preview sandbox menampilkan situs di dalam iframe (Freebuff Cloud). Di dev
// saja frame itu diizinkan; production tetap 'none' + X-Frame-Options DENY
// supaya situs publik nggak bisa di-embed / di-clickjack.
const frameAncestors = isDev
  ? "frame-ancestors 'self' https://freebuff.com https://*.freebuff.com https://*.daytonaproxy01.net"
  : "frame-ancestors 'none'"
const csp = [
  "default-src 'self'",
  // Google Identity Services: script + iframe tombol + stylesheet-nya.
  `script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com/gsi/",
  "frame-src https://accounts.google.com/gsi/",
  "media-src 'self'",
  "object-src 'none'",
  frameAncestors,
  "form-action 'self'",
  "base-uri 'self'",
].join("; ")

const nextConfig = {
  // Next 16 memblokir resource dev (HMR) yang datang dari origin proxy preview.
  // Cuma berlaku saat dev — build & production tidak terpengaruh.
  allowedDevOrigins: ["*.daytonaproxy01.net"],
  images: {
    // Optimizer aktif: gambar eksternal di-resize + dikompress per ukuran layar.
    remotePatterns: [
      { protocol: "https", hostname: "static-src.vocagame.com" },
      { protocol: "https", hostname: "static.wikia.nocookie.net" },
      { protocol: "https", hostname: "api.qrserver.com" },
    ],
    // AVIF dulu (lebih kecil dari WebP), fallback WebP bila browser tidak
    // mendukung. Cache hasil optimizer 30 hari biar repeat view hit CDN.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Security headers buat site publik: CSP + cegah clickjacking (iframe),
  // MIME sniffing, kebocoran referrer lintas origin, dan fitur browser
  // sensitif (kamera/lokasi) yang toko top up gak butuh.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // X-Frame-Options cuma mendukung SAMEORIGIN/DENY (gak bisa daftar origin),
          // jadi di dev header-nya dihilangkan — CSP frame-ancestors yang jaga.
          ...(isDev ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Relevan saat deploy HTTPS (Vercel). Di HTTP (preview/localhost)
          // header ini diabaikan browser, jadi aman dicantumkan selalu.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      // Asset statis di /public — cache panjang, aman karena nama file stabil.
      {
        source: "/:assetDir(images|pay)/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ]
  },
}

export default nextConfig
