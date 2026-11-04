/**
 * Proxy Gamestone untuk Deno Deploy — logika sama dengan workers/gamestone-proxy/worker.js.
 *
 * Kenapa Deno? WAF Gamestone (Cloudflare) menolak jejak IP yang diteruskan
 * Cloudflare (CF-Connecting-IP/X-Forwarded-For berisi IP pemanggil, mis. Vercel).
 * Hop non-Cloudflare seperti Deno memutus rantai itu: yang dilihat Gamestone
 * tinggal IP egress Deno.
 *
 * Env (set di dashboard Deno Deploy → Add/Edit environment variables):
 *   - GAMESTONE_API_KEY  (wajib) — diteruskan sebagai x-api-key ke upstream
 *   - PROXY_SECRET       (opsional) — request dari app wajib kirim "x-proxy-secret"
 *     yang sama; kalau diisi kosong, verifikasi dilewati
 *
 * Ganti UPSTREAM kalau Gamestone pindah domain.
 */

const UPSTREAM = "https://www.transportbaganbatu.web.id"
const PREFIX = "/api/merchant/v1"
const WINDOW_MS = 10_000
const WINDOW_MAX = 30

const rl = new Map<string, { count: number; resetAt: number }>()

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  })
}

function rateLimited(ip: string): Response | null {
  const now = Date.now()
  const slot = rl.get(ip)
  if (!slot || now > slot.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }
  slot.count += 1
  if (slot.count > WINDOW_MAX) return json({ error: "too many requests" }, 429)
  return null
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const cfRay = req.headers.get("cf-ray") // identitas request masuk (jika ada) — tidak diteruskan

  if (url.pathname === "/healthz") {
    return json({ ok: true, upstream: UPSTREAM, note: "gamestone proxy (deno) — cf-ray tidak diteruskan" })
  }

  // Batasi rate per IP pemanggil. cf-connecting-ip dari Deno akan berisi IP
  // pemanggil asli; pakai itu, fallback ke "anon".
  const callerIp = req.headers.get("cf-connecting-ip") ?? "anon"
  const tooMany = rateLimited(callerIp)
  if (tooMany) return tooMany

  // Verifikasi secret dari app (satu sumber: env PROXY_SECRET).
  const secret = Deno.env.get("PROXY_SECRET")
  if (secret && req.headers.get("x-proxy-secret") !== secret) {
    return json({ error: "forbidden" }, 403)
  }

  if (!url.pathname.startsWith(PREFIX)) {
    return json({ error: "path tidak diizinkan" }, 403)
  }

  const apiKey = Deno.env.get("GAMESTONE_API_KEY")
  if (!apiKey) return json({ error: "proxy belum dikonfigurasi: GAMESTONE_API_KEY kosong" }, 500)

  const target = UPSTREAM + url.pathname + url.search
  const headers = new Headers()
  headers.set("x-api-key", apiKey)
  headers.set("Content-Type", "application/json")
  headers.set("Accept", "application/json")
  headers.set("User-Agent", "gas-store-proxy-deno/1.0")
  // Sengaja TIDAK meneruskan jejak IP pemanggil (cf-connecting-ip / x-forwarded-for /
  // x-real-ip): request ke Gamestone harus kelihatan datang dari IP Deno.

  const method = req.method
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer()

  const timeout = AbortSignal.timeout(20_000)
  let upstream: Response
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: timeout,
    })
  } catch (err) {
    return json({ error: `upstream gagal: ${String(err)}` }, 502, { "x-proxy-note": "fetch error" })
  }

  const respHeaders = new Headers()
  const ct = upstream.headers.get("content-type")
  if (ct) respHeaders.set("content-type", ct)
  respHeaders.set("x-proxy-upstream-status", String(upstream.status))
  // Jejak ringan untuk audit, tanpa bocor secret.
  respHeaders.set("x-proxy-via", `deno (cf-ingress-ray: ${cfRay ?? "-"})`)

  const text = await upstream.text()
  return new Response(text, { status: upstream.status, headers: respHeaders })
}

Deno.serve(handler)
