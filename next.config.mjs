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
}

export default nextConfig
