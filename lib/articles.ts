import { ARTICLE_INDEX, type ArticleMeta } from "@/lib/article-index"

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; label: string; text: string }
  | { type: "steps"; items: Array<{ title: string; text: string }> }
  | { type: "links"; title: string; items: Array<{ label: string; href: string }> }
  | { type: "table"; headers: string[]; rows: string[][] }

export type ArticleSection = {
  id: string
  title: string
  blocks: ArticleBlock[]
}

export type Article = ArticleMeta & {
  keyPoints: string[]
  sections: ArticleSection[]
  faqs?: Array<{ q: string; a: string }>
}

const CONTENT: Record<
  string,
  Pick<Article, "keyPoints" | "sections" | "faqs">
> = {
  "cara-top-up-diamond-mobile-legends": {
    keyPoints: [
      "Top up MLBB cuma butuh User ID dan Server ID, bukan email atau password akun.",
      "Server ID yang salah bisa bikin Diamond masuk ke akun yang salah.",
      "Simpan kode order sampai item benar-benar masuk ke akun.",
    ],
    sections: [
      {
        id: "user-id-dan-server",
        title: "User ID dan Server ID itu beda",
        blocks: [
          {
            type: "p",
            text:
              "Sebelum top up Diamond Mobile Legends, buka game dan lihat bagian profil. Di bawah nama akun biasanya ada dua angka: User ID dan Server ID. User ID adalah identitas akun kamu, sedangkan Server ID menunjukkan zona tempat akun itu berada. Dua-duanya perlu diisi dengan benar saat checkout.",
          },
          {
            type: "p",
            text:
              "Yang sering kejadian: User ID sudah benar, tapi Server ID dikira bagian dari User ID sehingga dikosongkan. Akibatnya transaksi bisa gagal atau Diamond masuk ke akun lain. Kalau ragu, buka profil game lagi dan cocokkan angkanya satu per satu sebelum bayar.",
          },
          {
            type: "note",
            label: "Jangan kasih password",
            text:
              "Top up yang legal nggak pernah minta password, kode OTP, atau akses login akun game. Cukup User ID dan Server ID. Kalau ada situs atau orang yang minta data login, itu red flag.",
          },
          {
            type: "p",
            text:
              "Kalau kamu main di beberapa wilayah, pastikan akun yang sedang dibuka memang akun yang mau di-top up. Jangan cuma mengandalkan nama atau foto profil karena dua akun berbeda bisa punya nama yang sama.",
          },
        ],
      },
      {
        id: "pilih-nominal",
        title: "Cara memilih nominal Diamond",
        blocks: [
          {
            type: "p",
            text:
              "Halaman top up biasanya menampilkan beberapa pilihan nominal, mulai dari Diamond dalam jumlah kecil sampai paket besar. Pilih sesuai kebutuhan, bukan cuma karena angka paling murah kelihatan menarik. Untuk beli skin atau battle pass, hitung dulu total Diamond yang dibutuhkan supaya nggak beli dua kali dalam jumlah kecil.",
          },
          {
            type: "ul",
            items: [
              "Cek jumlah Diamond yang diterima, bukan cuma harganya.",
              "Perhatikan paket yang punya bonus atau item tambahan.",
              "Kalau butuh Twilight Pass atau item non-currency, pilih produk yang sesuai, bukan menukar Diamond.",
              "Bandingkan harga per Diamond kalau kamu rutin top up dalam jumlah besar.",
            ],
          },
          {
            type: "p",
            text:
              "Harga dan ketersediaan nominal bisa berubah mengikuti katalog dan provider. Karena itu, selalu cek ulang total pembayaran di ringkasan order sebelum menekan tombol bayar.",
          },
          {
            type: "links",
            title: "Langsung ke katalog MLBB",
            items: [
              { label: "Lihat nominal Diamond Mobile Legends", href: "/top-up/mobile-legends" },
              { label: "Bandingkan semua game di katalog", href: "/games" },
            ],
          },
        ],
      },
      {
        id: "urutan-top-up",
        title: "Urutan top up yang benar",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Buka game dan salin data akun",
                text:
                  "Catat User ID dan Server ID dari halaman profil. Jangan menyalin dari screenshot lama kalau kamu pernah pindah akun.",
              },
              {
                title: "Pilih game dan nominal",
                text:
                  "Masuk ke halaman top up Mobile Legends, lalu pilih nominal yang sesuai kebutuhan.",
              },
              {
                title: "Isi data dan cek ringkasan",
                text:
                  "Masukkan User ID, Server ID, email, dan nomor WhatsApp yang aktif. Baca lagi ringkasan game, nominal, dan total sebelum membayar.",
              },
              {
                title: "Bayar lewat metode yang tersedia",
                text:
                  "Ikuti instruksi pembayaran di halaman order. Jangan transfer ke rekening pribadi yang nggak tercantum di halaman resmi.",
              },
              {
                title: "Pantau status order",
                text:
                  "Simpan kode order. Status pembayaran dan pengiriman item bisa dicek ulang lewat halaman Riwayat Order.",
              },
            ],
          },
        ],
      },
      {
        id: "bayar-dan-status",
        title: "Bayar, lalu pantau status order",
        blocks: [
          {
            type: "p",
            text:
              "Setelah checkout, kamu akan mendapat kode order. Kode ini penting kalau pembayaran sudah berhasil tapi Diamond belum masuk. Buka halaman detail order untuk melihat status pembayaran dan status pengiriman item. Jangan langsung membuat order baru sebelum status order lama dicek.",
          },
          {
            type: "p",
            text:
              "Waktu pengiriman bisa berbeda tergantung antrean provider dan metode pembayaran. Kalau status sudah menunjukkan pembayaran diterima tetapi item belum masuk, tunggu proses provider selesai lalu cek kembali. Kalau terasa terlalu lama, hubungi CS dengan menyertakan kode order—bukan mengirim password atau OTP.",
          },
          {
            type: "links",
            title: "Cek order kamu",
            items: [
              { label: "Buka Riwayat Order", href: "/orders" },
              { label: "Baca panduan top up Free Fire", href: "/artikel/panduan-top-up-free-fire" },
              { label: "Tips aman top up game online", href: "/artikel/tips-aman-top-up-game-online" },
            ],
          },
        ],
      },
      {
        id: "kalau-belum-masuk",
        title: "Kalau Diamond belum masuk",
        blocks: [
          {
            type: "ol",
            items: [
              "Cek kembali User ID dan Server ID di detail order. Kesalahan data biasanya terlihat di sini.",
              "Buka halaman status order dan lihat apakah pembayaran sudah terverifikasi.",
              "Jangan membuat order baru dulu; dua order untuk akun yang sama bisa bikin proses pengecekan lebih rumit.",
              "Hubungi CS dengan kode order, nominal, dan waktu pembayaran.",
              "Simpan bukti pembayaran sampai item diterima.",
            ],
          },
          {
            type: "note",
            label: "Kalau salah server",
            text:
              "Segera hubungi CS setelah menyadari kesalahan. Kalau item sudah terkirim ke akun lain, proses pemulihan bergantung pada kebijakan provider dan nggak selalu bisa dibatalkan. Karena itu, cek Server ID sebelum bayar.",
          },
        ],
      },
      {
        id: "checklist-aman",
        title: "Checklist sebelum bayar",
        blocks: [
          {
            type: "ul",
            items: [
              "User ID dan Server ID sudah dicocokkan langsung dari profil game.",
              "Nominal dan harga sudah sesuai dengan yang kamu butuhkan.",
              "Alamat situs benar dan bukan tautan dari chat yang nggak dikenal.",
              "Metode pembayaran muncul di halaman order resmi.",
              "Kode order dan bukti bayar sudah disimpan.",
            ],
          },
          {
            type: "p",
            text:
              "Top up Diamond seharusnya sederhana: isi data yang benar, bayar, lalu pantau status. Kalau ada pihak yang meminta data login atau menawarkan harga yang jauh di bawah katalog, lebih aman berhenti dulu daripada kehilangan akun.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Apakah top up MLBB perlu login akun game?",
        a: "Nggak. Cukup User ID dan Server ID. Jangan berikan password, OTP, atau akses login ke siapa pun.",
      },
      {
        q: "Berapa lama Diamond masuk setelah bayar?",
        a: "Waktu proses tergantung provider dan antrean. Halaman order menampilkan status pembayaran dan pengiriman supaya kamu bisa memantau tanpa menebak-nebak.",
      },
      {
        q: "Apa bedanya Diamond dan Twilight Pass?",
        a: "Diamond adalah mata uang dalam game. Twilight Pass adalah produk terpisah yang punya aturan dan masa berlaku sendiri, jadi pilih produk sesuai yang kamu butuhkan.",
      },
    ],
  },

  "tips-aman-top-up-game-online": {
    keyPoints: [
      "Situs top up yang sah nggak perlu password atau kode OTP akun game.",
      "Harga yang jauh lebih murah dari pasaran bukan otomatis penipuan, tapi wajib dicek.",
      "Simpan kode order dan bukti pembayaran sampai item masuk.",
    ],
    sections: [
      {
        id: "kenapa-hati-hati",
        title: "Kenapa top up game rawan scam?",
        blocks: [
          {
            type: "p",
            text:
              "Top up game melibatkan dua hal yang berharga: uang dan akun game. Penipu biasanya memanfaatkan salah satunya. Modusnya bisa berupa situs palsu yang mirip situs resmi, harga terlalu murah, sampai permintaan password dengan alasan 'biar diproses admin'.",
          },
          {
            type: "p",
            text:
              "Kabar baiknya, sebagian besar scam bisa dihindari dengan kebiasaan sederhana. Nggak perlu jadi ahli keamanan; cukup teliti sebelum membayar dan berhenti kalau ada permintaan yang aneh.",
          },
        ],
      },
      {
        id: "cek-domain",
        title: "1. Cek domain dan alamat situs",
        blocks: [
          {
            type: "p",
            text:
              "Buka situs lewat alamat yang kamu ketik sendiri atau bookmark. Jangan langsung percaya tautan dari DM, komentar, atau iklan yang mendesak. Perhatikan ejaan domain: satu huruf yang berbeda bisa mengarah ke situs tiruan.",
          },
          {
            type: "ul",
            items: [
              "Pastikan alamat situs sesuai dengan yang biasa kamu pakai.",
              "Cek apakah koneksi memakai HTTPS dan tidak ada peringatan sertifikat.",
              "Hindari situs yang meminta instal aplikasi tambahan hanya untuk top up.",
              "Jangan login lewat halaman yang alamatnya mencurigakan.",
            ],
          },
        ],
      },
      {
        id: "jangan-kasih-password",
        title: "2. Jangan pernah kasih password atau OTP",
        blocks: [
          {
            type: "p",
            text:
              "Top up yang benar cuma butuh data tujuan seperti User ID, Server ID, atau Player ID. Nggak ada alasan admin atau CS meminta password, kode OTP, PIN, atau kode verifikasi akun game. Kalau ada yang memintanya, hentikan percakapan.",
          },
          {
            type: "note",
            label: "Aturan simpel",
            text:
              "Kalau diminta password atau OTP, itu bukan top up. Itu percobaan mengambil alih akun.",
          },
        ],
      },
      {
        id: "cek-data",
        title: "3. Cocokkan ID sebelum bayar",
        blocks: [
          {
            type: "p",
            text:
              "Salah ID atau server adalah penyebab item nyasar yang paling umum. Buka profil game, salin data dengan hati-hati, lalu baca ringkasan order. Kalau ada nama akun yang ditampilkan, cocokkan dengan akun kamu.",
          },
          {
            type: "p",
            text:
              "Jangan mengandalkan nama akun saja karena nama bisa sama. User ID dan Server ID adalah pembeda utama. Untuk game yang cuma memakai Player ID, pastikan angka yang kamu masukkan bukan ID login atau ID perangkat.",
          },
        ],
      },
      {
        id: "harga-wajar",
        title: "4. Waspadai harga yang terlalu jauh di bawah pasaran",
        blocks: [
          {
            type: "p",
            text:
              "Harga bisa berbeda karena promo, metode pembayaran, atau jalur distributor. Tapi diskon yang ekstrem dan disertai tekanan waktu—'sisa 2 menit', 'hanya hari ini'—adalah pola yang perlu dicurigai. Bandingkan dengan katalog lain dan cek apakah situsnya jelas menampilkan identitas bisnis serta kontak.",
          },
          {
            type: "ul",
            items: [
              "Harga jauh lebih murah tanpa penjelasan yang masuk akal.",
              "Diminta transfer ke rekening pribadi yang tidak tercantum di situs.",
              "Diminta menambahkan biaya admin di luar total order.",
              "Diminta konfirmasi pembayaran lewat akun yang tidak jelas.",
            ],
          },
        ],
      },
      {
        id: "bayar-resmi",
        title: "5. Pakai kanal pembayaran yang jelas",
        blocks: [
          {
            type: "p",
            text:
              "Selesaikan pembayaran di halaman order dan ikuti metode yang tampil di sana: QRIS, e-wallet, virtual account, atau kanal lain yang memang disediakan. Jangan membayar ke rekening baru yang dikirim lewat chat pribadi tanpa konfirmasi dari kanal resmi.",
          },
          {
            type: "p",
            text:
              "Setelah membayar, simpan bukti transaksi. Screenshot atau nota dari aplikasi pembayaran membantu kalau status order perlu dicek ulang.",
          },
        ],
      },
      {
        id: "simpan-order",
        title: "6. Simpan kode order",
        blocks: [
          {
            type: "p",
            text:
              "Kode order adalah penghubung antara pembayaran dan pesananmu. Tanpa kode ini, tim CS lebih sulit mencari transaksi. Simpan kode atau buka halaman Riwayat Order supaya status bisa dipantau kapan saja.",
          },
          {
            type: "links",
            title: "Akses cepat",
            items: [
              { label: "Cek status order", href: "/orders" },
              { label: "Baca istilah dasar top up game", href: "/artikel/apa-itu-top-up-game" },
            ],
          },
        ],
      },
      {
        id: "kalau-kena-scam",
        title: "7. Kalau sudah terlanjur kena scam",
        blocks: [
          {
            type: "ol",
            items: [
              "Amankan akun game: ganti password dan aktifkan verifikasi dua langkah.",
              "Hubungi penyedia pembayaran atau bank untuk melaporkan transaksi.",
              "Simpan semua bukti chat, transfer, dan tautan situs.",
              "Laporkan ke platform tempat kamu menemukan penawaran.",
              "Jangan membayar 'biaya pemulihan' ke pihak yang mengaku bisa mengembalikan uang.",
            ],
          },
          {
            type: "note",
            label: "Jangan panik",
            text:
              "Prioritaskan mengamankan akun dan bukti transaksi. Semakin lengkap buktinya, semakin besar peluang laporan diproses oleh penyedia pembayaran.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Apakah top up aman kalau situsnya pakai HTTPS?",
        a: "HTTPS penting, tapi bukan jaminan situs itu terpercaya. Tetap cek alamat domain, metode pembayaran, kontak, dan jangan pernah memberikan password atau OTP.",
      },
      {
        q: "Apakah boleh top up ke akun teman?",
        a: "Bisa, asalkan kamu memasukkan User ID dan Server ID akun tujuan dengan benar. Pastikan kamu memang mengenal pemilik akun dan transaksinya memang untuk dia.",
      },
    ],
  },

  "panduan-top-up-free-fire": {
    keyPoints: [
      "Free Fire memakai Player ID numerik; umumnya nggak perlu Server ID.",
      "Bedakan Diamond, membership, dan paket item sebelum membeli.",
      "Player ID yang salah bisa membuat Diamond masuk ke akun lain.",
    ],
    sections: [
      {
        id: "siapkan-player-id",
        title: "Siapkan Player ID Free Fire",
        blocks: [
          {
            type: "p",
            text:
              "Di Free Fire, tujuan top up biasanya cukup satu data: Player ID. Buka profil pemain di game, lalu salin angka ID yang tertera. Jangan menebak dari nickname karena nama tampilan bisa diubah dan nggak unik.",
          },
          {
            type: "p",
            text:
              "Kalau kamu pernah mengganti akun atau memainkan akun orang lain, pastikan Player ID yang dicatat memang akun yang sedang aktif. Untuk akun tamu, sebaiknya ikat akun ke Google, Facebook, atau Apple ID supaya progres nggak hilang saat ganti perangkat.",
          },
          {
            type: "note",
            label: "Tanpa password",
            text:
              "Top up Free Fire nggak membutuhkan password akun. Jangan pernah memberikan kode OTP atau akses login ke penyedia top up mana pun.",
          },
        ],
      },
      {
        id: "diamond-vs-membership",
        title: "Diamond, membership, atau paket item?",
        blocks: [
          {
            type: "p",
            text:
              "Free Fire punya beberapa jenis produk yang sering muncul di halaman top up. Diamond adalah currency utama untuk membeli item di dalam game. Membership adalah paket berlangganan yang memberi keuntungan periode tertentu. Ada juga paket bundel atau item khusus yang aturannya berbeda.",
          },
          {
            type: "table",
            headers: ["Produk", "Cocok untuk", "Yang perlu dicek"],
            rows: [
              ["Diamond", "Beli item, skin, atau kebutuhan langsung", "Jumlah Diamond dan total harga"],
              ["Membership", "Manfaat rutin dalam periode aktif", "Durasi dan masa berlaku"],
              ["Bundel / item khusus", "Paket yang sudah ditentukan provider", "Isi paket dan syarat pemakaian"],
            ],
          },
          {
            type: "p",
            text:
              "Kalau kamu cuma butuh saldo untuk beli item tertentu, Diamond biasanya paling fleksibel. Kalau ingin manfaat harian atau mingguan, cek isi membership dan periode aktifnya sebelum membeli. Jangan menganggap semua produk akan menambah saldo Diamond dalam jumlah yang sama.",
          },
        ],
      },
      {
        id: "cara-top-up",
        title: "Cara top up Free Fire",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Buka profil game",
                text: "Catat Player ID dari halaman profil. Pastikan akun yang terbuka memang akun tujuan.",
              },
              {
                title: "Pilih nominal atau paket",
                text: "Tentukan Diamond, membership, atau paket lain sesuai kebutuhan. Cek jumlah dan total harga.",
              },
              {
                title: "Isi data tujuan",
                text: "Masukkan Player ID dan kontak yang aktif. Baca ulang data sebelum melanjutkan.",
              },
              {
                title: "Bayar dan simpan kode order",
                text: "Selesaikan pembayaran lewat metode di halaman order, lalu simpan kode untuk memantau status.",
              },
            ],
          },
          {
            type: "links",
            title: "Katalog Free Fire",
            items: [
              { label: "Lihat nominal Free Fire", href: "/top-up/free-fire" },
              { label: "Cara top up MLBB yang aman", href: "/artikel/cara-top-up-diamond-mobile-legends" },
            ],
          },
        ],
      },
      {
        id: "cek-membership",
        title: "Kalau membeli membership",
        blocks: [
          {
            type: "p",
            text:
              "Membership punya periode aktif. Sebelum membeli, cek apakah kamu sudah punya membership yang masih berjalan dan bagaimana aturan penumpukannya. Produk membership bisa berbeda dari top up Diamond biasa, termasuk cara item muncul di akun.",
          },
          {
            type: "ul",
            items: [
              "Catat tanggal pembelian dan periode yang dijanjikan.",
              "Cek menu membership di game setelah transaksi selesai.",
              "Jangan membeli membership kedua kalau periode pertama belum terlihat.",
              "Hubungi CS dengan kode order kalau manfaat belum muncul.",
            ],
          },
        ],
      },
      {
        id: "tips-free-fire",
        title: "Tips biar transaksi lancar",
        blocks: [
          {
            type: "ul",
            items: [
              "Salin Player ID langsung dari game, bukan dari chat lama.",
              "Pastikan nomor WhatsApp dan email masih aktif.",
              "Jangan menutup halaman order sebelum pembayaran selesai.",
              "Simpan bukti bayar sampai item diterima.",
              "Kalau ada kendala, kirim kode order ke CS, bukan data login.",
            ],
          },
          {
            type: "p",
            text:
              "Top up yang aman itu transparan: tujuan, nominal, harga, dan status order semuanya kelihatan. Kalau ada langkah yang meminta data di luar itu, lebih baik berhenti dan cek ulang.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Free Fire perlu Server ID?",
        a: "Umumnya cukup Player ID. Kalau halaman top up meminta data tambahan, ikuti petunjuk yang tertera dan pastikan datanya sesuai dengan akun tujuan.",
      },
      {
        q: "Apa bedanya Diamond dan membership Free Fire?",
        a: "Diamond adalah saldo currency untuk membeli item. Membership adalah paket manfaat dengan periode aktif tertentu. Keduanya produk berbeda dan punya cara cek tersendiri di game.",
      },
    ],
  },

  "apa-itu-top-up-game": {
    keyPoints: [
      "Top up adalah pembelian item digital yang dikirim ke akun game lewat ID.",
      "User ID, Server ID, denom, dan voucher adalah istilah yang berbeda.",
      "Top up langsung tidak sama dengan voucher yang perlu ditukar sendiri.",
    ],
    sections: [
      {
        id: "pengertian",
        title: "Apa itu top up game?",
        blocks: [
          {
            type: "p",
            text:
              "Top up game adalah proses membeli item digital di dalam game—seperti Diamond, CP, VP, Robux, atau currency lain—melalui penyedia di luar aplikasi game. Item dikirim ke akun tujuan berdasarkan data yang kamu masukkan, biasanya User ID atau Player ID.",
          },
          {
            type: "p",
            text:
              "Karena transaksinya dilakukan di luar game, kamu perlu memastikan data akun benar. Ini juga alasan penyedia top up yang aman tidak meminta password: pengiriman item cukup memakai ID tujuan, bukan akses penuh ke akun.",
          },
        ],
      },
      {
        id: "istilah",
        title: "Istilah yang sering ketemu",
        blocks: [
          {
            type: "table",
            headers: ["Istilah", "Arti singkat", "Contoh penggunaan"],
            rows: [
              ["User ID / Player ID", "Nomor identitas akun game", "Diisi saat checkout"],
              ["Server ID / Zone ID", "Kode wilayah akun", "Dibutuhkan di beberapa game seperti MLBB"],
              ["Denom", "Pilihan jumlah item yang dijual", "86 Diamond, 172 Diamond"],
              ["Currency", "Mata uang di dalam game", "Diamond, CP, VP, Robux"],
              ["Voucher", "Kode yang ditukar sendiri di game", "Kode redemption"],
              ["Membership", "Paket manfaat dengan periode aktif", "Weekly atau monthly pass"],
            ],
          },
          {
            type: "note",
            label: "ID bukan password",
            text:
              "User ID boleh dibagikan ke penyedia top up. Password, PIN, dan kode OTP tidak boleh diberikan ke siapa pun.",
          },
        ],
      },
      {
        id: "top-up-vs-voucher",
        title: "Top up langsung vs voucher",
        blocks: [
          {
            type: "p",
            text:
              "Top up langsung mengirim item ke akun berdasarkan ID. Kamu nggak perlu menukar kode apa pun. Voucher biasanya berupa kode yang harus dimasukkan sendiri di halaman redemption game atau toko aplikasi. Keduanya bisa sah, tapi cara pakainya berbeda.",
          },
          {
            type: "ul",
            items: [
              "Top up langsung: isi ID, pilih nominal, bayar, item dikirim ke akun.",
              "Voucher: beli kode, lalu tukar di tempat yang ditentukan penerbit.",
              "Membership: aktif untuk periode tertentu dan punya aturan sendiri.",
              "Bundel: isi paket sudah ditentukan, bukan saldo bebas.",
            ],
          },
          {
            type: "p",
            text:
              "Kalau tujuanmu menambah saldo game, pilih top up langsung. Kalau kamu memang butuh kode untuk hadiah atau redemption, baru pertimbangkan voucher. Baca keterangan produk sebelum membayar supaya nggak salah pilih.",
          },
        ],
      },
      {
        id: "harga-berbeda",
        title: "Kenapa harga top up bisa berbeda?",
        blocks: [
          {
            type: "p",
            text:
              "Harga bisa dipengaruhi jalur distribusi, metode pembayaran, promo, dan biaya admin. Penyedia yang terhubung ke distributor resmi biasanya punya struktur harga yang lebih stabil. Harga yang berbeda tipis wajar; yang perlu diwaspadai adalah diskon ekstrem tanpa penjelasan.",
          },
          {
            type: "p",
            text:
              "Jangan cuma membandingkan angka paling depan. Lihat total pembayaran, jumlah item yang diterima, dan status transaksi. Harga sedikit lebih mahal dengan status order yang jelas bisa lebih menguntungkan daripada harga murah tapi tanpa dukungan saat item belum masuk.",
          },
        ],
      },
      {
        id: "cara-kerja",
        title: "Bagaimana top up diproses?",
        blocks: [
          {
            type: "ol",
            items: [
              "Kamu memilih game dan nominal di situs penyedia.",
              "Data tujuan dikirim ke penyedia atau distributor resmi.",
              "Pembayaran diverifikasi.",
              "Item dikirim ke akun game berdasarkan ID.",
              "Status transaksi bisa dicek lewat kode order.",
            ],
          },
          {
            type: "links",
            title: "Mulai dari katalog",
            items: [
              { label: "Lihat semua game", href: "/games" },
              { label: "Cek riwayat order", href: "/orders" },
              { label: "Tips aman top up game", href: "/artikel/tips-aman-top-up-game-online" },
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Apa arti denom dalam top up game?",
        a: "Denom adalah pilihan jumlah item yang dijual, misalnya 86 Diamond, 172 Diamond, atau 355 Diamond. Kamu memilih denom sesuai kebutuhan.",
      },
      {
        q: "Apa bedanya User ID dan Server ID?",
        a: "User ID adalah identitas akun, sedangkan Server ID adalah kode wilayah akun. Beberapa game membutuhkan keduanya, sebagian cukup Player ID saja.",
      },
    ],
  },
}

export const ARTICLES: Article[] = ARTICLE_INDEX.map((meta) => ({
  ...meta,
  ...CONTENT[meta.slug],
}))

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug)
}

export function getRelatedArticles(article: Article, limit = 3): Article[] {
  return ARTICLES.filter((item) => item.slug !== article.slug)
    .sort((a, b) => {
      const score = (candidate: Article) =>
        (candidate.category === article.category ? 2 : 0) +
        (candidate.gameSlug && candidate.gameSlug === article.gameSlug ? 1 : 0)
      return score(b) - score(a) || b.date.localeCompare(a.date)
    })
    .slice(0, limit)
}
