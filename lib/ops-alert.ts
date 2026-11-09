/**
 * Log error operasional dalam format JSON (gampang dibaca log hosting / alert),
 * lalu opsional kirim email ke admin lewat Resend kalau ADMIN_ALERT_EMAIL di-set.
 *
 * Tidak pernah throw: kegagalan logging/alert tidak boleh mengganggu order.
 */

type OpsContext = Record<string, unknown>

type AlertPayload = {
  level: "error"
  service: "gastros"
  event: string
  message: string
  stack?: string
  at: string
  context?: OpsContext
}

const globalForOps = globalThis as typeof globalThis & {
  _gasOpsAlertLastSent_?: Map<string, number>
}

const lastSent: Map<string, number> =
  globalForOps._gasOpsAlertLastSent_ ?? new Map()
globalForOps._gasOpsAlertLastSent_ = lastSent

const ALERT_THROTTLE_MS = 5 * 60_000
const MAX_CONTEXT_LENGTH = 2_000

function safeContext(context?: OpsContext): OpsContext | undefined {
  if (!context) return undefined
  try {
    const raw = JSON.stringify(context)
    if (raw.length <= MAX_CONTEXT_LENGTH) return context
    return { truncated: raw.slice(0, MAX_CONTEXT_LENGTH) }
  } catch {
    return { note: "context tidak bisa diserialisasi" }
  }
}

function errorMessage(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  try {
    return { message: typeof error === "string" ? error : JSON.stringify(error) }
  } catch {
    return { message: String(error) }
  }
}

/**
 * Catat error operasional. `event` sebaiknya stabil dan spesifik,
 * contoh: "order.create_failed" atau "order.gamestone_fallback".
 */
export function logOpsError(
  event: string,
  error: unknown,
  context?: OpsContext
): void {
  const details = errorMessage(error)
  const payload: AlertPayload = {
    level: "error",
    service: "gastros",
    event,
    message: details.message,
    ...(details.stack ? { stack: details.stack } : {}),
    at: new Date().toISOString(),
    context: safeContext(context),
  }

  try {
    console.error(JSON.stringify(payload))
  } catch {
    // Logging tidak boleh bikin request gagal.
  }

  void sendAdminAlert(event, payload)
}

async function sendAdminAlert(
  event: string,
  payload: AlertPayload
): Promise<void> {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim()
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!to || !apiKey) return

  const now = Date.now()
  const previous = lastSent.get(event) ?? 0
  if (now - previous < ALERT_THROTTLE_MS) return
  lastSent.set(event, now)

  // Bersihin entry lama supaya map nggak tumbuh tanpa batas.
  if (lastSent.size > 50) {
    for (const [key, at] of lastSent) {
      if (now - at > ALERT_THROTTLE_MS) lastSent.delete(key)
    }
  }

  const from =
    process.env.NOTIFY_FROM_EMAIL ?? "Gastros <onboarding@resend.dev>"

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[GASTROS ALERT] ${event}`,
        text: JSON.stringify(payload, null, 2),
      }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch {
    // Alert email gagal — log JSON di atas tetap tersimpan.
  }
}
