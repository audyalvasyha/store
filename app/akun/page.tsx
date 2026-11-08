import Link from "next/link"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { formatIDR } from "@/lib/catalog"
import {
  CUSTOMER_COOKIE,
  getCustomerIdentity,
  getCustomerOrders,
  getCustomerProfile,
  maskIdentity,
} from "@/lib/customer-auth"
import { CustomerLogin } from "@/components/customer-login"
import { CustomerLogout } from "@/components/customer-logout"
import { ProfileEditor } from "@/components/profile-editor"
import { LogoutAllButton } from "@/components/logout-all-button"
import { PasswordLogin } from "@/components/password-login"
import { PasswordRegister } from "@/components/password-register"
import { PasswordEditor } from "@/components/password-editor"
import { GoogleLoginButton } from "@/components/google-login-button"
import { AuthNav } from "@/components/auth-nav"
import { Footer } from "@/components/footer"
import { getGoogleClientId } from "@/lib/google-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Akun // GASTROS",
  description:
    "Masuk atau daftar dengan email + password, kode OTP, atau Google untuk melihat riwayat order, profil, dan keamanan akun.",
  robots: { index: false, follow: false },
}

const STATUS_TONE: Record<string, string> = {
  MENUNGGU_PEMBAYARAN: "border-amber-400/50 text-amber-300",
  DIPROSES: "border-sky-400/50 text-sky-300",
  SELESAI: "border-emerald-400/50 text-emerald-300",
  GAGAL: "border-destructive/60 text-destructive",
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const isRegister = mode === "daftar"
  const googleClientId = getGoogleClientId()

  const jar = await cookies()
  // DB bermasalah ≠ login gagal permanen — tampilkan form biasa.
  const identity = await getCustomerIdentity(jar.get(CUSTOMER_COOKIE)?.value).catch(() => null)
  const orders = identity ? await getCustomerOrders(identity).catch(() => []) : []
  const profile = identity ? await getCustomerProfile(identity).catch(() => null) : null

  const completed = orders.filter((o) => o.status === "SELESAI")
  const totalSpent = completed.reduce((sum, o) => sum + o.amount, 0)
  const masked = identity ? maskIdentity(identity) : ""
  const loginMethod =
    identity?.kind === "phone"
      ? "WhatsApp (OTP)"
      : identity?.provider === "google"
        ? "Google"
        : identity?.provider === "password"
          ? "Email & password"
          : "Email (OTP)"
  const displayName = profile?.name?.trim() || "Pembeli Gastros"
  const initial = (profile?.name?.trim()?.[0] ?? masked[0] ?? "G").toUpperCase()
  const joinedAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
        dateStyle: "long",
        timeZone: "Asia/Jakarta",
      })
    : null
  const lastLogin = profile?.lastLoginAt
    ? new Date(profile.lastLoginAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    : null

  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-6 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-accent" />
              <span className="relative font-sans text-lg text-accent-foreground leading-none">G$</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground uppercase">Gastros</span>
          </Link>
          <nav className="flex items-center gap-3 md:gap-6">
            <Link
              href="/games"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Games
            </Link>
            <Link
              href="/orders"
              className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] text-foreground/50 hover:text-foreground uppercase transition-colors"
            >
              Riwayat
            </Link>
            <AuthNav
              initialUser={
                identity
                  ? {
                      kind: identity.kind,
                      provider: identity.provider,
                      masked,
                      name: profile?.name ?? null,
                    }
                  : null
              }
            />
          </nav>
        </div>
      </header>

      <section className="px-4 md:px-8 lg:px-12 pt-6 md:pt-12 pb-8 md:pb-20 max-w-[1400px] mx-auto w-full">
        {!identity ? (
          <div className="mx-auto w-full max-w-xl py-4 md:py-10">
            <div className="text-center">
              <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
                [Akun]
              </span>
              <h1 className="font-sans text-[14vw] sm:text-6xl md:text-7xl tracking-tighter text-foreground leading-none uppercase mb-3 md:mb-4">
                {isRegister ? "Daftar" : "Masuk"}
                <span className="text-accent">.</span>
              </h1>
              <p className="mx-auto max-w-md font-mono text-[10px] md:text-xs text-foreground/50 leading-relaxed">
                {isRegister
                  ? "Daftar pakai email + password. Kita verifikasi email sekali lewat kode 6 digit — setelah itu login tinggal pakai password. Bisa juga daftar langsung pakai kode OTP di bawah."
                  : "Masuk pakai email + password. Kalau belum punya password, pakai kode OTP di bawah dulu — nanti bisa dibuat di halaman akun."}
              </p>
            </div>

            <div className="relative mx-auto mt-7 w-full max-w-md border border-border bg-card p-4 md:p-6">
              <span className="absolute left-0 top-0 h-0.5 w-16 bg-accent" aria-hidden="true" />

              <nav
                aria-label="Pilih mode akun"
                className="mb-6 grid grid-cols-2 gap-1 border border-border bg-background p-1"
              >
                <Link
                  href="/akun?mode=login"
                  aria-current={!isRegister ? "page" : undefined}
                  className={`flex min-h-[44px] items-center justify-center px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    !isRegister
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/50 hover:bg-card hover:text-foreground"
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  href="/akun?mode=daftar"
                  aria-current={isRegister ? "page" : undefined}
                  className={`flex min-h-[44px] items-center justify-center px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    isRegister
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/50 hover:bg-card hover:text-foreground"
                  }`}
                >
                  Daftar
                </Link>
              </nav>

              <div className="flex flex-col items-center">
                {googleClientId && (
                  <>
                    <div className="w-full max-w-sm">
                      <GoogleLoginButton clientId={googleClientId} />
                    </div>
                    <div className="my-6 flex w-full max-w-sm items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/30">
                        {isRegister ? "atau daftar pakai email" : "atau masuk pakai email"}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                {isRegister ? <PasswordRegister /> : <PasswordLogin />}

                <div className="mt-6 flex w-full max-w-sm items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/30">
                    atau pakai kode OTP
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div id="otp" className="mt-4 w-full scroll-mt-24">
                  <CustomerLogin
                    key={isRegister ? "daftar" : "login"}
                    mode={isRegister ? "daftar" : "login"}
                  />
                </div>

                <div className="mt-6 w-full border-t border-border pt-4 text-center">
                  <p className="font-mono text-[9px] md:text-[10px] text-foreground/35 leading-relaxed">
                    Satu akun buat semua game: riwayat order permanen, status real-time,
                    dan tombol beli lagi tanpa isi ulang data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <span className="font-mono text-[10px] md:text-[11px] text-accent tracking-[0.2em] md:tracking-[0.3em] uppercase block mb-1 md:mb-2">
              [Akun]
            </span>
            <h1 className="font-sans text-[14vw] sm:text-6xl md:text-7xl tracking-tighter text-foreground leading-none uppercase mb-4 md:mb-6">
              Akun Saya<span className="text-accent">.</span>
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-8">
              <p className="font-mono text-[10px] md:text-xs text-foreground/50">
                Halo, <span className="text-foreground">{displayName}</span>{" "}
                <span className="text-foreground/35">// {masked}</span>
              </p>
              <CustomerLogout />
            </div>

            {/* Profil + keamanan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-10">
              <section className="border border-border bg-card p-4 md:p-6">
                <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
                  [Profil]
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-accent font-sans text-2xl leading-none text-accent-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-sans text-xl md:text-2xl uppercase tracking-tight text-foreground">
                      {displayName}
                    </p>
                    <p className="truncate font-mono text-[10px] text-foreground/45">
                      {masked} · {identity.kind === "email" ? "Email" : "WhatsApp"}
                    </p>
                  </div>
                </div>
                <ProfileEditor initialName={profile?.name} />
                {joinedAt && (
                  <p className="mt-3 font-mono text-[9px] text-foreground/35">
                    Member sejak {joinedAt}
                  </p>
                )}
              </section>

              <section className="border border-border bg-card p-4 md:p-6">
                <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
                  [Keamanan]
                </span>
                <dl className="flex flex-col gap-2 font-mono text-[10px] md:text-xs">
                  <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <dt className="text-foreground/45">Metode masuk</dt>
                    <dd className="text-foreground">{loginMethod}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <dt className="text-foreground/45">Identitas</dt>
                    <dd className="text-foreground text-right break-all">{masked}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <dt className="text-foreground/45">Terakhir masuk</dt>
                    <dd className="text-foreground text-right">{lastLogin ?? "Baru saja"}</dd>
                  </div>
                  {identity.kind === "email" && (
                    <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                      <dt className="text-foreground/45">Password</dt>
                      <dd className="text-foreground text-right">
                        {profile?.hasPassword ? "Aktif" : "Belum diatur"}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground/45">Masa sesi</dt>
                    <dd className="text-foreground text-right">30 hari · httpOnly</dd>
                  </div>
                </dl>
                {identity.kind === "email" && (
                  <PasswordEditor
                    hasPassword={Boolean(profile?.hasPassword)}
                    provider={identity.provider}
                  />
                )}
                <div className="mt-4">
                  <LogoutAllButton />
                </div>
                <p className="mt-2 font-mono text-[9px] text-foreground/30 leading-relaxed">
                  Keluar dari perangkat ini pakai tombol Keluar di atas.
                </p>
              </section>
            </div>

            {/* Ringkasan */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-10">
              {[
                { label: "Total order", value: String(orders.length) },
                { label: "Selesai", value: String(completed.length) },
                { label: "Total belanja", value: formatIDR(totalSpent) },
              ].map((s) => (
                <div key={s.label} className="border border-border bg-card p-3 md:p-4">
                  <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.12em] uppercase block mb-1.5">
                    {s.label}
                  </span>
                  <span className="font-sans text-lg md:text-2xl text-foreground tracking-tight tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
              Riwayat Order ({orders.length})
            </span>

            {orders.length === 0 ? (
              <div className="border border-border bg-card p-6 md:p-10 text-center">
                <p className="font-sans text-lg md:text-2xl text-foreground uppercase tracking-tight">
                  Belum ada order<span className="text-accent">.</span>
                </p>
                <p className="font-mono text-[10px] md:text-xs text-foreground/50 leading-relaxed mt-2 mb-5">
                  Order pertama kamu bakal otomatis muncul di sini, pakai email atau
                  nomor WhatsApp yang sama saat checkout.
                </p>
                <Link
                  href="/games"
                  className="inline-flex items-center justify-center bg-accent text-accent-foreground font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] hover-glitch"
                >
                  Pilih Game &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:gap-3">
                {orders.map((order) => (
                  <div key={order.code} className="border border-border bg-card p-3 md:p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-mono text-[9px] md:text-[10px] text-foreground/40 tracking-[0.1em] uppercase">
                        {order.code} ·{" "}
                        {new Date(order.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        })}{" "}
                        WIB
                      </span>
                      <span
                        className={`inline-flex items-center border px-2 py-1 font-mono text-[9px] tracking-[0.15em] uppercase ${
                          STATUS_TONE[order.status] ?? "border-border text-foreground/60"
                        }`}
                      >
                        ● {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-sans text-lg md:text-2xl text-foreground tracking-tight uppercase leading-none">
                          {order.gameName}
                        </h2>
                        <p className="font-mono text-[10px] md:text-[11px] text-foreground/50 mt-1">
                          {order.denomLabel} ×{order.quantity} · {formatIDR(order.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/orders/${order.code}`}
                          className="border border-border font-mono text-[9px] md:text-[10px] tracking-[0.15em] uppercase px-3 py-2 min-h-[36px] text-foreground/60 hover:text-foreground"
                        >
                          Detail
                        </Link>
                        <Link
                          href={`/top-up/${order.gameSlug}`}
                          className="bg-accent text-accent-foreground font-mono text-[9px] md:text-[10px] tracking-[0.15em] uppercase px-3 py-2 min-h-[36px] hover-glitch"
                        >
                          Beli Lagi
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  )
}
