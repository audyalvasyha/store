import Link from "next/link"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { formatIDR } from "@/lib/catalog"
import {
  CUSTOMER_COOKIE,
  getCustomerIdentity,
  getCustomerOrders,
  maskIdentity,
} from "@/lib/customer-auth"
import { CustomerLogin } from "@/components/customer-login"
import { CustomerLogout } from "@/components/customer-logout"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Akun // GASTROS",
  description: "Masuk dengan email atau nomor WhatsApp untuk melihat riwayat order dan beli lagi.",
  robots: { index: false, follow: false },
}

const STATUS_TONE: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "border-amber-400/50 text-amber-300",
  DIPROSES: "border-sky-400/50 text-sky-300",
  SELESAI: "border-emerald-400/50 text-emerald-300",
  GAGAL: "border-destructive/60 text-destructive",
}

export default async function AccountPage() {
  const jar = await cookies()
  // DB bermasalah ≠ login gagal permanen — tampilkan form biasa.
  const identity = await getCustomerIdentity(jar.get(CUSTOMER_COOKIE)?.value).catch(() => null)
  const orders = identity ? await getCustomerOrders(identity).catch(() => []) : []

  const completed = orders.filter((o) => o.status === "SELESAI")
  const totalSpent = completed.reduce((sum, o) => sum + o.amount, 0)

  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-6 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <nav className="flex items-center gap-4 md:gap-8">
            <Link
              href="/games"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Games
            </Link>
            <Link
              href="/orders"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-6 md:pt-12 pb-8 md:pb-20 max-w-[1400px] mx-auto w-full">
        <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
          [Akun]
        </span>
        <h1 className="font-sans text-[14vw] sm:text-6xl md:text-7xl tracking-tighter text-foreground leading-none uppercase mb-4 md:mb-6">
          {identity ? "Akun Saya" : "Masuk"}
          <span className="text-accent">.</span>
        </h1>

        {!identity ? (
          <>
            <p className="font-mono text-[10px] md:text-xs text-foreground/50 max-w-md leading-relaxed mb-6 md:mb-8">
              Masuk pakai email atau nomor WhatsApp — tanpa password, cukup kode 6 digit.
              Semua order dengan email/nomor ini (termasuk yang lama) langsung kelihatan.
            </p>
            <CustomerLogin />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-8">
              <p className="font-mono text-[10px] md:text-xs text-foreground/50">
                Login sebagai{" "}
                <span className="text-foreground">{maskIdentity(identity)}</span>
              </p>
              <CustomerLogout />
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-10">
              {[
                { label: "Total order", value: String(orders.length) },
                { label: "Selesai", value: String(completed.length) },
                { label: "Total belanja", value: formatIDR(totalSpent) },
              ].map((s) => (
                <div key={s.label} className="border border-border bg-card p-3 md:p-4">
                  <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.12em] uppercase block mb-1.5">
                    {s.label}
                  </span>
                  <span className="font-sans text-lg md:text-2xl text-foreground tracking-tight tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
              Riwayat Order ({orders.length})
            </span>

            {orders.length === 0 ? (
              <div className="border border-border bg-card p-6 md:p-10 text-center">
                <p className="font-sans text-lg md:text-2xl text-foreground uppercase tracking-tight">
                  Belum ada order<span className="text-accent">.</span>
                </p>
                <p className="font-mono text-[10px] md:text-xs text-foreground/50 leading-relaxed mt-2 mb-5">
                  Order pertama kamu bakal otomatis muncul di sini, pakai nomor WA yang sama saat checkout.
                </p>
                <Link
                  href="/games"
                  className="inline-flex items-center justify-center bg-accent text-accent-foreground font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] hover-glitch"
                >
                  Pilih Game &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:gap-3">
                {orders.map((order) => (
                  <div key={order.code} className="border border-border bg-card p-3 md:p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.1em] uppercase">
                        {order.code} ·{" "}
                        {new Date(order.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        })}{" "}
                        WIB
                      </span>
                      <span
                        className={`inline-flex items-center border px-2 py-1 font-mono text-[9px] tracking-[0.15em] uppercase ${
                          STATUS_TONE[order.status] ?? "border-border text-foreground/60"
                        }`}
                      >
                        ● {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-sans text-lg md:text-2xl text-foreground tracking-tight uppercase leading-none">
                          {order.gameName}
                        </h2>
                        <p className="font-mono text-[10px] md:text-[11px] text-foreground/50 mt-1">
                          {order.denomLabel} ×{order.quantity} · {formatIDR(order.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/orders/${order.code}`}
                          className="border border-border font-mono text-[9px] md:text-[10px] tracking-[0.15em] uppercase px-3 py-2 min-h-[36px] text-foreground/60 hover:text-foreground"
                        >
                          Detail
                        </Link>
                        <Link
                          href={`/top-up/${order.gameSlug}`}
                          className="bg-accent text-accent-foreground font-mono text-[9px] md:text-[10px] tracking-[0.15em] uppercase px-3 py-2 min-h-[36px] hover-glitch"
                        >
                          Beli Lagi
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  )
}
