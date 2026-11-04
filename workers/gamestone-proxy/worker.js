/**
 * GASTROS (gastros.id) — Gamestone Proxy (Cloudflare Worker)
 * ================================================
 * Jembatan request: app (Vercel/Freebuff) → Worker ini → Gamestone API.
 * Tujuan: WAF Gamestone memblokir IP datacenter hosting (Vercel), tapi
 * traffic dari network Cloudflare (di mana Worker ini jalan, dan yang
 * juga dipakai Gamestone sendiri) lolos check situs mereka.
 *
 * CARA DEPLOY (tanpa CLI, semua lewat dashboard):
 * 1. Login Cloudflare → Workers & Pages → "Create Worker" (mis. nama: gas-stone-proxy)
 * 2. Hapus kode bawaan, LOG 100% isi file ini ke editor, klik Deploy.
 * 3. Worker → Settings → Variables & Secrets, tambahkan:
 *      GAMESTONE_API_KEY = <key merchant Gamestone lu>   (Secret)
 *      PROXY_SECRET      = <string acak bebas, min 32 char> (Secret)
 * 4. Cek via: https://<nama-worker>.<akun>.workers.dev/healthz
 *    → harus balikin {"ok":true,"auth":...}
 * 5. Di app (Freebuff/Vercel), set env:
 *      STONE_PROXY_URL    = https://<nama-worker>.<akun>.workers.dev/api/merchant/v1
 *      STONE_PROXY_SECRET = (sama dengan PROXY_SECRET di Worker)
 *
 * Keamanan:
 * - PROXY_SECRET wajib: cuma app lu (yang tahu secret) yang bisa memanggil.
 * - Path cuma mengizinkan prefix merchant API (/api/merchant/v1/...) —
 *   path lain ditolak.
 * - API key provider hidup di Worker env, gak perlu di-expose dari app lagi.
 */

const UPSTREAM = "https://www.transportbaganbatu.web.id/api/merchant/v1";
const ALLOWED_PREFIX = "/api/merchant/v1";

// Batas kerja yang wajar: 1 Worker instance jangan nembak provider terlalu
// deras (jeda min 15 ms per request, hitung kasar) — cukup buat anti-stampede.
const PER_IP_RATE = 30; // max requests per 10 detik per IP caller

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Health check (tanpa auth, buat cek deploy) ─────────────────────
    if (url.pathname === "/healthz") {
      return json({
        ok: true,
        auth: env.PROXY_SECRET ? "required" : "DISABLED (warn: set PROXY_SECRET!)",
        key: env.GAMESTONE_API_KEY ? "present" : "MISSING (set GAMESTONE_API_KEY!)",
      });
    }

    // ── Auth: x-proxy-secret wajib sama dengan env PROXY_SECRET ────────
    if (env.PROXY_SECRET) {
      const got = request.headers.get("x-proxy-secret") || "";
      if (!timingSafeEqual(got, env.PROXY_SECRET)) {
        return json({ error: "forbidden" }, 403);
      }
    } else {
      // Deploy tanpa PROXY_SECRET = publik — bahaya, tapi biarin dev kecil.
      // Tetap dibolehkan agar tidak keliru saat deploy pertama; perbaiki segera.
      console.warn("PROXY_SECRET kosong — proxy jalan tanpa auth!");
    }

    // ── Path allowlist: cuma prefix merchant API yang diteruskan ───────
    let rest = url.pathname;
    if (!rest.startsWith(ALLOWED_PREFIX)) {
      return json({ error: "path tidak diizinkan" }, 403);
    }
    const upstreamPath = rest.slice(ALLOWED_PREFIX.length) + url.search;

    // ── Rate limit kasar per IP caller ──────────────────────────────────
    // (KV-free implementasi bucket in-memory per isolate; buat traffic tabel
    // app, gunakan secret + IP caller dari header x-forwarded-for.)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!allowRequest(ip)) {
      return json({ error: "rate limited (30 req / 10s)" }, 429);
    }

    // ── Bangun request upstream ─────────────────────────────────────────
    const headers = new Headers();
    headers.set("x-api-key", env.GAMESTONE_API_KEY || (request.headers.get("x-api-key") || ""));
    const ct = request.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    headers.set("User-Agent", "gas-store-proxy/1.0 (+cloudflare-worker)");
    headers.set("Accept", "application/json");
    const ua = request.headers.get("user-agent");
    if (ua && !/vercel|serverless|edge|undici/i.test(ua)) headers.set("X-Origin-App", ua);

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    // Body hanya untuk method non-GET/HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    try {
      const upstream = await fetch(UPSTREAM + upstreamPath, init);
      // Slip HEAD response back as-is; normalisasi kecil perubahan headers.
      const respHeaders = new Headers();
      respHeaders.set("content-type", upstream.headers.get("content-type") || "application/json");
      respHeaders.set("x-proxy-upstream-status", String(upstream.status));
      const cfRay = upstream.headers.get("cf-ray");
      if (cfRay) respHeaders.set("x-proxy-cf-ray", cfRay); // buat pas buat report provider
      const body = await upstream.arrayBuffer();
      return new Response(body, { status: upstream.status, headers: respHeaders });
    } catch (err) {
      return json({ error: "gagal menghubungi upstream", detail: String(err) }, 502);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Perbandingan string yang tahan timing-attack (simple constant-time).
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Rate limiter in-memory per isolate ─────────────────────────────────
const buckets = new Map();

function allowRequest(key) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + 10_000 };
  if (now > bucket.resetAt) bucket.count = 0, (bucket.resetAt = now + 10_000);
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count <= PER_IP_RATE;
}
