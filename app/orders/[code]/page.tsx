import Link from "next/link"
import { notFound } from "next/navigation"
import { BackButton } from "@/components/back-button"
import { getOrder } from "@/lib/orders"
import { PAYMENT_METHODS, STONE_PAYMENT_METHODS, formatIDR, WA_NUMBER } from "@/lib/catalog"
import { StatusPoller } from "@/app/orders/[code]/status-poller"
import { StonePayBox } from "@/app/orders/[code]/stone-pay-box"
import { CopyOrderCode } from "@/app/orders/[code]/copy-code"

/** Warna semantik badge status — biar user langsung nangkep kondisi order tanpa baca teks. */
const STATUS_TONE: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "border-amber-400/50 text-amber-300",
  DIPROSES: "border-sky-400/50 text-sky-300",
  SELESAI: "border-emerald-400/50 text-emerald-300",
  GAGAL: "border-destructive/60 text-destructive",
}

export const dynamic = "force-dynamic"

export const metadata = { title: "Status Order // GAS STORE" }

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  [...PAYMENT_METHODS, ...STONE_PAYMENT_METHODS].map((m) => [m.id, m.label])
)

export default async function OrderPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const order = await getOrder(decodeURIComponent(code).toUpperCase())
  if (!order) notFound()

  const waMessage = encodeURIComponent(
    `Halo Gas Store! Saya sudah bayar order ${order.code} (${order.gameName} - ${order.denomLabel} x${order.quantity}, total ${formatIDR(order.amount)}). Mohon diproses ya, bukti transfer akan saya kirim di chat ini.`
  )
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waMessage}`

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
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gas Store</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="font-mono text-[9px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat &rarr;
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <BackButton fallbackHref="/orders" />
        </div>

        <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
          [Order Dibuat]
        </span>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="font-sans text-[12vw] sm:text-6xl md:text-8xl tracking-tighter text-foreground leading-[0.85] uppercase">
            {order.code}
          </h1>
          <CopyOrderCode code={order.code} />
          <span
            className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] md:text-[10px] tracking-[0.2em] uppercase ${
              STATUS_TONE[order.status] ?? "border-border text-foreground/60"
            }`}
          >
            ● {order.status.replace(/_/g, " ")}
          </span>
        </div>
        <StatusPoller code={order.code} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 md:gap-8 mt-6 md:mt-12 items-start">
          {/* Detail order */}
          <div className="flex flex-col gap-4">
            <div className="border border-border bg-card p-4 md:p-6">
              <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3 md:mb-4">
                [Detail]
              </span>
              <div className="flex flex-col gap-2 font-mono text-[10px] md:text-sm">
                {[
                  { label: "Game", value: order.gameName },
                  { label: "Item", value: `${order.denomLabel} x${order.quantity}` },
                  { label: "User ID", value: order.server ? `${order.userId} (${order.server})` : order.userId },
                  { label: "Email", value: order.email },
                  ...(order.phone ? [{ label: "Nomor WA", value: order.phone } as const] : []),
                  { label: "Pembayaran", value: METHOD_LABEL[order.method] ?? order.method },
                  { label: "Dibuat", value: new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " WIB" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b border-border/50 pb-1.5">
                    <span className="text-foreground/45 shrink-0">{row.label}</span>
                    <span className="text-foreground text-right break-all">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4 flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] md:text-[11px] text-foreground/50 tracking-[0.2em] uppercase">Total</span>
                <span className="font-sans text-2xl md:text-4xl text-accent tabular-nums">{formatIDR(order.amount)}</span>
              </div>
            </div>

            <div className="border border-border bg-card p-4 md:p-6">
              <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
                [Status] &mdash; {order.status.replace(/_/g, " ")}
              </span>
              <p className="font-mono text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                {order.topupStatus === "SUKSES"
                  ? `${order.currency} sudah dikirim ke akun ${order.userId}. Terima kasih sudah top up!`
                  : order.topupStatus === "DIKIRIM"
                    ? "Pembayaran diterima. Item sedang diproses oleh penyedia top-up."
                    : order.topupStatus === "GAGAL"
                      ? `Pengiriman otomatis gagal: ${order.topupMessage ?? "hubungi CS"}. Tim kami akan memproses manual / refund.`
                      : order.topupStatus === "MANUAL"
                        ? "Pembayaran terverifikasi. Item diproses manual oleh tim (biasanya < 5 menit)."
                        : `Item belum dikirim karena pembayaran belum terverifikasi. Setelah konfirmasi, ${order.currency} dikirim ke akun (biasanya < 3 menit). Simpan kode order ini sebagai bukti.`}
              </p>
            </div>
          </div>

          {/* Instruksi bayar */}
          <aside className="lg:sticky lg:top-4 border-2 border-accent bg-card p-4 md:p-6">
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3 md:mb-4">
              [Bayar] &mdash; {METHOD_LABEL[order.method] ?? order.method}
            </span>
            {/* Pembayaran bawaan Gamestone: QR (qris) / kode bayar (VA, retail, dll). */}
            {order.stonePaymentCode && order.status === "MENUNGGU_PEMBAYARAN" && (
              <StonePayBox
                method={order.method}
                methodLabel={METHOD_LABEL[order.method] ?? order.method}
                paymentCode={order.stonePaymentCode}
                amount={order.stoneTotal ?? order.amount}
                expiredAt={order.stoneExpiredAt}
              />
            )}
            {order.paymentError && (
              <p className="mb-3 font-mono text-[10px] md:text-[11px] text-destructive border border-destructive/40 p-2 leading-relaxed">
                Pembayaran otomatis lagi gangguan untuk order ini. Ikuti instruksi manual di bawah &mdash; tim kami proses begitu pembayaran terkonfirmasi.
              </p>
            )}
            {!order.stonePaymentCode ? (
            <div className="flex flex-col gap-2 font-mono text-[10px] md:text-xs text-foreground/70 leading-relaxed">
              {order.stoneOrderId && (
                <>
                  <p className="text-foreground">1. Selesaikan pembayaran metode <span className="text-accent uppercase">{METHOD_LABEL[order.method] ?? order.method}</span> dengan nominal PERSIS <span className="text-accent">{formatIDR(order.amount)}</span> sesuai instruksi pembayaran.</p>
                  <p className="text-foreground">2. Setelah pembayaran lunas, status order ini otomatis diperbarui (polling tiap ±8 detik) &mdash; item dikirim otomatis ke akun.</p>
                </>
              )}
              {!order.stoneOrderId && (
                <>
                  <p className="text-foreground">1. Minta rekening / QRIS tujuan ke CS via tombol WhatsApp di bawah.</p>
                  <p className="text-foreground">2. Transfer PERSIS <span className="text-accent">{formatIDR(order.amount)}</span> (jangan bulatkan).</p>
                </>
              )}
              <p className="text-foreground">3. Klik tombol WhatsApp di bawah, sertakan bukti transfer.</p>
              <p className="text-foreground">4. Item diproses &amp; masuk akun. GG!</p>
            </div>
            ) : (
              <p className="font-mono text-[10px] md:text-xs text-foreground/60 leading-relaxed">
                Status pembayaran &amp; pengiriman item ini sinkron otomatis langsung dari provider tiap ±8 detik — nggak perlu konfirmasi manual. GG!
              </p>
            )}

            {order.stonePaymentCode ? null : (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-4 inline-flex items-center justify-center bg-accent text-accent-foreground font-mono text-[10px] md:text-sm tracking-[0.2em] uppercase px-5 py-3.5 md:py-4 min-h-[48px] hover-glitch hover:scale-[1.02] transition-transform"
            >
              Konfirmasi via WhatsApp
            </a>
            )}

            <Link
              href="/orders"
              className="block text-center font-mono text-[10px] md:text-[11px] text-foreground/40 hover:text-accent transition-colors tracking-[0.15em] uppercase mt-3 py-1"
            >
              Cek order lain &rarr;
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
