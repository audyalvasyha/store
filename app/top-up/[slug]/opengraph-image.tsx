import { ImageResponse } from "next/og"
import { getDynamicGame } from "@/lib/content"
import { formatIDR } from "@/lib/catalog"

/**
 * OG image per halaman top-up (1200x630): nama game + harga mulai, tema hitam
 * + merah brand yang sama dengan og image root. Next otomatis nyuntik
 * <meta property="og:image"> & <meta name="twitter:image"> di halaman slug tsb.
 * DB down → fallback ke judul generik (image tetap keluar, gak 500).
 */
export const alt = "Top Up game murah & proses kilat di GASTROS"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function TopupOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const game = await getDynamicGame(slug)
  const name = game?.name ?? slug.replace(/-/g, " ")
  const minPrice = game?.denominations?.length
    ? formatIDR(Math.min(...game.denominations.map((d) => d.price)))
    : null

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          padding: "64px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "#ff0000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 44, color: "#080808", fontWeight: 700 }}>G</span>
          </div>
          <span style={{ fontSize: 28, letterSpacing: 14, color: "#9ca3af" }}>GASTROS</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 76, color: "#ffffff", lineHeight: 1.05, fontWeight: 700 }}>
            Top Up {name}
          </span>
          <span style={{ fontSize: 54, color: "#ff0000", fontWeight: 700 }}>
            {minPrice ? `Mulai ${minPrice} · Proses Kilat` : "Proses Kilat · Layanan 24 Jam"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 30, color: "#9ca3af", letterSpacing: 2 }}>
            Jalur resmi publisher · Murah · Aman
          </span>
          <span
            style={{
              fontSize: 32,
              color: "#080808",
              background: "#ff0000",
              padding: "10px 28px",
              fontWeight: 700,
            }}
          >
            gastros.id
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
