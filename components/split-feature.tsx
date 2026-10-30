"use client"

import { useEffect, useRef, useState } from "react"

const stats = [
  { value: "24", label: "Jam Nonstop", suffix: "/7" },
  { value: "3", label: "Menit Proses", suffix: "m" },
  { value: "99", label: "Order Berhasil", suffix: "9%" },
  { value: "50", label: "Item Top Up", suffix: "+" },
]

const steps = [
  { id: "01", title: "Pilih Game", detail: "MLBB, FF, PUBGM, Genshin, Valorant, dll." },
  { id: "02", title: "Isi ID + Nominal", detail: "Masukkan User ID & server, pilih nominal." },
  { id: "03", title: "Bayar & Kirim", detail: "QRIS / e-wallet / transfer, item masuk akun." },
]

export function WhyUs() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative" id="cara">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: Manifesto */}
        <div className="relative bg-secondary flex flex-col justify-center px-4 md:px-12 lg:px-16 py-5 md:py-24">
          <div className="absolute top-0 right-0 w-16 md:w-20 h-full diagonal-stripes opacity-20 hidden md:block" aria-hidden="true" />

          <div className={visible ? "brutal-reveal" : "opacity-0"}>
            <span className="font-mono text-[8px] md:text-[10px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-2 md:mb-8">
              [Kenapa Gas Store]
            </span>
            {/* Single line on mobile */}
            <h2 className="font-sans text-[9vw] sm:text-4xl md:text-7xl lg:text-8xl tracking-tighter text-foreground leading-[0.85] uppercase whitespace-nowrap mb-2 md:mb-8">
              Gas Itu Harus <span className="text-accent">Resmi.</span>
            </h2>
            <div className="w-8 md:w-16 h-[2px] bg-accent mb-2 md:mb-8" />
            <p className="font-mono text-[9px] md:text-sm text-muted-foreground leading-relaxed max-w-md">
              Bukan top-up abal-abal. Semua item dikirim lewat jalur resmi publisher &mdash; akun aman, harga bersahabat, layanan gabisa tidur. Kalau order bermasalah, dana kembali 100%.
            </p>
          </div>
        </div>

        {/* Right: Stats grid */}
        <div className="relative bg-card">
          <div className="grid grid-cols-2 h-full">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col justify-center items-center p-3 md:p-10 lg:p-12 border-border ${
                  i < 2 ? "border-b" : ""
                } ${i % 2 === 0 ? "border-r" : ""}`}
              >
                <div
                  className={visible ? "brutal-reveal" : "opacity-0"}
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  <span className="font-sans text-[10vw] md:text-6xl lg:text-8xl text-foreground leading-none">
                    {stat.value}
                    <span className="text-accent">{stat.suffix}</span>
                  </span>
                  <span className="font-mono text-[7px] md:text-[10px] text-muted-foreground block mt-1 md:mt-3 tracking-[0.08em] md:tracking-[0.2em] uppercase text-center">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 md:w-16 md:h-16 bg-accent" aria-hidden="true" />
        </div>
      </div>

      {/* Cara order : 3 langkah */}
      <div className="bg-background border-t border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-5 md:py-14">
          <span className={`font-mono text-[8px] md:text-[10px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-3 md:mb-6 ${visible ? "brutal-reveal" : "opacity-0"}`}>
            [Cara Order]
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`relative border border-border bg-card p-4 md:p-8 group hover:border-accent transition-colors duration-300 ${visible ? "anim-counter-pop" : "opacity-0"}`}
                style={{ animationDelay: `${0.3 + i * 0.15}s` }}
              >
                <span className="font-mono text-[8px] md:text-xs text-accent/60 group-hover:text-accent transition-colors tabular-nums">
                  {step.id}
                </span>
                <h3 className="font-sans text-2xl md:text-4xl text-foreground tracking-tighter uppercase mt-2 group-hover:text-accent transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="font-mono text-[9px] md:text-xs text-muted-foreground leading-relaxed mt-2 md:mt-4">
                  {step.detail}
                </p>
                <span className="font-sans text-[4rem] md:text-[6rem] leading-none text-foreground/[0.04] absolute top-2 right-3 select-none pointer-events-none" aria-hidden="true">
                  {step.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
