/**
 * Skeleton halaman /games (segment loading Next.js).
 * Mirror layout halaman asli: header nav, kicker + judul besar,
 * grid kartu game, dan info strip bawah — biar transipsi ke konten mulus.
 */
export default function GamesLoading() {
  return (
    <main className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      {/* Header nav */}
      <header className="px-4 md:px-8 lg:px-12 py-3 md:py-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-accent opacity-60" />
          </div>
          <div className="h-3 w-24 bg-foreground/10 animate-pulse" />
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:block h-8 w-48 bg-card border border-border animate-pulse" />
          <div className="hidden md:block h-3 w-12 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.15s" }} />
          <div className="h-3 w-14 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.25s" }} />
        </div>
      </header>

      {/* Section katalog */}
      <section className="relative px-4 md:px-8 lg:px-12 pt-5 md:pt-10 pb-6 md:pb-14 overflow-hidden">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="h-7 w-16 border border-border bg-foreground/[0.06] animate-pulse" />
        </div>
        {/* Header katalog */}
        <div className="max-w-[1400px] mx-auto mb-4 md:mb-10">
          <div className="h-3 w-64 bg-accent/30 animate-pulse" />
          <div className="mt-2 md:mt-3 h-[13vw] max-h-24 lg:max-h-32 w-[min(70%,640px)] bg-foreground/10 animate-pulse" />
          <div className="mt-2 md:mt-4 h-3 w-full max-w-md bg-foreground/10 animate-pulse" />
          <div className="mt-1.5 h-3 w-64 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.2s" }} />
        </div>

        {/* Grid kartu game (mirror grid asli 2/3/4 kolom) */}
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden aspect-[3/4] border border-border bg-foreground/[0.06] animate-pulse"
              style={{ animationDelay: `${(i % 4) * 0.12}s` }}
            >
              {/* gradient overlay biar kayak kartu asli */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {/* badge kategori kiri */}
              <div className="absolute top-2 md:top-3 left-2 md:left-3 h-3 w-14 bg-foreground/20" />
              {/* badge jumlah item kanan */}
              <div className="absolute top-2 md:top-3 right-2 md:right-3 h-3 w-10 bg-foreground/20" style={{ animationDelay: "0.3s" }} />
              {/* inisial tengah */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 md:h-10 w-10 md:w-16 bg-foreground/10" />
              </div>
              {/* label publisher bawah */}
              <div className="hidden md:block absolute bottom-2 left-3 right-3 h-3 bg-foreground/20" />
              {/* garis aksen bawah */}
              <div className="absolute bottom-0 left-0 w-1/3 h-[3px] bg-accent/70" />
            </div>
          ))}
        </div>

        {/* Tombol lihat lainnya */}
        <div className="max-w-[1400px] mx-auto mt-6 md:mt-10 flex flex-col items-center gap-2">
          <div className="h-11 md:h-12 w-56 bg-foreground/10 animate-pulse" />
          <div className="h-2.5 w-40 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>

        {/* Info strip bawah */}
        <div className="max-w-[1400px] mx-auto mt-6 md:mt-12 border-y border-border py-2 md:py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="h-2.5 w-72 bg-foreground/10 animate-pulse" />
          <div className="h-2.5 w-44 bg-foreground/10 animate-pulse" style={{ animationDelay: "0.2s" }} />
        </div>
      </section>
    </main>
  )
}
