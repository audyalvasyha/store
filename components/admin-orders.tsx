"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { PAYMENT_METHODS, STONE_PAYMENT_METHODS, formatIDR } from "@/lib/catalog"
import type { AdminOrder, OrderStatus, TopupStatus } from "@/lib/orders"

const STATUS_LABEL: Record<OrderStatus, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu bayar",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
  GAGAL: "Gagal",
}

const STATUS_TONE: Record<OrderStatus, string> = {
  MENUNGGU_PEMBAYARAN: "border-amber-400/50 text-amber-300",
  DIPROSES: "border-sky-400/50 text-sky-300",
  SELESAI: "border-emerald-400/50 text-emerald-300",
  GAGAL: "border-destructive/60 text-destructive",
}

const TOPUP_LABEL: Record<TopupStatus, string> = {
  BELUM: "Belum dikirim",
  DIKIRIM: "Dikirim",
  SUKSES: "Sukses",
  GAGAL: "Gagal",
  MANUAL: "Manual",
}

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  [...PAYMENT_METHODS, ...STONE_PAYMENT_METHODS].map((method) => [method.id, method.label])
)

type StatusFilter = "all" | OrderStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "MENUNGGU_PEMBAYARAN", label: "Menunggu" },
  { value: "DIPROSES", label: "Diproses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "GAGAL", label: "Gagal" },
]

function formatDate(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return `${date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })} WIB`
}

function waNumber(phone?: string): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  if (digits.startsWith("62")) return digits
  return `62${digits}`
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/35">
        {label}
      </span>
      <div className="mt-1 break-words font-mono text-[10px] leading-relaxed text-foreground/75">
        {children || "—"}
      </div>
    </div>
  )
}

function OrderDetail({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const wa = waNumber(order.phone)
  const hasNote = Boolean(order.paymentError || order.fallbackReason || order.topupMessage)

  return (
    <div className="border border-accent/40 bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
            [Detail order]
          </span>
          <span className="mt-1 block font-mono text-lg text-foreground">{order.code}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[36px] items-center border border-border px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/45 hover:border-accent hover:text-foreground"
        >
          Tutup ×
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/35">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-foreground/70">
        {order.gameName} — {order.denomLabel}
        {order.quantity > 1 ? ` ×${order.quantity}` : ""}
      </p>
      <p className="mt-1 font-sans text-3xl leading-none tracking-tight text-accent tabular-nums">
        {formatIDR(order.amount)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-border pt-4">
        <Field label="User ID">{order.userId}</Field>
        <Field label="Server">{order.server ?? "—"}</Field>
        <Field label="Metode">{METHOD_LABEL[order.method] ?? order.method}</Field>
        <Field label="Provider">
          {order.provider === "gamestone"
            ? "Gamestone"
            : order.provider === "apigames"
              ? "APIGames"
              : "Manual / legacy"}
        </Field>
        <Field label="Email">{order.email}</Field>
        <Field label="WhatsApp">{order.phone ?? "—"}</Field>
        <Field label="Status top up">
          {TOPUP_LABEL[order.topupStatus ?? "BELUM"]}
        </Field>
        <Field label="Dibayar">{formatDate(order.paidAt)}</Field>
        {order.couponCode && <Field label="Kupon">{order.couponCode}</Field>}
        {order.discount ? <Field label="Cashback / diskon">{formatIDR(order.discount)}</Field> : null}
        {order.stoneOrderId && <Field label="ID provider">{order.stoneOrderId}</Field>}
        {order.cashbackPaidAt && (
          <Field label="Cashback ditransfer">{formatDate(order.cashbackPaidAt)}</Field>
        )}
      </div>

      {hasNote && (
        <div className="mt-4 border border-amber-400/40 bg-amber-400/5 p-3">
          <span className="block font-mono text-[8px] uppercase tracking-[0.14em] text-amber-300/80">
            [Catatan order]
          </span>
          {order.paymentError && (
            <p className="mt-1.5 break-words font-mono text-[9px] leading-relaxed text-foreground/60">
              Payment: {order.paymentError}
            </p>
          )}
          {order.fallbackReason && (
            <p className="mt-1.5 break-words font-mono text-[9px] leading-relaxed text-foreground/60">
              Fallback: {order.fallbackReason}
            </p>
          )}
          {order.topupMessage && (
            <p className="mt-1.5 break-words font-mono text-[9px] leading-relaxed text-foreground/60">
              Top up: {order.topupMessage}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Link
          href={`/orders/${order.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] items-center border border-accent bg-accent px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-foreground hover-glitch"
        >
          Buka halaman order ↗
        </Link>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[40px] items-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 hover:border-accent hover:text-accent"
          >
            Chat WA
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Tab order admin: read-only supaya status pembayaran/pengiriman tetap
 * dikelola provider. Pencarian dan filter dijalankan di server agar order
 * lama tetap bisa ditemukan walaupun bukan bagian dari 100 order terbaru.
 */
export function AdminOrders({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  useEffect(() => {
    const q = query.trim()
    // Tanpa filter, pakai data server yang sudah dimuat — nggak perlu
    // request tambahan setiap kali tab dibuka.
    if (!q && status === "all") {
      setOrders(initialOrders)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (q) params.set("q", q)
        if (status !== "all") params.set("status", status)
        const res = await fetch(`/api/admin/orders?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = (await res.json().catch(() => null)) as
          | { orders?: AdminOrder[]; error?: string }
          | null
        if (!res.ok) throw new Error(data?.error ?? "Gagal memuat order.")
        setOrders(Array.isArray(data?.orders) ? data.orders : [])
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Gagal memuat order.")
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [initialOrders, query, status])

  useEffect(() => {
    if (selectedCode && !orders.some((order) => order.code === selectedCode)) {
      setSelectedCode(null)
    }
  }, [orders, selectedCode])

  const selected = orders.find((order) => order.code === selectedCode) ?? null
  const waiting = orders.filter((order) => order.status === "MENUNGGU_PEMBAYARAN").length
  const processing = orders.filter((order) => order.status === "DIPROSES").length
  const completed = orders.filter((order) => order.status === "SELESAI").length

  function selectOrder(code: string) {
    setSelectedCode(code)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="border border-border bg-card p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-accent md:text-xs">
              [Order]
            </span>
            <h2 className="mt-1 font-sans text-xl uppercase leading-none tracking-tight text-foreground md:text-2xl">
              Monitor transaksi
            </h2>
            <p className="mt-2 max-w-xl font-mono text-[10px] leading-relaxed text-foreground/50">
              Cari order berdasarkan kode, email, nomor WA, game, nominal, atau User ID.
              Detail di bawah read-only; status tetap mengikuti pembayaran dan provider.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Ditampilkan", value: orders.length, tone: "text-foreground" },
              { label: "Menunggu", value: waiting, tone: "text-amber-300" },
              { label: "Diproses", value: processing, tone: "text-sky-300" },
              { label: "Selesai", value: completed, tone: "text-emerald-300" },
            ].map((card) => (
              <div key={card.label} className="border border-border bg-background px-3 py-2.5">
                <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/40">
                  {card.label}
                </span>
                <span className={`mt-1 block font-sans text-xl tabular-nums ${card.tone}`}>
                  {String(card.value).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/30">
              Cari
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="GAS-XXXXXX, email, WA, game, User ID..."
              className="min-h-[44px] w-full bg-transparent font-mono text-[11px] text-foreground placeholder:text-foreground/25 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center font-mono text-sm text-foreground/35 hover:text-foreground"
              >
                ×
              </button>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`min-h-[40px] border px-3 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                  status === item.value
                    ? "border-accent text-accent"
                    : "border-border text-foreground/45 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 font-mono text-[9px] leading-relaxed text-foreground/30">
          {loading
            ? "Mencari order..."
            : query.trim() || status !== "all"
              ? "Hasil pencarian dari database."
              : "Menampilkan 100 order terbaru. Pakai pencarian untuk order lama."}
        </p>
        {error && (
          <p role="alert" className="mt-3 border border-destructive/40 p-2 font-mono text-[10px] leading-relaxed text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-2">
          {orders.length === 0 && (
            <div className="border border-dashed border-border bg-card p-6">
              <p className="font-sans text-xl uppercase leading-none tracking-tight text-foreground/55">
                {loading ? "Lagi mencari..." : "Order nggak ketemu."}
              </p>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-foreground/35">
                Coba kata kunci lain, atau reset filter ke Semua.
              </p>
            </div>
          )}

          {orders.map((order) => {
            const wa = waNumber(order.phone)
            return (
              <article
                key={order.code}
                className={`border bg-card p-3 transition-colors md:p-4 ${
                  selectedCode === order.code ? "border-accent/60" : "border-border hover:border-accent/40"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-foreground">{order.code}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-foreground/65">
                      {order.gameName} — {order.denomLabel}
                      {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[9px] text-foreground/35">
                      {formatDate(order.createdAt)} · {order.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <span className="font-sans text-lg tabular-nums text-foreground md:text-xl">
                      {formatIDR(order.amount)}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectOrder(order.code)}
                        className={`inline-flex min-h-[40px] items-center border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] ${
                          selectedCode === order.code
                            ? "border-accent text-accent"
                            : "border-border text-foreground/55 hover:border-accent hover:text-foreground"
                        }`}
                      >
                        Detail
                      </button>
                      <Link
                        href={`/orders/${order.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 hover:border-accent hover:text-foreground"
                      >
                        Order ↗
                      </Link>
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[40px] items-center border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/55 hover:border-accent hover:text-accent"
                        >
                          WA
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <aside ref={detailRef} className="scroll-mt-4 lg:sticky lg:top-4">
          {selected ? (
            <OrderDetail order={selected} onClose={() => setSelectedCode(null)} />
          ) : (
            <div className="border border-dashed border-border bg-card p-5">
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                [Detail order]
              </span>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-foreground/45">
                Pilih salah satu order untuk lihat User ID, kontak, metode bayar,
                status pengiriman, dan catatan provider.
              </p>
              <p className="mt-4 font-mono text-[9px] leading-relaxed text-foreground/25">
                Tombol “Order ↗” membuka halaman publik dan memicu sinkronisasi
                status provider.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
