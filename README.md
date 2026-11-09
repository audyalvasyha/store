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

## Kontribusi

Fork dan buat pull request ke branch `main`.

## Lisensi

Proyek ini tersedia untuk tujuan pribadi dan komersial.
