/**
 * Skeleton halaman /top-up/[slug] (segment loading Next.js).
 * Mirror layout form checkout asli: kicker + judul, STEP 01 (filter + grid
 * varian), STEP 02 (data akun), STEP 03 (metode bayar), dan kotak ringkasan.
 * Muncul instan saat navigasi RSC sebelum data game/variant provider siap.
 */
export default function TopupLoading() {
  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      {/* Header nav */}
      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-3 md:py-6 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-accent opacity-60" />
            </div>
            <div className="h-3 w-24 bg-foreground/10 animate-pulse" />
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="h-3 w-12 bg-foreground/10 animate-pulse" />
            <div className="h-3 w-12 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.15s" }} />
            <div className="h-3 w-14 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.25s" }} />
          </div>
        </div>
      </header>

      {/* Kicker + judul */}
      <section className="px-4 pt-5 md:pt-10 pb-6 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="h-7 w-16 border border-border bg-foreground/[0.06] animate-pulse" />
        </div>

        <div className="h-3 w-56 bg-accent/30 animate-pulse" />
        <div className="mt-2 h-[11vw] max-h-24 w-[min(55%,520px)] bg-foreground/10 animate-pulse" />
      </section>

      {/* Form checkout */}
      <section className="px-4 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 md:gap-8 items-start">
          <div className="flex flex-col gap-4 md:gap-6">
            {/* STEP 01 — pilih nominal */}
            <fieldset className="border border-border bg-card p-4 md:p-6">
              <div className="h-3 w-52 bg-foreground/10 animate-pulse" />
              {/* filter bar */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 md:gap-3 mt-4">
                <div className="h-10 md:h-12 border border-border bg-background animate-pulse" />
                <div className="flex border border-border">
                  <div className="w-24 md:w-28 h-10 md:h-12 bg-foreground/10 animate-pulse" />
                  <div className="w-20 md:w-24 h-10 md:h-12 bg-foreground/[0.06] animate-pulse" />
                  <div className="w-20 md:w-24 h-10 md:h-12 bg-foreground/10 animate-pulse" />
                </div>
              </div>
              {/* chips kategori */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <div className="h-7 w-20 border border-border bg-accent/20 animate-pulse" />
                <div className="h-7 w-16 border border-border bg-foreground/[0.06] animate-pulse" />
                <div className="h-7 w-16 border border-border bg-foreground/[0.06] animate-pulse" />
              </div>
              {/* grid varian (4 kolom di md, sama kayak asli) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 mt-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative border border-border bg-background/60 p-2.5 md:p-4 min-h-[64px] md:min-h-[96px] animate-pulse"
                    style={{ animationDelay: `${(i % 4) * 0.1}s` }}
                  >
                    <div className="h-2.5 w-12 bg-foreground/15" />
                    <div className="mt-2 h-4 md:h-5 w-3/4 bg-foreground/15" />
                    <div className="mt-1.5 h-2.5 w-14 bg-foreground/10" />
                  </div>
                ))}
              </div>
              {/* tombol tampilkan semua */}
              <div className="w-full mt-3 h-9 md:h-10 border border-border bg-foreground/10 animate-pulse" />
            </fieldset>

            {/* STEP 02 — data akun */}
            <fieldset className="border border-border bg-card p-4 md:p-6">
              <div className="h-3 w-44 bg-foreground/10 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse" style={{ animationDelay: `${(i % 2) * 0.12}s` }}>
                    <div className="h-2.5 w-24 bg-foreground/10" />
                    <div className="mt-1.5 h-10 md:h-11 border border-border bg-background" />
                  </div>
                ))}
              </div>
            </fieldset>

            {/* STEP 03 — metode pembayaran */}
            <fieldset className="border border-border bg-card p-4 md:p-6">
              <div className="h-3 w-48 bg-foreground/10 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative border border-border bg-background/60 p-2.5 md:p-4 min-h-[56px] animate-pulse"
                    style={{ animationDelay: `${(i % 3) * 0.1}s` }}
                  >
                    <div className="h-3.5 w-16 bg-foreground/15" />
                    <div className="mt-1 h-2.5 w-20 bg-foreground/10" />
                    {i === 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent" />}
                  </div>
                ))}
              </div>
              <div className="mt-3 h-3 w-64 bg-foreground/10 animate-pulse" />
            </fieldset>
          </div>

          {/* Ringkasan order */}
          <aside className="lg:sticky lg:top-4 border border-border bg-card p-4 md:p-6">
            <div className="h-3 w-24 bg-accent/30 animate-pulse" />
            <div className="flex items-center gap-3 mt-4 mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 border border-border bg-foreground/10 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 md:h-5 w-24 bg-foreground/15 animate-pulse" />
                <div className="mt-1.5 h-2.5 w-16 bg-foreground/10 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-3 md:pt-4">
              <div className="flex justify-between items-center gap-2">
                <div className="h-2.5 w-14 bg-foreground/10 animate-pulse" />
                <div className="h-3 w-24 bg-foreground/15 animate-pulse" />
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="h-2.5 w-12 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.1s" }} />
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 border border-border bg-foreground/10 animate-pulse" />
                  <div className="w-5 h-3.5 bg-foreground/15 animate-pulse" />
                  <div className="w-7 h-7 border border-border bg-foreground/10 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="h-2.5 w-16 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="h-3 w-20 bg-foreground/15 animate-pulse" />
              </div>
            </div>
            <div className="border-t border-border mt-3 md:mt-4 pt-3 md:pt-4 flex items-baseline justify-between gap-2">
              <div className="h-2.5 w-12 bg-foreground/10 animate-pulse" />
              <div className="h-7 md:h-9 w-28 bg-accent/25 animate-pulse" />
            </div>
            <div className="w-full mt-4 h-12 bg-accent/30 animate-pulse" />
            <div className="mt-3 mx-auto h-2.5 w-28 bg-foreground/10 animate-pulse" />
          </aside>
        </div>
      </section>
    </main>
  )
}
