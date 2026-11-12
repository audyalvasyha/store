# Campaign Promosi GASTROS — “Gas Pertama”

Dokumen kerja untuk konten organik 14 hari. Fokus: membangun trust, bukan cuma
menjual harga murah.

## Positioning

**Top Up Resmi. Gas Nonstop.**

Yang dijual lebih dulu:

- Jalur resmi publisher
- Tanpa login/password akun game
- Harga final tanpa biaya tersembunyi
- Proses rata-rata di bawah 3 menit
- QRIS/e-wallet dan layanan 24/7
- Garansi dana kembali kalau order bermasalah

Hindari klaim “termurah” tanpa bukti. Pakai harga spesifik + ajakan cek harga
terbaru.

## Link kampanye

Gunakan link berbeda per channel supaya atribusi jelas:

- Bio Instagram:
  `https://gastros.id/promo?utm_source=instagram&utm_medium=social&utm_campaign=gaspertama`
- Bio TikTok:
  `https://gastros.id/promo?utm_source=tiktok&utm_medium=social&utm_campaign=gaspertama`
- WhatsApp/Telegram:
  `https://gastros.id/promo?utm_source=whatsapp&utm_medium=community&utm_campaign=gaspertama`
- Creator:
  `https://gastros.id/promo?utm_source=creator&utm_medium=influencer&utm_campaign=gaspertama&utm_content=NAMA_CREATOR`

Halaman `/promo` meneruskan UTM ke halaman game dan checkout, lalu UTM
disimpan di order. Kupon tetap tercatat terpisah.

## Kalender 14 hari

| Hari | Channel | Konten | Tujuan |
| --- | --- | --- | --- |
| 1 | TikTok | “3 ciri top up game yang aman” | Trust |
| 2 | Instagram | Carousel 5 slide “Murah vs aman” | Save/share |
| 3 | Story | Poll “lagi main game apa?” + link promo | Interaksi |
| 4 | TikTok | Screen recording order MLBB sampai masuk | Bukti proses |
| 5 | WhatsApp | Broadcast/status promo + link | Order langsung |
| 6 | DM | Outreach 10 micro-creator | Partnership |
| 7 | Instagram | Repost testimoni + ulasan pembeli | Social proof |
| 8 | TikTok | “POV: diamond habis di tengah push rank” | Relatable |
| 9 | Instagram | Reels versi pendek dari video hari 8 | Repurpose |
| 10 | TikTok | Perbandingan harga nominal populer | Consideration |
| 11 | Story | Q&A: “aman nggak sih?” | Objection handling |
| 12 | TikTok | “Cara top up tanpa login akun” | Edukasi |
| 13 | WhatsApp | Follow-up pembeli + minta review | Retention |
| 14 | Semua | Rekap testimoni + evaluasi | Optimasi |

Komposisi: 70% relatable/edukasi, 20% bukti, 10% promo keras.

## 7 script siap rekam

### 1. Tiga ciri top up aman

**Hook:** “Top up diamond murah, tapi akun malah kena banned? Jangan sampai.”

**Body:** “Ciri top up aman: nggak minta password akun, ada status order yang
bisa dipantau, dan item dikirim lewat jalur resmi publisher. Di Gastros, cukup
User ID — nggak perlu login akun game.”

**CTA:** “Cek harga game kamu di gastros.id. Gas.”

### 2. Bukti proses

**Hook:** “Diamond tinggal 5, padahal lagi push rank. POV: kamu buka Gastros.”

**Body:** “Pilih nominal, isi User ID, bayar QRIS. Item masuk dalam hitungan
menit dan status order bisa dicek sampai selesai.”

**CTA:** “MLBB 86 diamond Rp19.500. Cek harga terbaru di gastros.id.”

### 3. POV diamond habis

**Hook:** “POV: baru mau push rank, diamond tinggal 5.”

**Body:** “Nggak perlu panik. Buka Gastros, pilih nominal, isi ID, bayar.
Sisanya biar kami yang gas.”

**CTA:** “Link di bio.”

### 4. Edukasi tanpa login

**Hook:** “Kamu nggak perlu kasih password akun game buat top up.”

**Body:** “Cukup User ID dan Server ID kalau diminta. Jangan pernah kasih
password, PIN, atau kode OTP ke situs top up mana pun.”

**CTA:** “Top up aman di gastros.id.”

### 5. Harga nominal populer

**Hook:** “Berapa sih harga 86 diamond MLBB sekarang?”

**Body:** “Di Gastros mulai Rp19.500. Harga final, tanpa biaya tersembunyi.
FF mulai Rp12.500, PUBG mulai Rp17.127, Roblox mulai Rp15.000.”

**CTA:** “Cek nominal lain di gastros.id/games.”

### 6. Testimoni

**Hook:** “Ini kata pembeli yang ordernya sudah selesai.”

**Body:** Tampilkan screenshot ulasan asli (blur data pribadi) dan status order
yang selesai. Jangan pakai testimoni karangan.

**CTA:** “Mau coba? Link di bio.”

### 7. Behind the scenes

**Hook:** “Yang terjadi setelah kamu bayar QRIS.”

**Body:** “Order masuk, pembayaran diverifikasi, item dikirim lewat jalur
resmi, lalu status berubah jadi selesai. Kalau ada kendala, CS bantu cek.”

**CTA:** “Top up di gastros.id.”

## Caption & hashtag

### Caption utama

> Diamond habis di tengah push rank? Gas isi di Gastros.
> Jalur resmi publisher, tanpa login akun, proses <3 menit.
> Cek harga game kamu di link bio.

### Hashtag

`#topupmlbb #diamondmlbb #gastros #topupgame #mlbbindonesia #freefire #pubgmobile #valorant #roblox`

Pakai 5–8 hashtag, jangan penuh semua.

## WhatsApp broadcast

> ⚡ **TOP UP GAME DI GASTROS**
> MLBB 86 diamond Rp19.500
> FF mulai Rp12.500
> Proses <3 menit • jalur resmi • tanpa login akun
> Bayar QRIS/e-wallet
> Cek harga terbaru: gastros.id/promo

## Setup tracking

Isi env berikut di Settings → Environment (jangan taruh nilai rahasia di repo):

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — format `G-XXXXXXXXXX`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- `NEXT_PUBLIC_META_PIXEL_ID` — opsional, hanya kalau mau Meta Ads
- `NEXT_PUBLIC_TIKTOK_PIXEL_ID` — opsional, hanya kalau mau TikTok Ads

Selama env kosong, script tidak dimuat. Event yang dikirim:

- `begin_checkout` saat user menekan Buat Order
- `purchase` sekali per order setelah status `SELESAI`

## Aturan konten

- Jangan janji “dijamin tidak banned”. Bilang “lebih aman karena jalur resmi”.
- Jangan pakai testimoni palsu atau angka penjualan yang belum diverifikasi.
- Selalu tampilkan bukti proses asli (screen recording) minimal 1x per minggu.
- Jangan blast promo massal lewat gateway WhatsApp yang dipakai untuk OTP.
