# GAS STORE — Gamestone Proxy (Cloudflare Worker)

Jembatan request ke Gamestone biar gak ketangkap WAF-nya (yang cukup kritis terhadap IP datacenter Vercel). Request dari Cloudflare (network-nya sama dengan Gamestone sendiri) kemungkinan besar lolos.

## Isi folder

- `worker.js` — kode Worker lengkap (satu file, bahasa JS murni, tanpa build step).

## Langkah deploy (5 menit, tanpa CLI)

1. **Daftar/buka Cloudflare** → dashboard → **Workers & Pages → Create Worker**
   - Nama tersaran: `gas-stone-proxy` → URL jadi `https://gas-stone-proxy.<akun>.workers.dev`.
2. **Paste kode** — buka editor "Edit code", hapus template bawaan, log seluruh isi `worker.js` → **Deploy**.
3. **Set secret di Worker** — Worker → Settings → Variables & Secrets:
   - `GAMESTONE_API_KEY` = key merchant Gamestone lu (bikin **Secret**)
   - `PROXY_SECRET` = string acak min 32 char (bikin **Secret**) — WhatsApp gua tiap lu memakai proxy. Contoh bikin sendiri: pw любого generator.
4. **Uji health check** (perman sukses tanpa secret):
   ```
   https://gas-stone-proxy.<akun>.workers.dev/healthz
   ```
   Ini harus bilang `{"ok":true,"auth":"required","key":"present"}`.
5. **Set env di app production (Freebuff/Vercel)**:
   ```
   STONE_PROXY_URL    = https://gas-stone-proxy.<akun>.workers.dev/api/merchant/v1
   STONE_PROXY_SECRET = <PROXY_SECRET yang sama di Worker>
   ```
   Bukti penerapan di Freebuff: `freebuff-deploy env set '{"STONE_PROXY_URL":"...","STONE_PROXY_SECRET":"..."}'`
   (Jangan lupa **ter-Deploy ulang** aplikasi production supaya env kebaca.)
6. **Fix up**, tes checkout lagi dari production. Kalau `x-proxy-cf-ray` terkirim di response, log buat provider Gamestone juga gampang.

## Health endpooint plan flow

- `/healthz` → cek deploy & env worker `{"ok":true,"auth":"required","key":"present"}`
- `/api/merchant/v1/*` → forward request GET/POST ke Gamestone (equivalensi semua endpoint yang dipakai app: `/games`, `/games/{slug}`, `/orders`, `/orders/{id}`), path di luar prefix ini → **403**, calon mengconcrete verify vena deposit → **rate sedang** 30 req/10s per IP.

## Rollback

Set env `STONE_PROXY_URL` = kosong / hapus → kembali ke jalur langsung (`GAMESTONE_BASE_URL` default). Perubahan ini introduced baik-baik bisa dipakai tanpa proxy tekam pasillania flag.
