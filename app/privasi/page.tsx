import type { Metadata } from "next"
import Link from "next/link"
import { EditorialHeader } from "@/components/editorial-header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi GASTROS: data yang kami proses, penggunaan cookie, analytics, dan iklan Google AdSense.",
  alternates: {
    canonical: "/privasi",
  },
}

const UPDATED = "11 November 2026"

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />
      <EditorialHeader />

      <article className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-6 md:px-8 md:pb-20 md:pt-10 lg:px-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/35 md:mb-10"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground/60">Kebijakan Privasi</span>
        </nav>

        <header className="border-b border-border pb-7 md:pb-10">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
            [Legal]
          </span>
          <h1 className="font-sans text-[15vw] uppercase leading-[0.86] tracking-tighter text-foreground sm:text-6xl md:text-7xl">
            Kebijakan Privasi<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-[11px] leading-relaxed text-foreground/55 md:text-xs">
            Halaman ini menjelaskan data apa yang kami proses saat kamu memakai
            GASTROS, bagaimana data itu dipakai, dan pilihan yang kamu punya.
          </p>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/35">
            Terakhir diperbarui: {UPDATED}
          </p>
        </header>

        <div className="mt-7 flex flex-col gap-7 font-mono text-[11px] leading-[1.85] text-foreground/60 md:mt-10 md:gap-9 md:text-[12px]">
          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Siapa kami
            </h2>
            <p>
              GASTROS adalah layanan top up game dan produk digital. Dalam
              kebijakan ini, “kami” berarti tim GASTROS yang mengelola situs
              gastros.id, termasuk layanan pelanggan dan pemrosesan order.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Data yang kami proses
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
              <li>
                <strong className="text-foreground/80">Data order:</strong> game,
                nominal, ID akun game, server ID bila diperlukan, nomor WhatsApp
                atau email, kode order, status pembayaran, dan status pengiriman
                item.
              </li>
              <li>
                <strong className="text-foreground/80">Data akun:</strong> email
                atau nomor WhatsApp yang kamu pakai untuk masuk, nama tampilan,
                foto profil (bila kamu unggah atau masuk lewat Google), serta
                riwayat order yang terhubung ke akun tersebut.
              </li>
              <li>
                <strong className="text-foreground/80">Data teknis:</strong> alamat
                IP, jenis browser/perangkat, halaman yang dibuka, waktu akses, dan
                cookie yang diperlukan agar situs berfungsi.
              </li>
              <li>
                <strong className="text-foreground/80">Data pembayaran:</strong>{" "}
                status transaksi dan referensi pembayaran dari penyedia layanan.
                Kami tidak menyimpan kredensial perbankan lengkap atau PIN.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Cara kami memakai data
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
              <li>Memproses, mengirim, dan mengecek status order.</li>
              <li>Memberikan bantuan pelanggan dan menangani keluhan.</li>
              <li>Mencegah penipuan, penyalahgunaan, dan transaksi tidak sah.</li>
              <li>Melihat performa situs secara agregat agar katalog dan artikel lebih baik.</li>
              <li>Menampilkan iklan, bila fitur iklan diaktifkan.</li>
              <li>Memenuhi kewajiban hukum yang berlaku.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Iklan dan cookie pihak ketiga
            </h2>
            <p>
              Kami dapat menampilkan iklan dari <strong className="text-foreground/80">Google AdSense</strong>{" "}
              di halaman artikel. Jika iklan aktif, Google dan mitranya dapat
              memakai cookie, termasuk cookie DoubleClick, untuk menampilkan iklan
              berdasarkan kunjungan kamu ke situs ini atau situs lain.
            </p>
            <p className="mt-3">
              Iklan dapat bersifat personalisasi atau non-personalisasi tergantung
              lokasi dan pilihan consent kamu. Kamu bisa mengatur preferensi iklan
              Google lewat{" "}
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                Google Ads Settings
              </a>
              , membaca{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                kebijakan iklan Google
              </a>
              , atau memakai pilihan opt-out di{" "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                aboutads.info
              </a>
              . Cookie pihak ketiga dikendalikan oleh penyedianya, bukan oleh
              GASTROS.
            </p>
            <p className="mt-3">
              Jika iklan diaktifkan untuk pengunjung di EEA, Inggris, atau Swiss,
              kami akan menampilkan permintaan consent yang dikelola penyedia
              consent management yang sesuai dengan ketentuan Google. Kamu bisa
              menolak cookie non-esensial lewat pilihan yang tersedia.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Analytics
            </h2>
            <p>
              Kami memakai analytics untuk melihat statistik kunjungan secara
              agregat, seperti halaman yang banyak dibuka dan performa perangkat.
              Data ini dipakai untuk memperbaiki situs dan tidak digunakan untuk
              mengidentifikasi kamu secara pribadi.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Berbagi data
            </h2>
            <p>
              Kami dapat membagikan data terbatas kepada penyedia yang membantu
              operasional, seperti penyedia pembayaran, penyedia layanan game,
              hosting, database, analytics, dan jaringan iklan. Mereka hanya
              menerima data yang diperlukan untuk menjalankan layanannya. Kami
              tidak menjual data pribadi kamu.
            </p>
            <p className="mt-3">
              Kami juga dapat mengungkap data jika diwajibkan hukum, diminta
              otoritas yang berwenang, atau diperlukan untuk melindungi hak,
              keamanan, dan pengguna GASTROS.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Penyimpanan dan keamanan
            </h2>
            <p>
              Data order disimpan selama diperlukan untuk operasional, layanan
              pelanggan, pencegahan penyalahgunaan, dan kewajiban hukum. Kami
              memakai HTTPS, kontrol akses, dan pembatasan akses internal untuk
              melindungi data. Tidak ada sistem yang sepenuhnya bebas risiko,
              tetapi kami berusaha menjaga data dengan wajar.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Hak kamu
            </h2>
            <p>
              Kamu dapat meminta akses, koreksi, atau penghapusan data pribadi
              yang kami simpan, serta menanyakan cara data dipakai. Kirim
              permintaan ke{" "}
              <a
                href="mailto:cs@gastros.id"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                cs@gastros.id
              </a>{" "}
              dari email atau nomor yang terhubung dengan order. Kami dapat
              meminta verifikasi sebelum memproses permintaan dan dapat menolak
              jika ada kewajiban penyimpanan yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Perubahan kebijakan
            </h2>
            <p>
              Kami dapat memperbarui halaman ini jika layanan, penyedia, atau
              ketentuan yang berlaku berubah. Versi terbaru selalu ditandai
              dengan tanggal pembaruan di atas.
            </p>
          </section>

          <section className="border border-border bg-card p-4 md:p-5">
            <h2 className="mb-2 font-sans text-2xl uppercase leading-none tracking-tight text-foreground md:text-3xl">
              Kontak
            </h2>
            <p>
              Pertanyaan tentang privasi atau data pribadi bisa dikirim ke{" "}
              <a
                href="mailto:cs@gastros.id"
                className="text-accent underline underline-offset-2 hover:opacity-75"
              >
                cs@gastros.id
              </a>
              . Untuk bantuan order, gunakan kanal CS yang tertera di footer.
            </p>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  )
}
