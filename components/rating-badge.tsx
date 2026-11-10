/** Badge bintang rata-rata untuk kartu game — hidden kalau belum ada ulasan. */
export function RatingBadge({
  rating,
  className = "",
}: {
  rating?: { average: number; count: number }
  className?: string
}) {
  if (!rating || rating.count === 0) return null
  return (
    <span
      role="img"
      className={`inline-flex items-center gap-1 border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[9px] md:text-[10px] text-foreground/70 tracking-[0.05em] tabular-nums ${className}`}
      aria-label={`Rating ${rating.average} dari 5, ${rating.count} ulasan`}
    >
      <span className="text-accent" aria-hidden="true">
        ★
      </span>
      {rating.average.toFixed(1)}
      <span className="text-foreground/35">({rating.count})</span>
    </span>
  )
}
