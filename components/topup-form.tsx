"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { GameItem } from "@/lib/catalog"
import { PAYMENT_METHODS, STONE_PAYMENT_METHODS, denomKind, formatIDR } from "@/lib/catalog"
import { GameArtwork } from "@/components/game-artwork"
import { getCurrentAttribution, hasAttribution } from "@/lib/attribution"
import { trackBeginCheckout } from "@/lib/marketing-events"

export type StoneVariantDenom = {
  /** Gamestone variant id (string form untuk key/button). */
  id: string
  label: string
  price: number
  detail?: string
}

const MAX_QTY = 5

/**
 * Chip kecil di tile varian: bedain item non-currency (pass/member/voucher)
 * dari currency biasa (diamond, coins, gems). Currency = tanpa chip, biar bersih.
 */
function DenomChip({ label, detail }: { label: string; detail?: string }) {
  const kind = denomKind(label, detail)
  if (kind === "currency") return null
  const text =
    kind === "pass"
      ? "★ PASS"
      : kind === "membership"
        ? "★ MEMBER"
        : kind === "voucher"
          ? "VOUCHER"
          : "BUNDLE"
  const tone =
    kind === "voucher"
      ? "border-foreground/25 text-foreground/50"
      : "border-accent/50 text-accent"
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] md:text-[10px] leading-none tracking-[0.12em] uppercase ${tone}`}
    >
      {text}
    </span>
  )
}
/** Batas awal varian yang ditampilin sebelum tombol "tampilkan semua". */
const INITIAL_VISIBLE = 12

/** Label kategori buat chip filter (nilai = DenomKind). */
const CATS = [
  ["all", "SEMUA"],
  ["pass", "★ PASS"],
  ["membership", "★ MEMBER"],
  ["voucher", "VOUCHER"],
  ["bundle", "BUNDLE"],
] as const

export function TopupForm({
  game,
  stoneVariants,
}: {
  game: GameItem
  /** Variant live dari Gamestone. Kalau ada, nominal & total pakai harga Gamestone. */
  stoneVariants?: StoneVariantDenom[]
}) {
  const stoneMode = Boolean(game.stoneSlug && stoneVariants?.length)
  const router = useRouter()

  const depoms = stoneVariants?.length ? stoneVariants : game.denominations
  const payments = stoneMode ? STONE_PAYMENT_METHODS : PAYMENT_METHODS

  const [denomId, setDenomId] = useState(depoms[0].id)
  const [quantity, setQuantity] = useState(1)
  const [userId, setUserId] = useState("")
  const [server, setServer] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [method, setMethod] = useState<string>(payments[0].id)
  const [showAll, setShowAll] = useState(false)
  const [filterQ, setFilterQ] = useState("")
  const [sortBy, setSortBy] = useState<"default" | "cheapest" | "priciest">("default")
  const [cat, setCat] = useState<"all" | "pass" | "membership" | "voucher" | "bundle">("all")
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Kupon promo: cek kode → preview potongan → ikut di-POST ke /api/orders.
  // Nimppuk di order jadi cashback (Gamestone) atau diskon (manual).
  const [couponInput, setCouponInput] = useState("")
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  // Kupon dari link promo (?coupon=...) — diterapkan ulang tiap nominal
  // berubah sampai berhasil (mis. kena minSpend di nominal awal).
  const [couponIntent, setCouponIntent] = useState<string | null>(null)

  const denom = useMemo(
    () => depoms.find((d) => d.id === denomId) ?? depoms[0],
    [depoms, denomId]
  )
  // Filter kategori (dari denomKind) + teks/harga, terus urutan.
  const filteredDepoms = useMemo(() => {
    let list = depoms
    if (cat !== "all") list = list.filter((d) => denomKind(d.label, d.detail) === cat)
    const raw = filterQ.trim().toLowerCase()
    if (raw) {
      const qNum = raw.replace(/[^0-9]/g, "")
      list = list.filter(
        (d) =>
          d.label.toLowerCase().includes(raw) ||
          (qNum && String(d.price).includes(qNum))
      )
    }
    if (sortBy === "cheapest") list = [...list].sort((a, b) => a.price - b.price)
    if (sortBy === "priciest") list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [depoms, filterQ, sortBy, cat])
  // Jumlah varian per kategori non-currency, buat chip filter + sembunyiin yang 0.
  const kindCounts = useMemo(() => {
    const c = { pass: 0, membership: 0, voucher: 0, bundle: 0 } as Record<string, number>
    for (const d of depoms) {
      const k = denomKind(d.label, d.detail)
      if (k !== "currency") c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [depoms])
  // Tetap terbuka otomatis kalau varian terpilih ada di luar list yang visible.
  const denomIdOutsideInitial = depoms.indexOf(denom) >= INITIAL_VISIBLE
  const visibleDepoms = showAll || denomIdOutsideInitial
    ? filteredDepoms
    : filteredDepoms.slice(0, INITIAL_VISIBLE)
  const total = denom.price * (stoneMode ? 1 : quantity)

  // Potongan kupon dihitung dari subtotal pilihan saat ini.
  const couponNet = Math.min(couponDiscount, total)

  async function applyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponInput).trim().toUpperCase()
    if (!code || couponBusy) return
    setCouponBusy(true)
    setCouponMsg(null)
    try {
      const res = await fetch(
        `/api/coupons/quote?code=${encodeURIComponent(code)}&gameSlug=${encodeURIComponent(game.slug)}&amount=${total}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (!res.ok) {
        setCouponCode(null)
        setCouponDiscount(0)
        setCouponMsg(data.error ?? "Kupon nggak bisa dipakai")
        return
      }
      setCouponCode(data.code)
      setCouponDiscount(data.discount ?? 0)
      // Sudah kepakai — setelah ini re-check ikut jalur kupon normal.
      setCouponIntent(null)
      setCouponMsg(
        stoneMode
          ? `Kupon ${data.code} OK — cashback Rp ${(data.discount ?? 0).toLocaleString("id-ID")} di-transfer CS setelah order selesai.`
          : `Kupon ${data.code} OK — potongan Rp ${(data.discount ?? 0).toLocaleString("id-ID")}.`
      )
    } catch {
      setCouponMsg("Koneksi bermasalah, coba lagi.")
    } finally {
      setCouponBusy(false)
    }
  }

  // Ganti game / nominal / qty → preview kupon basi, auto cek ulang.
  useEffect(() => {
    if (!couponCode) return
    void applyCoupon()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denomId, quantity])

  // Deep link dari Price List / banner promo: pilih nominal + pasang kupon
  // otomatis. Dibaca dari window (bukan useSearchParams) supaya halaman game
  // tetap ISR dan nggak kehilangan cache 30 detik.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const paramId = params.get("denom")
    const paramLabel = params.get("label")
    let nextDenomId: string | null = null
    if (paramId && depoms.some((item) => item.id === paramId)) {
      nextDenomId = paramId
    } else if (paramLabel) {
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")
      const target = normalize(paramLabel)
      const exact = depoms.find((item) => normalize(item.label) === target)
      // Provider suka beda label tipis ("86 Diamond" vs "86 Diamonds").
      // Fallback ke angka pertama yang sama biar tetap kepilih nominalnya.
      const byNumber = depoms.find(
        (item) =>
          item.label.match(/\d+/)?.[0] &&
          item.label.match(/\d+/)?.[0] === paramLabel.match(/\d+/)?.[0]
      )
      nextDenomId = exact?.id ?? byNumber?.id ?? null
    }
    if (nextDenomId) setDenomId(nextDenomId)

    const paramCoupon = params.get("coupon")?.trim().toUpperCase() ?? ""
    if (/^[A-Z0-9_-]{3,24}$/.test(paramCoupon)) {
      setCouponInput(paramCoupon)
      setCouponIntent(paramCoupon)
    }
    // Cukup sekali saat halaman dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Terapkan kupon dari URL setiap nominal/qty berubah — total yang dipakai
  // pasti sudah versi render terbaru, bukan nominal default.
  useEffect(() => {
    if (!couponIntent) return
    void applyCoupon(couponIntent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponIntent, denomId, quantity])

  function clearCoupon() {
    setCouponCode(null)
    setCouponDiscount(0)
    setCouponMsg(null)
    setCouponInput("")
    setCouponIntent(null)
  }

  // Kalau pilihan saat ini ga ada di hasil filter, auto-pilih hasil pertama
  // biar yang ke-order pasti varian yang lagi tampil di list.
  useEffect(() => {
    if ((filterQ || cat !== "all") && filteredDepoms.length && !filteredDepoms.some((d) => d.id === denomId)) {
      setDenomId(filteredDepoms[0].id)
    }
  }, [filterQ, filteredDepoms, denomId, cat])

  const uidValid = /^[A-Za-z0-9._:\-]{4,24}$/.test(userId.trim())
  const serverValid = !game.needsServer || /^[A-Za-z0-9]{1,16}$/.test(server.trim())
  const phoneValid = /^(62|0)\d{8,13}$/.test(phone.trim())
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = uidValid && serverValid && phoneValid && emailValid && agree && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const attribution = getCurrentAttribution()
    const checkoutValue = stoneMode ? total : total - couponNet
    trackBeginCheckout({
      value: checkoutValue,
      item: {
        id: denom.id,
        name: `${game.name} — ${denom.label}`,
        price: denom.price,
        quantity: stoneMode ? 1 : quantity,
      },
      coupon: couponCode,
    })

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: game.slug,
          denomId,
          quantity: stoneMode ? 1 : quantity,
          userId: userId.trim(),
          server: game.needsServer ? server.trim() : undefined,
          phone: phone.trim(),
          email: email.trim(),
          method,
          couponCode: couponCode ?? undefined,
          attribution: hasAttribution(attribution) ? attribution : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat order, coba lagi.")
        setSubmitting(false)
        return
      }
      router.push(`/orders/${data.order.code}`)
    } catch {
      setError("Koneksi bermasalah, coba lagi.")
      setSubmitting(false)
    }
  }

  return (
    <form
      id="topup-form"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 md:gap-8 items-start scroll-mt-4 md:scroll-mt-6"
    >
      <div className="flex flex-col gap-4 md:gap-6">
        {/* STEP 1: nominal */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            01 &mdash; Pilih Nominal ({game.currency})
          </legend>
          {(depoms.length > INITIAL_VISIBLE || filterQ || cat !== "all") && (
            <div className="flex flex-col gap-2 mt-2 md:mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 md:gap-3">
                <input
                  type="search"
                  value={filterQ}
                  onChange={(e) => setFilterQ(e.target.value)}
                  placeholder="Cari nominal atau harga..."
                  className="min-h-[44px] bg-background border border-border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors"
                />
                <div className="flex gap-0 border border-border">
                  {([
                    ["default", "Urutan asli"],
                    ["cheapest", "Termurah"],
                    ["priciest", "Termahal"],
                  ] as const).map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSortBy(key)}
                      aria-pressed={sortBy === key}
                      className={`inline-flex min-h-[44px] items-center justify-center px-3 md:px-4 py-2 font-mono text-xs md:text-sm tracking-[0.05em] uppercase whitespace-nowrap transition-colors ${sortBy === key
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/50 hover:text-foreground"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {kindCounts.pass + kindCounts.membership + kindCounts.voucher + kindCounts.bundle > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {CATS.filter(([key]) => key === "all" || kindCounts[key] > 0).map(([key, label]) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setCat((prev) => (prev === key ? "all" : key))}
                        aria-pressed={cat === key}
                        className={`inline-flex min-h-[40px] items-center justify-center border px-2.5 py-1.5 font-mono text-[10px] md:text-[11px] tracking-[0.08em] uppercase whitespace-nowrap transition-colors ${cat === key
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border text-foreground/60 hover:text-foreground hover:border-foreground/50"
                          }`}
                      >
                        {label} ({key === "all" ? depoms.length : kindCounts[key]})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {(filterQ || cat !== "all") && filteredDepoms.length === 0 && (
            <p className="font-mono text-[9px] md:text-[10px] text-destructive mt-2">
              Ga ada varian yang cocok buat filter ini.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 mt-2 md:mt-3">
            {visibleDepoms.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDenomId(d.id)}
                aria-pressed={denomId === d.id}
                className={`relative text-left border p-2.5 md:p-4 transition-colors duration-200 min-h-[64px] md:min-h-[96px] ${denomId === d.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-foreground/50"
                  }`}
              >
                <DenomChip label={d.label} detail={d.detail} />
                <span className={`block font-sans text-sm md:text-xl tracking-tighter uppercase leading-tight ${denomId === d.id ? "text-accent" : "text-foreground"}`}>
                  {d.label}
                </span>
                <span className="block font-mono text-[10px] md:text-[11px] text-foreground/40 mt-1">{formatIDR(d.price)}</span>
                {d.detail && (
                  <span className="block font-mono text-[9px] md:text-[10px] text-accent/70 mt-0.5 leading-snug">{d.detail}</span>
                )}
                {denomId === d.id && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent" />}
              </button>
            ))}
          </div>
          {filteredDepoms.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => {
                // Pas collapse: kalau varian terpilih di luar 12 teratas hasil
                // filter, reset ke hasil filter pertama biar list ga kebuka lagi.
                if (v && filteredDepoms.indexOf(denom) >= INITIAL_VISIBLE) {
                  setDenomId((filteredDepoms[0] ?? depoms[0]).id)
                }
                return !v
              })}
              className="w-full mt-2 md:mt-3 py-2.5 border border-border font-mono text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-foreground/60 hover:text-accent hover:border-accent/50 transition-colors"
            >
              {showAll
                ? "Tampilkan lebih sedikit"
                : `Tampilkan semua (${filteredDepoms.length} varian)`}
            </button>
          )}
        </fieldset>

        {/* STEP 2: akun */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            02 &mdash; Data Akun {game.short}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] md:text-[11px] text-foreground/60 tracking-[0.15em] uppercase">
                User ID *
              </span>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="cth: 12345678"
                autoComplete="off"
                className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${userId && !uidValid ? "border-destructive" : "border-border"}`}
              />
              {userId && !uidValid && (
                <span className="font-mono text-[9px] md:text-[10px] text-destructive">4-24 karakter, huruf/angka/._:-</span>
              )}
            </label>
            {game.needsServer && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] md:text-[11px] text-foreground/60 tracking-[0.15em] uppercase">
                  Server / Zone ID *
                </span>
                <input
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="cth: 1234"
                  autoComplete="off"
                  className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${server && !serverValid ? "border-destructive" : "border-border"}`}
                />
                {server && !serverValid && (
                  <span className="font-mono text-[9px] md:text-[10px] text-destructive">Angka/huruf tanpa spasi</span>
                )}
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] md:text-[11px] text-foreground/60 tracking-[0.15em] uppercase">
                Nomor WhatsApp *
              </span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="cth: 08123456789"
                autoComplete="tel"
                className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${phone && !phoneValid ? "border-destructive" : "border-border"}`}
              />
              {phone && !phoneValid && (
                <span className="font-mono text-[9px] md:text-[10px] text-destructive">Format 08xx / 62xx, 9-15 digit</span>
              )}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] md:text-[11px] text-foreground/60 tracking-[0.15em] uppercase">
                Email Notifikasi *
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                autoComplete="email"
                className={`bg-background border p-2.5 md:p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-colors ${email && !emailValid ? "border-destructive" : "border-border"}`}
              />
            </label>
          </div>
        </fieldset>

        {/* STEP 3: pembayaran */}
        <fieldset className="border border-border bg-card p-4 md:p-6">
          <legend className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase px-2">
            03 &mdash; Metode Pembayaran
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mt-2 md:mt-3">
            {payments.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
                className={`relative border p-2.5 md:p-4 text-left transition-colors duration-200 min-h-[56px] ${method === m.id ? "border-accent bg-accent/10" : "border-border hover:border-foreground/50"
                  }`}
              >
                <span className={`block font-sans text-sm md:text-lg tracking-tight uppercase ${method === m.id ? "text-accent" : "text-foreground"}`}>
                  {m.label}
                </span>
                <span className="block font-mono text-[9px] md:text-[10px] text-foreground/40 mt-0.5">{m.detail}</span>
                {/* Logo pembayaran asli dari brand-nya (SVG di /public/pay). */}
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {m.logos.map((lg) => (
                    <img
                      key={lg}
                      src={`/pay/${lg}.svg`}
                      alt={""}
                      aria-hidden="true"
                      loading="lazy"
                      className="h-3.5 md:h-4 w-auto max-w-12 object-contain"
                    />
                  ))}
                </span>
                {method === m.id && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent" />}
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 mt-3 md:mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--accent))]"
            />
            <span className="font-mono text-[10px] md:text-[11px] text-foreground/50 leading-relaxed">
              Data akun yang saya isi benar. Item dikirim otomatis setelah pembayaran terverifikasi &mdash; salah ID bukan tanggung jawab Gastros.
            </span>
          </label>
        </fieldset>
      </div>

      {/* ORDER SUMMARY */}
      <aside className="lg:sticky lg:top-4 border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3 md:mb-5">
          [Ringkasan]
        </span>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 overflow-hidden border border-border">
            <GameArtwork
              game={game}
              sizes="56px"
              className="object-cover"
              initialsClassName="text-base md:text-xl"
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-sans text-lg md:text-2xl text-foreground tracking-tighter uppercase truncate">{game.short}</h2>
            <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 uppercase tracking-[0.1em] block truncate">
              {game.currency}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 font-mono text-[10px] md:text-xs border-t border-border pt-3 md:pt-4">
          <div className="flex justify-between gap-2">
            <span className="text-foreground/50">Nominal</span>
            <span className="text-foreground text-right">{denom.label}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="text-foreground/50">Jumlah</span>
            {stoneMode ? (
              <span className="text-foreground tabular-nums">1</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
                  aria-label="Kurangi jumlah"
                >
                  -
                </button>
                <span className="text-foreground tabular-nums w-5 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                  className="flex h-10 w-10 items-center justify-center border border-border text-foreground transition-colors hover:border-accent hover:text-accent"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </span>
            )}
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-foreground/50">Bayar via</span>
            <span className="text-foreground uppercase">{payments.find((m) => m.id === method)?.label}</span>
          </div>
        </div>

        {/* Kupon promo */}
        <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4">
          {couponCode ? (
            <div className="flex items-center justify-between gap-2 border border-accent/40 bg-accent/5 px-2.5 py-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] md:text-xs text-accent uppercase block truncate">Kupon {couponCode}</span>
                <span className="font-mono text-[9px] md:text-[10px] text-foreground/50 block">
                  {stoneMode ? "Cashback setelah selesai" : "Diskon langsung"} — {formatIDR(couponNet)}
                </span>
              </div>
              <button
                type="button"
                onClick={clearCoupon}
                className="inline-flex min-h-[40px] shrink-0 items-center px-1 font-mono text-[9px] text-foreground/40 transition-colors hover:text-destructive md:text-[10px]"
              >
                Hapus
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    setCouponIntent(null)
                    void applyCoupon()
                  }
                }}
                placeholder="KODE KUPON"
                className="min-h-[44px] min-w-0 flex-1 bg-background border border-border px-2.5 py-2 font-mono text-[10px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent md:text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setCouponIntent(null)
                  void applyCoupon()
                }}
                disabled={couponBusy || !couponInput.trim()}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center border border-border px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-40 md:text-xs"
              >
                {couponBusy ? "..." : "Cek"}
              </button>
            </div>
          )}
          {couponMsg && (
            <p className={`mt-2 font-mono text-[9px] md:text-[10px] leading-relaxed ${couponCode ? "text-accent" : "text-destructive"}`}>
              {couponMsg}
            </p>
          )}
        </div>

        <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] md:text-[11px] text-foreground/50 tracking-[0.2em] uppercase">Total</span>
          <span className="font-sans text-2xl md:text-3xl text-accent tabular-nums">{formatIDR(stoneMode ? total : total - couponNet)}</span>
        </div>
        {couponCode && stoneMode && (
          <p className="font-mono text-[9px] md:text-[10px] text-foreground/45 mt-1.5 leading-relaxed">
            Bayar full {formatIDR(total)} ke provider — cashback {formatIDR(couponNet)} dari Gastros setelah order selesai.
          </p>
        )}

        {error && (
          <p className="mt-3 font-mono text-[10px] md:text-[11px] text-destructive border border-destructive/40 p-2 leading-relaxed">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full mt-4 inline-flex items-center justify-center font-mono text-[11px] md:text-sm tracking-[0.2em] uppercase px-5 py-3.5 md:py-4 min-h-[48px] transition-all ${canSubmit
              ? "bg-accent text-accent-foreground hover-glitch hover:scale-[1.02]"
              : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
            }`}
        >
          {submitting ? "MEMPROSES..." : "Buat Order"}
        </button>

        <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center font-mono text-[9px] leading-relaxed text-foreground/40 md:text-[10px]">
          <span>✓ Jalur resmi publisher</span>
          <span aria-hidden="true">·</span>
          <span>✓ Proses otomatis 24/7</span>
          <span aria-hidden="true">·</span>
          <span>✓ CS siaga kalau ada kendala</span>
        </p>

        <Link
          href="/"
          className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center text-center font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/40 transition-colors hover:text-accent md:text-[11px]"
        >
          &larr; Pilih game lain
        </Link>
      </aside>
    </form>
  )
}
