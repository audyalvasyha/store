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
  },
}

export default nextConfig
