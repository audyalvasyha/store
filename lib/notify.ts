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
  gameName: string
  denomLabel: string
  quantity: number
  amount: number
  status: string
}

const RESEND_API_URL = "https://api.resend.com/emails"

function orderBaseUrl(): string {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://audysignin.freebuff.app"
}

export function notifyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran",
  DIPROSES: "Diproses — Item dikirim",
  SELESAI: "Selesai — Item sudah masuk",
  GAGAL: "Gagal — hubungi CS Gas Store",
}

export function sendOrderStatusEmail(order: OrderEmailData): void {
  if (!notifyConfigured() || !order.email) return

  const apiKey = process.env.RESEND_API_KEY as string
  const from = process.env.NOTIFY_FROM_EMAIL ?? "Gas Store <onboarding@resend.dev>"
  const statusLabel = STATUS_LABEL[order.status] ?? order.status

  const html = `
<div style="font-family:monospace;max-width:560px;margin:0 auto;border:2px solid #c9a227;padding:24px;color:#e8e6e1;background:#0a0a0a;">
  <p style="letter-spacing:.25em;font-size:11px;color:#c9a227;margin:0 0 16px;">GAS STORE — ${statusLabel.toUpperCase()}</p>
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
      subject: `GAS STORE — Order ${order.code}: ${statusLabel}`,
      html,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => {
    // Email gagal (rate limit / jaringan) — jangan bawa-bawa ke flow order.
  })
}
