import type { Metadata } from "next"
import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { EditorialHeader } from "@/components/editorial-header"
import { Footer } from "@/components/footer"
import { safeJsonLd } from "@/lib/jsonld"
import { WA_NUMBER } from "@/lib/catalog"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"
const DESCRIPTION =
  "Kenali GASTROS: layanan top up game untuk pemain Indonesia, cara kerja order, prinsip keamanan, dan kebijakan editorial konten."
const UPDATED = "11 November 2026"

export const metadata: Metadata = {
  title: "Tentang Gastros",
  description: DESCRIPTION,
  alternates: {
    canonical: "/tentang",
  },
  openGraph: {
    title: "Tentang Gastros // GASTROS",
    description: DESCRIPTION,
    url: "/tentang",
    type: "website",
  },
}

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/tentang#page`,
        name: "Tentang Gastros",
        description: DESCRIPTION,
        url: `${SITE_URL}/tentang`,
        inLanguage: "id-ID",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tentang", item: `${SITE_URL}/tentang` },
        ],
      },
    ],
  }

  return (
    <main className="relative min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="noise-overlay" aria-hidden="true" />
      <EditorialHeader />

      <article className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-6 md:px-8 md:pb-20 md:pt-10 lg:px-12">
        <div className="mb-4 flex items-center gap-3 md:mb-6">
          <BackButton />
        </div>

        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/35 md:mb-10"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground/60">Tentang</span>
        </nav>

        <header className="border-b border-border pb-7 md:pb-10">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
            [Tentang] — Di balik layar
          </span>
          <h1 className="font-sans text-[15vw] uppercase leading-[0.86] tracking-tighter text-foreground sm:text-6xl md:text-7xl">
            Kenalan dulu<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/55 md:text-xs">
            GASTROS adalah layanan top up game dan produk digital untuk pemain
            Indonesia. Kami bikin proses isi Diamond, UC, VP, dan currency game
            lain jadi lebih simpel — tanpa perlu login akun game.
          </p>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/35">
            Terakhir diperbarui: {UPDATED}
          </p>
        </header>

        <div className="mt-7 flex flex-col gap-7 font-mono text-[11px] leading-[1.85] text-foreground/60 md:mt-10 md:gap-9 md:text-[12px]">
          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Apa yang kami kerjakan
            </h2>
            <p>
              Kami menyediakan halaman top up per game, mulai dari{" "}
              <Link href="/top-up/mobile-legends" className="text-accent underline underline-offset-2 hover:opacity-75">
                Mobile Legends
              </Link>
              ,{" "}
              <Link href="/top-up/free-fire" className="text-accent underline underline-offset-2 hover:opacity-75">
                Free Fire
              </Link>
              , PUBG Mobile, Valorant, sampai game lain di{" "}
              <Link href="/games" className="text-accent underline underline-offset-2 hover:opacity-75">
                katalog GASTROS
              </Link>
              . Kamu cukup memilih nominal, mengisi User ID (dan Server ID kalau
              dibutuhkan), lalu menyelesaikan pembayaran.
            </p>
            <p className="mt-3">
              Item dikirim lewat penyedia/partner pengiriman resmi, bukan lewat
              pembelian akun dari pihak sembarangan. GASTROS bukan afiliasi resmi
              publisher game; nama game dan mata uang tetap milik publisher
              masing-masing.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Cara kerja order
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 marker:text-accent">
              <li>Pilih game dan nominal yang kamu butuhkan di halaman top up.</li>
              <li>Isi User ID — tambahkan Server ID kalau game-nya meminta.</li>
              <li>Selesaikan pembayaran lewat metode yang tersedia.</li>
              <li>
                Pantau status lewat halaman order. Setelah pembayaran terverifikasi,
                item diproses otomatis atau dibantu tim CS kalau provider sedang
                terkendala.
              </li>
            </ol>
            <p className="mt-3">
              Butuh bantuan? CS kami aktif lewat{" "}
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                WhatsApp
              </a>{" "}
              dan email{" "}
              <a href="mailto:cs@gastros.id" className="text-accent underline underline-offset-2 hover:opacity-75">
                cs@gastros.id
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Prinsip kami
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
              <li>
                <strong className="text-foreground/80">Harga jelas:</strong> nominal
                dan total pembayaran ditampilkan sebelum kamu membayar.
              </li>
              <li>
                <strong className="text-foreground/80">Tanpa password game:</strong>{" "}
                kami tidak pernah meminta password, PIN, kode OTP, atau akses login
                akun game.
              </li>
              <li>
                <strong className="text-foreground/80">Status transparan:</strong>{" "}
                setiap order punya kode dan halaman status yang bisa dipantau.
              </li>
              <li>
                <strong className="text-foreground/80">Bantuan manusia:</strong>{" "}
                kalau ada kendala, CS bantu cek order dan proses refund sesuai
                ketentuan.
              </li>
            </ul>
          </section>

          <section id="redaksi">
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Redaksi & konten
            </h2>
            <p>
              Artikel di{" "}
              <Link href="/artikel" className="text-accent underline underline-offset-2 hover:opacity-75">
                Jurnal Gastros
              </Link>{" "}
              ditulis dan diedit oleh Tim Gastros untuk membantu pembeli memahami
              istilah top up, keamanan akun, dan cara bertransaksi yang lebih aman.
              Kami tidak memuat ulasan berbayar atau rating palsu; ulasan pembeli
              yang tampil berasal dari order yang sudah berstatus selesai.
            </p>
            <p className="mt-3">
              Kalau kamu menemukan informasi yang perlu dikoreksi, kirim detailnya
              ke{" "}
              <a href="mailto:cs@gastros.id" className="text-accent underline underline-offset-2 hover:opacity-75">
                cs@gastros.id
              </a>
              . Kami akan meninjau dan memperbarui artikel kalau memang perlu.
            </p>
          </section>

          <section className="border border-border bg-card p-4 md:p-5">
            <h2 className="mb-2 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Kontak
            </h2>
            <p>
              Email:{" "}
              <a href="mailto:cs@gastros.id" className="text-accent underline underline-offset-2 hover:opacity-75">
                cs@gastros.id
              </a>
              <br />
              WhatsApp:{" "}
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                0813-7363-4190
              </a>
              <br />
              Instagram:{" "}
              <a
                href="https://www.instagram.com/gastros.id_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                @gastros.id_
              </a>
              <br />
              TikTok:{" "}
              <a
                href="https://www.tiktok.com/@gastros.id_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                @gastros.id_
              </a>
            </p>
            <p className="mt-3">
              Data yang kami proses dijelaskan di{" "}
              <Link href="/privasi" className="text-accent underline underline-offset-2 hover:opacity-75">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  )
}
