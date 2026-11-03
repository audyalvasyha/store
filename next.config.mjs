/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
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
  // Security headers dasar buat site publik: cegah clickjacking (iframe),
  // MIME sniffing, dan kebocoran referrer lintas origin.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
