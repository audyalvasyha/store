/**
 * Skeleton halaman /games (segment loading Next.js).
 * Muncul instan saat navigasi RSC — layout brutalist mirip halaman aslinya.
 */
export default function GamesLoading() {
  return (
    <main className="relative min-h-screen">
      <div className="px-4 md:px-8 lg:px-12 pt-8 md:pt-20 pb-6 md:pb-10 max-w-[1400px] mx-auto w-full">
        <div className="h-3 w-40 bg-foreground/10 animate-pulse" />
        <div className="h-[13vw] max-h-28 w-[min(60%,560px)] mt-3 bg-foreground/10 animate-pulse" />
        <div className="h-10 w-full max-w-md mt-6 md:mt-10 bg-card border border-border animate-pulse" />
      </div>
      <div className="px-4 md:px-8 lg:px-12 pb-8 md:pb-24 max-w-[1400px] mx-auto w-full">
        <div className="border border-border divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 md:gap-4 px-2 md:px-4 py-3">
              <div className={`shrink-0 bg-foreground/10 animate-pulse ${i % 3 === 0 ? "w-14" : i % 3 === 1 ? "w-24" : "w-16"}`} />
              <div className="shrink-0 w-10 aspect-[3/4] md:w-16 bg-foreground/10 animate-pulse" />
              <div className="hidden md:flex-1 bg-foreground/5 h-4 animate-pulse" />
              <div className="ml-auto w-20 h-6 bg-foreground/10 animate-pulse" />
              <div className="w-16 h-8 bg-foreground/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
