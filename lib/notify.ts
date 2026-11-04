/**
 * Notifikasi email status order via API Resend (HTTP API murni, tanpa SDK).
 *
 * - Kirim hanya kalau RESEND_API_KEY tersedia — kalau nggak, fungsi ini
 *   no-op total, jadi app tetap jalan normal tanpa integrasi.
 * - Fire-and-forget: kegagalan email TIDAK BOLEH bikin flow order gagal,
 *   semua error ditelan (jangan di-throw dari route handler).
 * - Alamat pengirim default pakai onboarding@resend.dev (sandbox Resend).
 *   Production: set NOTIFY_FROM_EMAIL (domain terverifikasi di Resend).
 */

type OrderEmailData = {
  code: string
  email?: string
  /** Nomor HP/WA pembayar (normalisasi otomatis ke format 62xx buat WA). */
  phone?: string
  gameName: string
  denomLabel: string
  quantity: number
  amount: number
  status: string
  /** Kupon: potongan/cashback (Rupiah) + kodenya, opsional. */
  discount?: number
  couponCode?: string
}

const RESEND_API_URL = "https://api.resend.com/emails"
const FONNTE_API_URL = "https://api.fonnte.com/send"

function orderBaseUrl(): string {
  // Rebrand: lagka default saat ini harus domain baru; APP_BASE_URL harus
  // diset sama di env production biar link notif WA/email selalu konsisten.
  return process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://www.gastros.id"
}

export function notifyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export function notifyWhatsAppConfigured(): boolean {
  return Boolean(process.env.FONNTE_TOKEN)
}

/**
 * Satu pintu notifikasi order: email + WhatsApp.
 * Dua-duanya fire-and-forget & no-op kalau key belum di-set — kegagalan
 * notif TIDAK pernah bikin flow order gagal.
 *
 * Email SEMENTARA dimatikan sampai domain sendiri terverifikasi di Resend
 * (sender sandbox onboarding@resend.dev cuma boleh kirim ke email akun sendiri).
 * Set NOTIFY_EMAIL_ENABLED=true di env kalau mau nyalain lagi.
 */
export function sendOrderStatusNotifications(order: OrderEmailData): void {
  if (process.env.NOTIFY_EMAIL_ENABLED === "true") {
    sendOrderStatusEmail(order)
  }
  sendOrderStatusWhatsApp(order)
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran",
  DIPROSES: "Diproses — Item dikirim",
  SELESAI: "Selesai — Item sudah masuk",
  GAGAL: "Gagal — hubungi CS Gastros",
}

/**
 * WhatsApp notifikasi status order via Fonnte.
 * - Pakai FONNTE_TOKEN (device EA recan sendiri di dashboard fonnte.com).
 * - Nomor tujuan dari order.phone, dinormalisasi 08xx/62xx -> 62xx.
 * - Fire-and-forget; nggak pernah throw ke flow order.
 */
export function sendOrderStatusWhatsApp(order: OrderEmailData): void {
  if (!notifyWhatsAppConfigured() || !order.phone) return

  const token = process.env.FONNTE_TOKEN as string
  const digits = String(order.phone).replace(/\D/g, "")
  const target = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`
  if (target.length < 10) return

  const statusLabel = STATUS_LABEL[order.status] ?? order.status
  const message = [
    `GASTROS — Order ${order.code}`,
    `Status: ${statusLabel}`,
    `${order.gameName} — ${order.denomLabel}` + (order.quantity > 1 ? ` ×${order.quantity}` : ""),
    ...(order.discount && order.couponCode
      ? [`Kupon ${order.couponCode}: cashback Rp ${order.discount.toLocaleString("id-ID")} (CS transfer setelah order selesai)`]
      : []),
    `Total: Rp ${order.amount.toLocaleString("id-ID")}`,
    `Detail: ${orderBaseUrl()}/orders/${order.code}`,
  ].join("\n")

  fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target, message }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => {
    // WA gagal (token invalid / device offline) — jangan ganggu flow order.
  })
}

export function sendOrderStatusEmail(order: OrderEmailData): void {
  if (!notifyConfigured() || !order.email) return

  const apiKey = process.env.RESEND_API_KEY as string
  const from = process.env.NOTIFY_FROM_EMAIL ?? "Gastros <onboarding@resend.dev>"
  const statusLabel = STATUS_LABEL[order.status] ?? order.status

  const html = `
<div style="font-family:monospace;max-width:560px;margin:0 auto;border:2px solid #c9a227;padding:24px;color:#e8e6e1;background:#0a0a0a;">
  <p style="letter-spacing:.25em;font-size:11px;color:#c9a227;margin:0 0 16px;">GASTROS — ${statusLabel.toUpperCase()}</p>
  <h2 style="letter-spacing:-0.02em;font-size:22px;margin:0 0 12px;">Order ${order.code}</h2>
  <table style="font-size:13px;width:100%;border-collapse:collapse;">
    <tr><td style="color:#9a958c;padding:4px 0;">Game</td><td style="text-align:right;">${order.gameName}</td></tr>
    <tr><td style="color:#9a958c;padding:4px 0;">Item</td><td style="text-align:right;">${order.denomLabel} ×${order.quantity}</td></tr>
    <tr><td style="color:#9a958c;padding:4px 0;">Total</td><td style="text-align:right;color:#c9a227;">IDR ${order.amount.toLocaleString("id-ID")}</td></tr>
  </table>
  <p style="font-size:12px;color:#9a958c;margin:16px 0 0;">
    Cek detail lengkap &amp; status live:
    <a href="${orderBaseUrl()}/orders/${order.code}" style="color:#c9a227;">${orderBaseUrl()}/orders/${order.code}</a>
  </p>
</div>`

  fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [order.email],
      subject: `GASTROS — Order ${order.code}: ${statusLabel}`,
      html,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => {
    // Email gagal (rate limit / jaringan) — jangan bawa-bawa ke flow order.
  })
}
