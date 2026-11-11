import { BRAND_INK, BRAND_MARK_PATH, BRAND_RED } from "@/lib/brand"

/**
 * Mark GASTROS: kotak merah + G blok. Varian "solid" dipakai di UI,
 * varian "ghost" hanya menggambar G dengan currentColor untuk watermark.
 */
export function BrandMark({
  className,
  variant = "solid",
  title,
}: {
  className?: string
  variant?: "solid" | "ghost"
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {variant === "solid" ? (
        <>
          <rect width="64" height="64" fill={BRAND_RED} />
          <path
            d={BRAND_MARK_PATH}
            fill="none"
            stroke={BRAND_INK}
            strokeWidth="8"
            strokeLinejoin="miter"
          />
        </>
      ) : (
        <path
          d={BRAND_MARK_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinejoin="miter"
        />
      )}
    </svg>
  )
}
