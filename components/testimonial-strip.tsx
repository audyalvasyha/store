/**
 * Strip testimoni di landing — murni ulasan ASLI pembeli (dari order berstatus
 * SELESAI), dikirim lewat form di halaman order. Nol ulasan = section ini
 * nggak dirender sama sekali, bukan diisi contoh karangan.
 */

type Testimonial = {
  text: string
  name: string
  tag: string
  rating: number
}

/** Bintang sesuai rating asli — yang kosong dibikin redup, bukan dipaksa 5. */
function StarRow({ rating }: { rating: number }) {
  return (
    <span
      className="flex items-center gap-0.5 shrink-0"
      aria-label={`${rating} dari 5 bintang`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={`w-2.5 h-2.5 md:w-3 md:h-3 ${i < rating ? "text-accent" : "text-foreground/15"}`}
        >
          <path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z" />
        </svg>
      ))}
    </span>
  )
}

export function TestimonialStrip({ reviews }: { reviews: Testimonial[] }) {
  // Belum ada ulasan asli → jangan tampilkan apa pun. Kejujuran > social proof.
  if (reviews.length === 0) return null

  // Marquee seamless: daftar diduplikasi 2x, animasi jalan -50%.
  const items = [...reviews, ...reviews]

  return (
    <section
      aria-label="Testimoni pembeli asli"
      className="border-t border-border bg-background overflow-hidden py-4 md:py-6"
    >
      <div className="flex items-center gap-4 px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto mb-3 md:mb-5">
        <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase shrink-0">
          [Testimoni] &mdash; {reviews.length} Ulasan Asli
        </span>
        <div className="h-[1px] flex-1 bg-border" />
      </div>
      <div className="relative">
        {/* Width fix + gap diseragamkan via mr-* di item — animasi -50% jadi
            seamless tanpa "lompatan" di sambungan dua daftar. */}
        <div className="flex w-max animate-marquee">
          {items.map((t, i) => (
            <figure
              key={`${t.name}-${t.tag}-${i}`}
              className="border border-border bg-card px-4 py-3 md:px-6 md:py-4 w-[280px] md:w-[340px] shrink-0 mr-2.5 md:mr-4 hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5 md:mb-2.5">
                <StarRow rating={t.rating} />
                <span className="font-mono text-[9px] md:text-[10px] text-accent/60 tracking-[0.2em] uppercase">
                  {t.tag}
                </span>
              </div>
              <blockquote className="font-mono text-[10px] md:text-xs text-foreground/70 leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="mt-1.5 md:mt-2.5 font-mono text-[9px] md:text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
                {t.name} &mdash; Pembeli Terverifikasi
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
