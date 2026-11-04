import type { MetadataRoute } from "next"

/**
 * Web app manifest (PWA): situs bisa Instal ke home screen HP user
 * (Chrome: "Add to Home screen", Android: banner instal otomatis).
 * Ikon di-generate pakai scripts/gen-icons.js (kotak emas + monogram G).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GASTROS — Top Up Game Online Murah & Proses Kilat",
    short_name: "GASTROS",
    description:
      "Top up game favorit lo: Diamond MLBB, Free Fire, CODM, LoL, dan 100+ game lainnya. Proses kilat, jalur resmi publisher, layanan 24 jam.",
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
