import Link from "next/link"
import type { Metadata } from "next"
import { BrandLogo } from "@/components/brand-logo"
import { BrandMark } from "@/components/brand-mark"
import { AuthNav } from "@/components/auth-nav"
import { SidebarMenuButton } from "@/components/site-sidebar"
import { Footer } from "@/components/footer"
import { GameArtwork } from "@/components/game-artwork"
import { formatIDR, lowestPrice } from "@/lib/catalog"
import { getDynamicGames } from "@/lib/content"
import { getFeaturedCoupon } from "@/lib/coupons"
import {
  appendAttribution,
  attributionFromSearchParams,
} from "@/lib/attribution"

const SITE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://gastros.id"

export const revalidate = 30

export const metadata: Metadata = {
  title: "Promo Top Up Game — Gas Nonstop",
  description:
    "Link promo GASTROS: top up diamond MLBB, FF, UC PUBG, VP Valorant, dan game lain lewat jalur resmi publisher. Proses <3 menit, tanpa login akun, bayar QRIS/e-wallet.",
  alternates: {
    canonical: "/promo",
  },
  openGraph: {
    title: "Promo Top Up Game — Gas Nonstop // GASTROS",
    description:
      "Top up resmi, harga final, proses <3 menit. Cek harga game favoritmu di GASTROS.",
    url: "/promo",
    type: "website",
  },
}

export default async function PromoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value)
    else if (Array.isArray(value) && value[0]) query.set(key, value[0])
  }
  const attribution = attributionFromSearchParams(query)
  const link = (href: string) => appendAttribution(href, attribution)

  const [games, coupon] = await Promise.all([
    getDynamicGames(),
    getFeaturedCoupon(),
  ])

  const picks = games
    .filter((game) => game.denominations.length > 0)
    .sort(
      (a, b) =>
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 4)
  const primary = picks[0]

  const couponQuery = coupon ? `coupon=${encodeURIComponent(coupon.code)}` : ""
  const gameHref = (slug: string) =>
    link(`/top-up/${slug}${couponQuery ? `?${couponQuery}` : ""}`)
  const couponHref = primary ? gameHref(primary.slug) : link("/games")
  const couponValue = coupon
    ? coupon.kind === "percent"
      ? `${coupon.value}%`
      : formatIDR(coupon.value)
    : ""

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-6 lg:px-12">
          <BrandLogo compact />
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-8">
            <Link
              href={link("/")}
              className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/50 transition-colors hover:text-foreground sm:block md:text-[11px]"
            >
              Home
            </Link>
            <Link
              href={link("/games")}
              className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/50 transition-colors hover:text-foreground sm:block md:text-[11px]"
            >
              Games
            </Link>
            <AuthNav />
            <SidebarMenuButton />
          </nav>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-12">
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-8 bg-accent md:w-12" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent md:text-xs md:tracking-[0.35em]">
              [Link Resmi] // Gas Nonstop
            </span>
          </div>

          <h1 className="font-sans text-[15vw] uppercase leading-[0.82] tracking-tighter text-foreground sm:text-[9vw] lg:text-[7.4vw]">
            Top Up
            <br />
            <span className="text-accent">Resmi.</span> Gas.
          </h1>

          <p className="mt-5 max-w-lg font-mono text-[11px] leading-relaxed text-foreground/60 md:mt-7 md:text-sm">
            Diamond MLBB, FF, UC PUBG, VP Valorant, dan game lain masuk akun
            lewat jalur resmi publisher. Tanpa login akun, harga final, proses
            di bawah 3 menit.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row md:mt-8">
            <Link
              href={link("/games")}
              className="inline-flex min-h-[48px] items-center justify-center bg-accent px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition-transform hover:scale-[1.01] hover-glitch md:px-7 md:text-sm"
            >
              Cek Harga Game
            </Link>
            {primary ? (
              <Link
                href={gameHref(primary.slug)}
                className="inline-flex min-h-[48px] items-center justify-center border border-foreground/25 px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/75 transition-colors hover:border-foreground hover:text-foreground md:px-7 md:text-sm"
              >
                Top Up {primary.short}
              </Link>
            ) : null}
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-foreground/45 md:mt-10 md:text-[10px]">
            <span>✓ Jalur resmi publisher</span>
            <span>✓ Tanpa login akun</span>
            <span>✓ QRIS / e-wallet</span>
            <span>✓ Garansi dana kembali</span>
          </div>
        </div>

        <div className="relative z-10 border border-border bg-card/80 p-4 backdrop-blur md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-accent md:text-[10px]">
                [Link Cepat]
              </span>
              <h2 className="mt-1 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
                Pilih game.
              </h2>
            </div>
            <BrandMark className="h-8 w-8 shrink-0 md:h-10 md:w-10" />
          </div>

          <div className="flex flex-col gap-2">
            {picks.map((game, index) => (
              <Link
                key={game.slug}
                href={gameHref(game.slug)}
                className="group flex items-center gap-3 border border-border bg-background/60 p-2.5 transition-colors hover:border-accent/70 md:p-3"
              >
                <span className="font-mono text-[9px] text-foreground/30">
                  0{index + 1}
                </span>
                <span className="relative h-11 w-11 shrink-0 overflow-hidden border border-border md:h-12 md:w-12">
                  <GameArtwork
                    game={game}
                    sizes="48px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    initialsClassName="text-base"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-lg uppercase leading-none tracking-tight text-foreground group-hover:text-accent md:text-xl">
                    {game.name}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-foreground/40 md:text-[10px]">
                    Mulai {formatIDR(lowestPrice(game))}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-foreground/30 transition-colors group-hover:text-accent">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>

          <Link
            href={link("/games")}
            className="mt-3 flex min-h-[40px] items-center justify-center border border-border font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/50 transition-colors hover:border-accent hover:text-accent"
          >
            Semua Game &rarr;
          </Link>

          {coupon ? (
            <div className="mt-3 border border-accent/60 bg-accent/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                    Kupon aktif
                  </span>
                  <span className="mt-1 block font-sans text-2xl uppercase leading-none tracking-tight text-foreground">
                    {coupon.code}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-foreground/50">
                    Hemat {couponValue} · min. {formatIDR(coupon.minSpend)}
                  </span>
                </div>
                <Link
                  href={couponHref}
                  className="inline-flex min-h-[40px] shrink-0 items-center border border-accent bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-85"
                >
                  Pakai
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-y border-border bg-card/30">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-2 gap-3 px-4 py-5 md:grid-cols-4 md:gap-6 md:px-8 md:py-7 lg:px-12">
          {[
            { value: "24/7", label: "Layanan nonstop" },
            { value: "<3 mnt", label: "Rata-rata proses" },
            { value: "100%", label: "Jalur resmi publisher" },
            { value: "QRIS", label: "E-wallet & bank" },
          ].map((item) => (
            <div key={item.label} className="border-l border-accent/60 pl-3 md:pl-4">
              <span className="block font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-4xl">
                {item.value}
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/40 md:text-[10px]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-8 md:py-20 lg:px-12">
        <div className="mb-6 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-accent md:text-xs">
              [Game Populer]
            </span>
            <h2 className="mt-2 font-sans text-4xl uppercase leading-none tracking-tighter text-foreground md:text-6xl">
              Gas pilih game.
            </h2>
          </div>
          <Link
            href={link("/games")}
            className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/45 transition-colors hover:text-accent sm:block"
          >
            Lihat semua &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {picks.map((game) => (
            <Link
              key={game.slug}
              href={gameHref(game.slug)}
              className="group relative overflow-hidden border border-border bg-card transition-colors hover:border-accent/70"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <GameArtwork
                  game={game}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  initialsClassName="text-5xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
                <span className="absolute left-2.5 top-2.5 border border-accent/50 bg-background/75 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.15em] text-accent">
                  {game.currency}
                </span>
              </div>
              <div className="relative -mt-8 p-3 md:p-4">
                <h3 className="font-sans text-2xl uppercase leading-none tracking-tight text-foreground group-hover:text-accent md:text-3xl">
                  {game.short}
                </h3>
                <p className="mt-1 truncate font-mono text-[9px] text-foreground/40">
                  {game.name}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="font-mono text-[9px] text-foreground/45">
                    Mulai {formatIDR(lowestPrice(game))}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                    Top Up &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/30">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:px-8 md:py-16 lg:px-12">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-accent md:text-xs">
              [Cara Order]
            </span>
            <h2 className="mt-2 font-sans text-4xl uppercase leading-none tracking-tighter text-foreground md:text-6xl">
              3 langkah, gas.
            </h2>
            <p className="mt-4 max-w-md font-mono text-[10px] leading-relaxed text-foreground/50 md:text-xs">
              Nggak perlu bikin akun game atau kasih password. Cukup ID akun,
              nominal, dan pembayaran.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              ["01", "Pilih game & nominal", "Tentukan diamond, UC, VP, atau item yang kamu butuhkan."],
              ["02", "Isi User ID", "Tambahkan Server ID kalau game-nya meminta. Tanpa password."],
              ["03", "Bayar & pantau", "Bayar QRIS/e-wallet, lalu cek status order sampai item masuk."],
            ].map(([number, title, body]) => (
              <div key={number} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <span className="font-sans text-2xl leading-none text-accent/70 md:text-3xl">{number}</span>
                <div>
                  <h3 className="font-sans text-xl uppercase leading-none tracking-tight text-foreground md:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-foreground/45 md:text-[11px]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-14 md:px-8 md:py-24 lg:px-12">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <BrandMark variant="ghost" className="h-[70vw] w-[70vw] text-foreground/[0.025] md:h-[38vw] md:w-[38vw]" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent md:text-xs">
            [Gas Sekarang]
          </span>
          <h2 className="mx-auto mt-3 max-w-4xl font-sans text-[14vw] uppercase leading-[0.82] tracking-tighter text-foreground sm:text-6xl md:text-[8vw]">
            Top up pertama.
            <br />
            <span className="text-accent">Gas.</span> Sekarang.
          </h2>
          <p className="mx-auto mt-4 max-w-md font-mono text-[10px] leading-relaxed text-foreground/50 md:text-sm">
            Simpan link ini di bio IG/TikTok atau share ke teman yang lagi
            butuh diamond.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row md:mt-8">
            <Link
              href={link("/games")}
              className="inline-flex min-h-[48px] w-full items-center justify-center bg-accent px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition-transform hover:scale-[1.01] hover-glitch sm:w-auto md:px-8 md:text-sm"
            >
              Mulai Top Up
            </Link>
            <Link
              href={link("/artikel")}
              className="inline-flex min-h-[48px] w-full items-center justify-center border border-foreground/25 px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/70 transition-colors hover:border-foreground hover:text-foreground sm:w-auto md:px-8 md:text-sm"
            >
              Baca Panduan
            </Link>
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/30">
            {SITE_URL.replace(/^https?:\/\//, "")}/promo
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
