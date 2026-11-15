# Toko Game Online — GASTROS (gastros.id)

Toko game online: beli koin, item, dan paket langganan untuk berbagai game.
Bayar pakai QRIS, transfer bank, dan metode lainnya yang tersedia di halaman checkout.

## Fitur

- Daftar game dari berbagai publisher
- Pilih nominal dan quantity koin/item
- Checkout: metode pembayaran QRIS dan transfer bank
- Notifikasi transaksi via WhatsApp
- Cek status order dan konfirmasi pembayaran

## Tech stack

- Next.js (App Router)
- React
- TypeScript
- Vercel deployment
- MongoDB (database order dan game)
- Fonnte / WhatsApp API (notifikasi)

## Testing

```bash
pnpm test
```

Test fokus ke perhitungan kupon, harga order manual/Gamestone, fallback nominal provider, dan pencarian katalog.

## Alert operasional

Error checkout dicatat sebagai JSON di log server. Untuk mengaktifkan email alert, set `ADMIN_ALERT_EMAIL`; pengiriman memakai `RESEND_API_KEY` dan `NOTIFY_FROM_EMAIL` yang sudah dipakai notifikasi order. Alert di-throttle 5 menit per jenis error.

## Alur checkout

1. Pilih game dan nominal
2. Masukkan nomor telepon dan email
3. Pilih metode pembayaran
4. Bayar dan lanjutkan
5. Cek status pembayaran di halaman order

## Cek ID game (APIGames + fallback MLBB)

Form checkout punya tombol **Cek ID Game** untuk Mobile Legends dan Free Fire.
Pengecekan utama memanggil APIGames dan biayanya **Rp5/cek**, dipotong dari
saldo deposit APIGames — bukan dari pembayaran customer. Hasil di-cache 10 menit
dan endpoint dibatasi 8 cek/menit per IP supaya biaya tidak boros.

Checker MLBB APIGames belum mengenali akun region **MY/PH**. Untuk katalog
`mobile-legends-bang-bang-my`, `-my-partner`, dan `-ph`, endpoint langsung
memakai fallback MLBB publik (`https://api.isan.eu.org/nickname/ml`) tanpa
memanggil APIGames. Untuk katalog MLBB utama, APIGames tetap dicoba lebih dulu,
lalu fallback dipakai kalau APIGames menjawab tidak ditemukan. Fallback tidak
butuh API key; URL-nya bisa diganti lewat env opsional `MLBB_CHECK_URL`.

Cek ID bersifat opsional: checkout tetap diproses Gamestone (butuh
`GAMESTONE_API_KEY`) walaupun user tidak menekan tombol cek. Kalau
`APIGAMES_MERCHANT_ID` / `APIGAMES_SECRET_KEY` kosong, Free Fire menampilkan
pesan bahwa cek ID belum aktif, sedangkan MLBB tetap bisa memakai fallback.
Untuk katalog MY/PH, negara dari fallback ikut divalidasi supaya akun region
lain tidak dinyatakan valid. Kalau fallback MLBB sedang down, cek ID
mengembalikan error dan checkout tetap bisa dilanjutkan.

## Setup admin pertama

Saat database belum punya admin, form `/admin/login` menampilkan field
**Bootstrap Token**. Isi env `ADMIN_BOOTSTRAP_TOKEN` dengan string acak panjang
(contoh: hasil `openssl rand -hex 32`) sebelum membuat admin pertama. Tanpa env
ini, pendaftaran admin pertama ditolak — endpoint bootstrap tidak terbuka untuk
publik.

## Health check provider

`/api/health/stone` dan `/api/health/stone-sg` sekarang butuh auth. Set env
`HEALTH_CHECK_TOKEN`, lalu kirim header `x-health-token: <token>` atau
`Authorization: Bearer <token>`. Tanpa token, endpoint mengembalikan 503 dan
probe provider tidak dijalankan.

## Kontribusi

Fork dan buat pull request ke branch `main`.

## Lisensi

Proyek ini tersedia untuk tujuan pribadi dan komersial.
