import { BRAND_INK, BRAND_MARK_PARTS, BRAND_RED } from "@/lib/brand"

/** Mark yang sama untuk next/og, karena ImageResponse nggak merender SVG inline. */
export function OgBrandMark({ size = 72 }: { size?: number }) {
  const unit = size / 64
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: size,
        height: size,
        background: BRAND_RED,
        flexShrink: 0,
      }}
    >
      {BRAND_MARK_PARTS.map((part, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: part.x * unit,
            top: part.y * unit,
            width: part.width * unit,
            height: part.height * unit,
            background: BRAND_INK,
          }}
        />
      ))}
    </div>
  )
}
