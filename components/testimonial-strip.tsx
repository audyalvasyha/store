/**
 * Strip testimoni di landing — social proof bergaya brutalist, satu baris
 * terus menyala (marquee). Konten statis di sini biar gampang diedit:
 * ganti/ tambah item di array TESTIMONIALS di bawah.
 */

const TESTIMONIALS = [
  { text: "Diamond MLBB masuk ~2 menit, QRIS luwes pake GoPay. Gas terus.", name: "Rizky A.", tag: "MLBB" },
  { text: "Awalnya ragu, ternyata jalur resmi. UC PUBG aman, akun masih idup.", name: "Dandi F.", tag: "PUBG" },
  { text: "CS WhatsApp bales < 5 menit jam 2 pagi. Layanan gila sih.", name: "Salsa R.", tag: "FF" },
  { text: "Harga paling masuk akal dari yang gue coba. Kuponnya nambah murah lagi.", name: "Bagas P.", tag: "VALORANT" },
  { text: "Status order bisa dipantau realtime, gak perlu nanya-nanya lagi.", name: "Nadia S.", tag: "CODM" },
] as const

/** Rating max 5 — dipake buat chip + JSON-LD restraint biAR konsisten. */
const STARS = 5

function StarRow() {
  return (
    <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
      {Array.from({ length: STARS }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 md:w-3 md:h-3 text-accent">
          <path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z" />
        </svg>
      ))}
    </span>
  )
}

export function TestimonialStrip() {
  // Marquee seamless: daftar diduplikasi 2x, animasi jalan -50%.
  const items = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section aria-label="Testimoni pembeli" className="border-t border-border bg-background overflow-hidden py-4 md:py-6">
      <div className="flex items-center gap-4 px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto mb-3 md:mb-5">
        <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase shrink-0">
          [Testimoni] &mdash; Kata Mereka
        </span>
        <div className="h-[1px] flex-1 bg-border" />
      </div>
      <div className="relative">
        {/* Width fix + gap diseragamkan via mr-* di item — animasi -50% jadi
            seamless tanpa "lompatan" di sambungan dua daftar. */}
        <div className="flex w-max animate-marquee">
          {items.map((t, i) => (
            <figure
              key={i}
              className="border border-border bg-card px-4 py-3 md:px-6 md:py-4 w-[280px] md:w-[340px] shrink-0 mr-2.5 md:mr-4 hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5 md:mb-2.5">
                <StarRow />
                <span className="font-mono text-[9px] md:text-[10px] text-accent/60 tracking-[0.2em] uppercase">{t.tag}</span>
              </div>
              <blockquote className="font-mono text-[10px] md:text-xs text-foreground/70 leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </blockquote>
              <figcaption className="mt-1.5 md:mt-2.5 font-mono text-[9px] md:text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
                {t.name} &mdash; Verified Order
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
