import { safeJsonLd } from "@/lib/jsonld"

const FAQS = [
  {
    q: "Berapa lama proses top up di Gastros?",
    a: "Rata-rata di bawah 3 menit setelah pembayaran terverifikasi. Item masuk akun game langsung lewat jalur resmi publisher, tanpa perlu login akun — cukup User ID (+ Server ID kalau game-nya minta).",
  },
  {
    q: "Metode pembayaran apa aja yang tersedia?",
    a: "QRIS (scan dari semua e-wallet & m-banking), DANA, OVO, GoPay, ShopeePay, LinkAja, Alfamart/Indomaret, dan transfer bank (BCA, BNI, BRI, Mandiri, CIMB Niaga, Bank BJB, Permata).",
  },
  {
    q: "Apakah top up di sini aman dan legal?",
    a: "Aman. Item dikirim lewat jalur resmi publisher/partner gamestone, bukan pembelian akun dari pihak sembarangan — jadi akun lu gak berisiko dibanned. Layanan aktif 24 jam, dan tiap order punya halaman status yang bisa dipantau.",
  },
  {
    q: "Ada kupon diskon atau promo?",
    a: "Ada. Masukkan kode kupon di halaman checkout, sistem otomatis hitung potongannya. Khusus pembayaran via QRIS provider, potongan kupon jadi cashback yang di-transfer setelah order selesai.",
  },
  {
    q: "Kalau item belum masuk, gimana?",
    a: "Pantau status di halaman order lu (link tersimpan otomatis di Riwayat). Kalau status belum SELESAI dalam 15 menit, chat CS WhatsApp — orderan lu tetap tercatat dan diproses sampai selesai.",
  },
]

/**
 * Section FAQ di landing — konten visible diimplementasi sama persis dengan
 * JSON-LD FAQPage (syarat Google biar schema-nya valid & eligible rich result).
 */
export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <section id="faq" aria-label="Pertanyaan yang sering ditanyakan" className="border-t border-border">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-20">
        <div className="flex items-center gap-3 mb-2 md:mb-4">
          <div className="h-[1.5px] w-5 md:w-10 bg-accent" />
          <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] md:tracking-[0.4em] uppercase">
            FAQ // Pertanyaan Umum
          </span>
        </div>
        <h2 className="font-sans text-[9vw] sm:text-4xl md:text-7xl tracking-tighter text-foreground leading-[0.85] uppercase mb-6 md:mb-12">
          Tanya Dulu <span className="text-accent">Gas.</span>
        </h2>
        <div className="grid gap-2.5 md:gap-3 lg:grid-cols-2">
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              className="group border border-border bg-card px-4 py-3 md:px-6 md:py-4 open:bg-card hover:border-foreground/40 transition-colors"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="flex items-start justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-[11px] md:text-sm text-foreground leading-relaxed">{f.q}</span>
                <span className="font-mono text-[10px] md:text-xs text-accent shrink-0 mt-0.5 group-open:hidden">
                  +
                </span>
                <span className="font-mono text-[10px] md:text-xs text-accent shrink-0 mt-0.5 hidden group-open:block">
                  −
                </span>
              </summary>
              <p className="mt-2 md:mt-3 font-mono text-[10px] md:text-xs text-foreground/60 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
