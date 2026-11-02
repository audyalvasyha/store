/**
 * Skeleton halaman /top-up/[slug] (segment loading Next.js).
 * Muncul instan saat navigasi RSC sebelum data game/variant provider siap.
 */
export default function TopupLoading() {
  return (
    <main className="relative min-h-screen">
      <div className="px-4 md:px-8 lg:px-12 pt-5 md:pt-10 pb-6 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className="h-3 w-52 bg-foreground/10 animate-pulse" />
        <div className="h-[11vw] max-h-24 w-[min(55%,520px)] mt-3 bg-foreground/10 animate-pulse" />
      </div>
      <div className="px-4 md:px-8 lg:px-12 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 md:gap-8 items-start">
          <div className="flex flex-col gap-4">
            <fieldset className="border border-border bg-card p-4 md:p-6">
              <legend className="h-3 w-40 bg-foreground/10 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mt-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-border p-2.5 md:p-4 min-h-[64px] bg-background/60 animate-pulse" />
                ))}
              </div>
            </fieldset>
            <fieldset className="border border-border bg-card p-4 md:p-6">
              <legend className="h-3 w-36 bg-foreground/10 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mt-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-border p-2.5 md:p-4 min-h-[56px] bg-background/60 animate-pulse" />
                ))}
              </div>
            </fieldset>
          </div>
          <div className="border border-border bg-card p-4 md:p-6">
            <div className="h-3 w-24 bg-foreground/10 animate-pulse" />
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-foreground/10 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-foreground/10 animate-pulse" />
                <div className="h-3 w-16 mt-2 bg-foreground/5 animate-pulse" />
              </div>
            </div>
            <div className="h-12 mt-5 bg-foreground/10 animate-pulse" />
            <div className="h-12 mt-3 bg-foreground/10 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}
