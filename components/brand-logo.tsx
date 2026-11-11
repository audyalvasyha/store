import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"

/**
 * Lockup brand: mark merah + wordmark Bebas + sublabel mono.
 * Dipakai di header publik, panel admin, dan footer.
 */
export function BrandLogo({
  href = "/",
  subtitle = "Top Up / Game Center",
  compact = false,
  className = "",
  ariaLabel,
}: {
  href?: string
  subtitle?: string | null
  compact?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? `GASTROS — ${subtitle ?? "Top Up Game Center"}`}
      className={`group flex min-w-0 items-center gap-2.5 ${className}`}
    >
      <BrandMark
        className={`${compact ? "h-7 w-7" : "h-8 w-8 md:h-9 md:w-9"} shrink-0`}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={`font-sans uppercase leading-none tracking-[0.08em] text-foreground ${
            compact ? "text-xl" : "text-[22px] md:text-[26px]"
          }`}
        >
          GASTROS
        </span>
        {subtitle ? (
          <span className="mt-1 hidden truncate font-mono text-[7px] uppercase leading-none tracking-[0.24em] text-foreground/45 sm:block md:text-[8px]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  )
}
