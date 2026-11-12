"use client"

import { BrandLogo } from "@/components/brand-logo"
import { WA_NUMBER } from "@/lib/catalog"

/** 62xxx -> 0xxx terformat biar gak dobel sumber data (satu pintu dari katalog). */
const WA_DISPLAY = `0${WA_NUMBER.slice(2).replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3")}`

export function Footer() {
  const marqueeText = "GASTROS / TOP UP GAME / "

  // Logo metode pembayaran — self-hosted di /public/images/payments
  // (sumber logo: github.com/hafidznoor/idn-finlogos, MIT).
  const payments = [
    { src: "/images/payments/qris.svg", label: "QRIS" },
    { src: "/images/payments/dana.svg", label: "DANA" },
    { src: "/images/payments/gopay.svg", label: "GoPay" },
    { src: "/images/payments/ovo.svg", label: "OVO" },
    { src: "/images/payments/shopee-pay.svg", label: "ShopeePay" },
    { src: "/images/payments/bca.svg", label: "Transfer BCA" },
    { src: "/images/payments/mandiri.svg", label: "Transfer Mandiri" },
  ]

  return (
    <footer className="relative bg-card border-t border-border">
      {/* Strip logo pembayaran — paling bawah semua page, tepat di atas footer
          marquee. Layout centered: label di atas, logo tengah, catatan kecil
          di bawah. Bujuk user yang ragu: "cara bayarnya apa aja" langsung keliatan. */}
      <div className="border-b border-border bg-background">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-4 md:py-5 flex flex-col items-center gap-2.5 md:gap-3 text-center">
          <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase">
            Pembayaran
          </span>
          {/* Logo ditaruh dalam chip putih masing-masing, biar brand berwarna
              gelap (BCA, Mandiri, dst.) tetap kebaca di tema hitam aplikasi dan
              strip-nya rapi (tinggi chip seragam, logo centered). */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {payments.map((pay) => (
              <div
                key={pay.label}
                className="flex items-center justify-center h-8 md:h-9 w-16 md:w-20 rounded-lg bg-[hsl(0_0%_100%)] shadow-inner"
              >
                <img
                  src={pay.src}
                  alt={`Pembayaran via ${pay.label}`}
                  loading="lazy"
                  decoding="async"
                  className="h-3.5 md:h-4 w-auto"
                />
              </div>
            ))}
          </div>
          <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
            Tanpa login akun game 🔒
          </span>
        </div>
      </div>

      {/* Marquee */}
      <div className="overflow-hidden border-b border-border py-3 md:py-8">
        <div className="flex whitespace-nowrap">
          <div className="flex animate-marquee-footer shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={`a-${i}`} className="font-sans text-[10vw] md:text-[7vw] tracking-tighter uppercase footer-stroke-text">
                {marqueeText}
              </span>
            ))}
          </div>
          <div className="flex animate-marquee-footer shrink-0" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={`b-${i}`} className="font-sans text-[10vw] md:text-[7vw] tracking-tighter uppercase footer-stroke-text">
                {marqueeText}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-5 md:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 md:mb-6">
              <BrandLogo compact subtitle="Top Up / Game Center" />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Top up instant.
              <br />
              Harga bersahabat.
              <br />
              Jalur resmi publisher.
            </p>
          </div>

          {/* Links */}
          <div>
            <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase block mb-2.5 md:mb-4">
              Navigasi
            </span>
            <nav aria-label="Navigasi footer" className="flex flex-col gap-2 md:gap-3">
              {[
                { label: "Semua Game", href: "/games" },
                { label: "Promo & Link Bio", href: "/promo" },
                { label: "Artikel & Panduan", href: "/artikel" },
                { label: "Tentang Gastros", href: "/tentang" },
                { label: "Price List", href: "/#harga" },
                { label: "Cara Order", href: "/#cara" },
                { label: "Top Up MLBB", href: "/top-up/mobile-legends" },
                { label: "Riwayat Order", href: "/orders" },
                { label: "Akun Saya", href: "/akun" },
                { label: "Kebijakan Privasi", href: "/privasi" },
              ].map((link) => (
                <a key={link.label} href={link.href} className="font-mono text-[10px] md:text-xs text-muted-foreground hover:text-accent transition-colors tracking-[0.08em] md:tracking-[0.1em] py-0.5 min-h-[32px] flex items-center">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase block mb-2.5 md:mb-4">
              Bantuan
            </span>
            <div className="flex flex-col gap-1.5 md:gap-3 font-mono text-[10px] md:text-xs text-muted-foreground">
              <span>CS Telegram: @gastros</span>
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                WhatsApp: {WA_DISPLAY}
              </a>
              <a href="mailto:cs@gastros.id" className="hover:text-accent transition-colors mt-1 break-all">
                cs@gastros.id
              </a>
              <span className="text-foreground/40 mt-1">Balasan &lt; 5 menit</span>
            </div>
          </div>

          {/* Hours */}
          <div>
            <span className="font-mono text-[9px] md:text-[10px] text-accent tracking-[0.25em] md:tracking-[0.3em] uppercase block mb-2.5 md:mb-4">
              Layanan
            </span>
            <div className="flex flex-col gap-1.5 md:gap-3 font-mono text-[10px] md:text-xs text-muted-foreground">
              <div className="flex justify-between gap-4 max-w-[180px]">
                <span>TOP UP</span>
                <span>24 JAM</span>
              </div>
              <div className="flex justify-between gap-4 max-w-[180px]">
                <span>PROSES</span>
                <span>&lt; 3 MENIT</span>
              </div>
              <div className="flex justify-between gap-4 max-w-[180px]">
                <span>GARANSI</span>
                <span className="text-accent">DANA KEMBALI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-5 md:mt-16 pt-4 md:pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
          <span className="font-mono text-[10px] md:text-[11px] text-muted-foreground">
            &copy; 2026 GASTROS // SEMUA GAME ADALAH MILIK PUBLISHER MASING-MASING
          </span>
          <div className="flex items-center gap-4 md:gap-6">
            {[
              { label: "Instagram", href: "https://www.instagram.com/gastros.id_?cplk=MTVqNjh1emh1M3B1bw==", external: true },
              { label: "TikTok", href: "https://www.tiktok.com/@gastros.id_?_r=1&_t=ZS-9BEahsvMyY8", external: true },
              { label: "Discord", href: "#", external: false },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.external ? "_blank" : undefined}
                rel={social.external ? "noopener noreferrer" : undefined}
                className="font-mono text-[10px] md:text-[11px] text-muted-foreground hover:text-accent transition-colors tracking-[0.1em] md:tracking-[0.15em] uppercase py-1 min-h-[32px] flex items-center"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-5 h-5 md:w-8 md:h-8 bg-accent" aria-hidden="true" />
    </footer>
  )
}
