"use client"

import { useEffect, useRef, useState } from "react"

export function Footer() {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (marqueeRef.current) observer.observe(marqueeRef.current)
    return () => observer.disconnect()
  }, [])

  const marqueeText = "GAS STORE / TOP UP GAME / "

  return (
    <footer className="relative bg-card border-t border-border">
      {/* Marquee */}
      <div ref={marqueeRef} className="overflow-hidden border-b border-border py-3 md:py-8">
        <div className={`flex whitespace-nowrap transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
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

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5 md:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3 md:mb-6">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-accent" />
              <span className="font-mono text-[10px] md:text-xs tracking-[0.25em] md:tracking-[0.3em] text-foreground uppercase">
                Gas Store
              </span>
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
            <nav className="flex flex-col gap-2 md:gap-3">
              {[
                { label: "Semua Game", href: "/games" },
                { label: "Price List", href: "/#harga" },
                { label: "Cara Order", href: "/#cara" },
                { label: "Top Up MLBB", href: "/top-up/mobile-legends" },
                { label: "Riwayat Order", href: "/orders" },
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
              <span>CS Telegram: @gasstore</span>
              <span>WhatsApp: 0812-3456-7890</span>
              <a href="mailto:cs@gasstore.id" className="hover:text-accent transition-colors mt-1 break-all">
                cs@gasstore.id
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
            &copy; 2026 GAS STORE // SEMUA GAME ADALAH MILIK PUBLISHER MASING-MASING
          </span>
          <div className="flex items-center gap-4 md:gap-6">
            {["Instagram", "TikTok", "Discord"].map((social) => (
              <a key={social} href="#" className="font-mono text-[10px] md:text-[11px] text-muted-foreground hover:text-accent transition-colors tracking-[0.1em] md:tracking-[0.15em] uppercase py-1 min-h-[32px] flex items-center">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-5 h-5 md:w-8 md:h-8 bg-accent" aria-hidden="true" />
    </footer>
  )
}
