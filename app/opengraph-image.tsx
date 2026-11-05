import { ImageResponse } from "next/og"

/**
 * OG image global (1200x630) — dipakai semua route yang gak punya
 * opengraph-image sendiri. Tema hitam + merah brand (--accent) ala situs.
 */
export const alt = "GASTROS — Top Up Game Online Murah & Proses Kilat"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
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
          <span style={{ fontSize: 92, color: "#ffffff", lineHeight: 1.05, fontWeight: 700 }}>
            Top Up Game Murah,
          </span>
          <span style={{ fontSize: 92, color: "#ff0000", lineHeight: 1.05, fontWeight: 700 }}>
            Proses Kilat 24 Jam
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 30, color: "#9ca3af", letterSpacing: 2 }}>
            MLBB · Free Fire · CODM · LoL · 100+ game
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
