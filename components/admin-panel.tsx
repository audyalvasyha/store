"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PAYMENT_METHODS, GAMES, formatIDR, type GameItem, type Denomination } from "@/lib/catalog"
import type { HeroEvent, TopUpJugaConfig } from "@/lib/content"
import { AdminStatsView } from "@/components/admin-stats"
import { AdminEventCarousel } from "@/components/admin-event-carousel"
import { AdminCashback } from "@/components/admin-cashback"
import type { AdminStats } from "@/lib/analytics"
import type { EventSlide } from "@/lib/event-carousel"
import type { CashbackOrder } from "@/lib/orders"

type Tab = "stats" | "hero" | "events" | "cashback" | "games" | "topupjuga"

const EMPTY_GAME: GameItem = {
  slug: "",
  short: "",
  name: "",
  publisher: "",
  category: "",
  currency: "",
  glyph: "?",
  hue: "0 100% 45%",
  needsServer: false,
  featured: false,
  denominations: [{ id: "new-1", label: "Item baru", price: 10000 }],
}

// ── Helper UI buat tab "Top Up Juga": chip urutan bernomor + pencari game biar nggak ngescroll dropdown 157 pilihan ──

function TjChips({
  list,
  gamesBySlug,
  onMove,
  onRemove,
}: {
  list: string[]
  gamesBySlug: Map<string, GameItem>
  onMove: (slug: string, dir: -1 | 1) => void
  onRemove: (slug: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((slug, idx) => {
        const g = gamesBySlug.get(slug)
        return (
          <span
            key={slug}
            className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] text-foreground uppercase"
          >
            <span className="text-accent font-bold">{idx + 1}.</span>
            {g?.short ?? slug}
            <button
              onClick={() => onMove(slug, -1)}
              disabled={idx === 0}
              className="inline-flex h-10 w-10 items-center justify-center text-sm text-foreground/40 hover:text-accent disabled:opacity-25"
              aria-label={`Geser ${slug} ke kiri`}
            >
              &larr;
            </button>
            <button
              onClick={() => onMove(slug, 1)}
              disabled={idx === list.length - 1}
              className="inline-flex h-10 w-10 items-center justify-center text-sm text-foreground/40 hover:text-accent disabled:opacity-25"
              aria-label={`Geser ${slug} ke kanan`}
            >
              &rarr;
            </button>
            <button
              onClick={() => onRemove(slug)}
              className="inline-flex h-10 w-10 items-center justify-center text-sm text-foreground/40 hover:text-destructive"
              aria-label={`Hapus ${slug}`}
            >
              &times;
            </button>
          </span>
        )
      })}
      {list.length === 0 && (
        <span className="font-mono text-[10px] text-foreground/30">(kosong — urutan otomatis)</span>
      )}
    </div>
  )
}

function TjPicker({
  games,
  exclude,
  query,
  setQuery,
  onPick,
  placeholder,
}: {
  games: GameItem[]
  exclude: string[]
  query: string
  setQuery: (q: string) => void
  onPick: (slug: string) => void
  placeholder: string
}) {
  const q = query.trim().toLowerCase()
  const matches = q
    ? games
        .filter((g) => !exclude.includes(g.slug))
        .filter(
          (g) =>
            g.short.toLowerCase().includes(q) || g.slug.includes(q) || g.name.toLowerCase().includes(q)
        )
        .slice(0, 8)
    : []
  return (
    <div className="flex flex-col gap-2 max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] w-full bg-background border border-border p-3 font-mono text-[11px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent md:text-xs"
      />
      {matches.length > 0 && (
        <div className="border border-border bg-background flex flex-col max-h-60 overflow-y-auto">
          {matches.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => {
                onPick(g.slug)
                setQuery("")
              }}
              className="flex min-h-[44px] justify-between gap-3 border-b border-border px-3 py-2 text-left font-mono text-[11px] text-foreground hover:bg-foreground/10 last:border-b-0 md:text-xs"
            >
              <span className="text-accent">+ {g.short}</span>
              <span className="text-foreground/40">{g.slug}</span>
            </button>
          ))}
        </div>
      )}
      {q && matches.length === 0 && (
        <span className="font-mono text-[10px] text-foreground/30">
          Gak ketemu game "{query}" (atau udah masuk list).
        </span>
      )}
    </div>
  )
}

export function AdminPanel({
  email,
  hero,
  eventSlides,
  games,
  topUpJuga,
  stats,
  cashbackOrders,
}: {
  email: string
  hero: HeroEvent | null
  eventSlides: EventSlide[]
  games: GameItem[]
  topUpJuga: TopUpJugaConfig | null
  stats: AdminStats | null
  cashbackOrders: CashbackOrder[]
}) {
  const router = useRouter()
  const gameEditorRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>("stats")
  const unpaidCashback = cashbackOrders.filter((order) => !order.cashbackPaidAt).length

  // ── Hero event state ──
  const [imageUrl, setImageUrl] = useState(hero?.imageUrl ?? "")
  const [label, setLabel] = useState(hero?.label ?? "")
  const [note, setNote] = useState(hero?.note ?? "")
  const [hrefEvent, setHrefEvent] = useState(hero?.href ?? "")
  const [heroMsg, setHeroMsg] = useState<string | null>(null)
  const [heroBusy, setHeroBusy] = useState(false)
  const [heroPreview, setHeroPreview] = useState(hero?.imageUrl ?? "")

  // ── Games state ──
  const [gameJson, setGameJson] = useState(JSON.stringify(EMPTY_GAME, null, 2))
  const [gamesMsg, setGamesMsg] = useState<string | null>(null)
  const [gamesBusy, setGamesBusy] = useState(false)

  // ── Top Up Juga state ──
  const [tjGlobal, setTjGlobal] = useState<string[]>(topUpJuga?.global ?? [])
  const [tjPer, setTjPer] = useState<Record<string, string[]>>(topUpJuga?.perGame ?? {})
  const [tjSel, setTjSel] = useState<string>("")
  const [tjMsg, setTjMsg] = useState<string | null>(null)
  const [tjBusy, setTjBusy] = useState(false)
  const [tjQuery, setTjQuery] = useState("")
  const [tjPerQuery, setTjPerQuery] = useState("")

  function tjMove(setter: (list: string[]) => void, list: string[], slug: string, dir: -1 | 1) {
    const i = list.indexOf(slug)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setter(next)
  }

  function tjAdd(setter: (list: string[]) => void, list: string[], slug: string) {
    if (!slug || list.includes(slug)) return
    setter([...list, slug])
  }

  function tjRemove(setter: (list: string[]) => void, list: string[], slug: string) {
    setter(list.filter((s) => s !== slug))
  }

  async function saveTopUpJuga(clear = false) {
    setTjBusy(true)
    setTjMsg(null)
    try {
      const res = await fetch("/api/admin/topup-juga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { clear: true }
            : {
                global: tjGlobal,
                // Override kosong dibuang — artinya "ikuti global".
                perGame: Object.fromEntries(
                  Object.entries(tjPer).filter(([, list]) => list.length > 0)
                ),
              }
        ),
      })
      const data = await res.json()
      setTjMsg(
        res.ok
          ? clear
            ? "Di-reset — urutan otomatis (kategori + featured) dipakai lagi."
            : "Konfigurasi Top Up Juga tersimpan!"
          : data.error ?? "Gagal"
      )
      if (res.ok) router.refresh()
    } catch {
      setTjMsg("Koneksi bermasalah")
    }
    setTjBusy(false)
  }

  const tjGamesBySlug = new Map(games.map((g) => [g.slug, g] as const))
  const tjPerCount = Object.values(tjPer).filter((l) => l.length > 0).length

  async function saveHero(clear = false) {
    setHeroBusy(true)
    setHeroMsg(null)
    try {
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { clear: true }
            : { imageUrl: imageUrl.trim(), label, note, href: hrefEvent }
        ),
      })
      const data = await res.json()
      setHeroMsg(res.ok ? (clear ? "Hero event dinonaktifkan." : "Hero event tersimpan!") : data.error ?? "Gagal")
      if (res.ok) {
        router.refresh()
      }
    } catch {
      setHeroMsg("Koneksi bermasalah")
    }
    setHeroBusy(false)
  }

  async function saveGame() {
    setGamesBusy(true)
    setGamesMsg(null)
    try {
      let parsed: unknown
      try {
        parsed = JSON.parse(gameJson)
      } catch {
        setGamesMsg("JSON-nya nggak valid, cek formatnya")
        setGamesBusy(false)
        return
      }
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: parsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGamesMsg(data.error ?? "Gagal menyimpan game")
      } else {
        setGamesMsg("Game tersimpan!")
        router.refresh()
      }
    } catch {
      setGamesMsg("Koneksi bermasalah")
    }
    setGamesBusy(false)
  }

  function editGame(game: GameItem) {
    setGameJson(JSON.stringify(game, null, 2))
    // Di HP, daftar game bisa panjang — langsung bawa user ke editor.
    requestAnimationFrame(() => {
      gameEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  async function deleteGameBySlug(slug: string) {
    setGamesBusy(true)
    setGamesMsg(null)
    try {
      const res = await fetch(`/api/admin/games?slug=${encodeURIComponent(slug)}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setGamesMsg(data.error ?? "Gagal hapus game")
      } else {
        setGamesMsg(`Game ${slug} dihapus.`)
        router.refresh()
      }
    } catch {
      setGamesMsg("Koneksi bermasalah")
    }
    setGamesBusy(false)
  }

  async function doLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="font-mono text-[10px] text-accent tracking-[0.3em] uppercase block">
            [Gastros Admin]
          </span>
          <h1 className="font-sans text-3xl md:text-5xl text-foreground tracking-tighter uppercase leading-none">
            Maintenance
          </h1>
          <span className="font-mono text-[10px] text-foreground/40">{email}</span>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap lg:items-center">
          <button
            onClick={() => setTab("stats")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "stats" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Statistik
          </button>
          <button
            onClick={() => setTab("hero")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "hero" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Hero Event
          </button>
          <button
            onClick={() => setTab("events")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "events" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Event Carousel
          </button>
          <button
            onClick={() => setTab("cashback")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "cashback" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Cashback{unpaidCashback > 0 ? ` (${unpaidCashback})` : ""}
          </button>
          <button
            onClick={() => setTab("games")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "games" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Katalog Games ({games.length})
          </button>
          <button
            onClick={() => setTab("topupjuga")}
            className={`min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] md:text-[10px] md:tracking-[0.15em] ${tab === "topupjuga" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Top Up Juga
          </button>
          <button
            onClick={doLogout}
            className="col-span-2 min-h-[44px] border border-border px-3 py-2.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-foreground/50 hover:text-destructive sm:col-span-1 md:text-[10px] md:tracking-[0.15em]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* STATISTIK TAB — dashboard ringkas dari data order asli */}
      {tab === "stats" && <AdminStatsView stats={stats} />}

      {/* HERO TAB */}
      {tab === "hero" && (
        <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-3">
          <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
            Background Hero (Event)
          </span>
          <p className="font-mono text-[10px] text-foreground/50 leading-relaxed">
            Masukin URL gambar event (https), beri label & catatan. Kosongin/di-nonaktifkan = hero balik ke gradient standar. Landing page membaca dari DB live.
          </p>
          <input
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value)
              setHeroPreview(e.target.value)
            }}
            placeholder="https://.../gambar-event.webp"
            className="bg-background border border-border p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent"
          />
          {heroPreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={heroPreview}
              alt="Preview hero event"
              className="w-full max-h-56 object-cover border border-border"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label event, cth: EVENT HOTSPOT"
              className="bg-background border border-border p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan event, cth: Diskon semua game"
              className="bg-background border border-border p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent"
            />
            <input
              value={hrefEvent}
              onChange={(e) => setHrefEvent(e.target.value)}
              placeholder="Link cth: /top-up/mobile-legends"
              className="bg-background border border-border p-3 font-mono text-xs md:text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-accent"
            />
          </div>
          {heroMsg && <span className="font-mono text-[10px] text-accent">{heroMsg}</span>}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={() => saveHero(false)}
              disabled={heroBusy || !imageUrl.startsWith("https://")}
              className={`min-h-[44px] w-full px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] sm:w-auto ${heroBusy || !imageUrl.startsWith("https://") ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {heroBusy ? "Menyimpan..." : "Simpan & Aktifkan"}
            </button>
            <button
              onClick={() => saveHero(true)}
              disabled={heroBusy}
              className="min-h-[44px] w-full border border-border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-destructive sm:w-auto"
            >
              Nonaktifkan
            </button>
          </div>
        </div>
      )}

      {/* EVENT CAROUSEL TAB */}
      {tab === "events" && <AdminEventCarousel initialSlides={eventSlides} />}

      {/* CASHBACK TAB */}
      {tab === "cashback" && <AdminCashback initialOrders={cashbackOrders} />}

      {/* GAMES TAB */}
      {tab === "games" && (
        <div className="flex flex-col gap-4 md:gap-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="border border-border bg-card p-4 md:p-6">
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-3">
              Game yang Dilihat User ({games.length})
            </span>
            <div className="flex flex-col gap-2">
              {games.map((game) => (
                <div
                  key={game.slug}
                  className="flex flex-col gap-2 border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-xs text-foreground">
                      {game.slug}
                      {game.featured && <span className="ml-2 uppercase text-accent">featured</span>}
                    </span>
                    <span className="block truncate font-mono text-[9px] text-foreground/40">
                      {game.short} &mdash; {game.name} &mdash; {game.denominations.length} nominal
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0 sm:items-center">
                    <button
                      onClick={() => editGame(game)}
                      className="min-h-[40px] border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/60 hover:border-accent hover:text-accent"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGameBySlug(game.slug)}
                      disabled={gamesBusy}
                      className="min-h-[40px] border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/60 hover:text-destructive"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            ref={gameEditorRef}
            className="scroll-mt-4 border border-border bg-card p-4 md:p-6 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
                Editor Game (JSON)
              </span>
              <button
                onClick={() => setGameJson(JSON.stringify(EMPTY_GAME, null, 2))}
                className="inline-flex min-h-[40px] items-center font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40 hover:text-accent"
              >
                + Game baru
              </button>
            </div>
            <textarea
              value={gameJson}
              onChange={(e) => setGameJson(e.target.value)}
              spellCheck={false}
              rows={16}
              className="w-full bg-background border border-border p-3 font-mono text-[11px] text-foreground leading-relaxed focus:outline-none focus:border-accent"
            />
            <p className="font-mono text-[9px] text-foreground/40 leading-relaxed">
              Slug cuma a-z/0-9/-, name harus diisi, minimal 1 denominasi {`{id, label, price}`}. `hue` buat warna tile (cth {"\""}258 85% 55%{"\""}), `image`/`stoneSlug` optional.
            </p>
            {gamesMsg && <span className="font-mono text-[10px] text-accent">{gamesMsg}</span>}
            <button
              onClick={saveGame}
              disabled={gamesBusy}
              className={`min-h-[44px] w-full px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em] sm:w-auto ${gamesBusy ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {gamesBusy ? "Menyimpan..." : "Simpan Game"}
            </button>
          </div>
        </div>
      )}

      {/* TOP UP JUGA TAB — alur 3 langkah: cari game → susun urutan → simpan */}
      {tab === "topupjuga" && (
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-3">
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
              Blok [Top Up Juga] — game & urutan di bawah tiap halaman top up
            </span>
            <ol className="font-mono text-[10px] text-foreground/60 leading-relaxed space-y-1 list-decimal list-inside">
              <li>Cari game di kotak di bawah, klik hasilnya → otomatis masuk urutan.</li>
              <li>Atur posisi pakai ← → (angka = posisinya, kiri muncul duluan). × buat keluarin.</li>
              <li>Klik Simpan. Mau balik ke otomatis? Kosongin semua terus Simpan, atau pakai tombol Reset.</li>
            </ol>

            <TjPicker
              games={games}
              exclude={tjGlobal}
              query={tjQuery}
              setQuery={setTjQuery}
              onPick={(slug) => tjAdd(setTjGlobal, tjGlobal, slug)}
              placeholder="Cari game… ketik 'mlbb', 'free fire', 'genshin'…"
            />

            <TjChips
              list={tjGlobal}
              gamesBySlug={tjGamesBySlug}
              onMove={(slug, dir) => tjMove(setTjGlobal, tjGlobal, slug, dir)}
              onRemove={(slug) => tjRemove(setTjGlobal, tjGlobal, slug)}
            />
          </div>

          <details className="border border-border bg-card p-4 md:p-6">
            <summary className="flex min-h-[44px] cursor-pointer select-none items-center font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60 hover:text-foreground md:text-xs">
              ⚙️ Lanjutan: urutan beda per halaman game{tjPerCount > 0 ? ` (${tjPerCount} aktif)` : " — nggak perlu, skip aja"}
            </summary>
            <div className="flex flex-col gap-3 mt-4">
              <p className="font-mono text-[10px] text-foreground/50 leading-relaxed">
                Cuma dipakai kalau satu game harus menampilkan blok yang beda dari game lain. Pilih halaman game di bawah, lalu susun list-nya — override ini menang atas urutan global di atas.
              </p>
              <select
                value={tjSel}
                onChange={(e) => setTjSel(e.target.value)}
                className="min-h-[44px] w-full max-w-none bg-background border border-border p-2.5 font-mono text-[11px] text-foreground focus:outline-none focus:border-accent sm:max-w-xs md:text-xs"
              >
                <option value="">— pilih halaman game —</option>
                {games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.short} — {g.slug}
                    {tjPer[g.slug]?.length ? " (override aktif)" : ""}
                  </option>
                ))}
              </select>
              {tjSel && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="min-w-0 truncate font-mono text-[10px] uppercase text-foreground/60">
                      Override: {tjSel}
                    </span>
                    <button
                      onClick={() => {
                        const next = { ...tjPer }
                        delete next[tjSel]
                        setTjPer(next)
                      }}
                      className="inline-flex min-h-[40px] items-center font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40 hover:text-destructive"
                    >
                      Hapus override (ikut global)
                    </button>
                  </div>

                  <TjPicker
                    games={games}
                    exclude={[tjSel, ...(tjPer[tjSel] ?? [])]}
                    query={tjPerQuery}
                    setQuery={setTjPerQuery}
                    onPick={(slug) =>
                      tjAdd((l) => setTjPer({ ...tjPer, [tjSel]: l }), tjPer[tjSel] ?? [], slug)
                    }
                    placeholder="Cari game untuk override ini…"
                  />

                  <TjChips
                    list={tjPer[tjSel] ?? []}
                    gamesBySlug={tjGamesBySlug}
                    onMove={(slug, dir) =>
                      tjMove((l) => setTjPer({ ...tjPer, [tjSel]: l }), tjPer[tjSel] ?? [], slug, dir)
                    }
                    onRemove={(slug) =>
                      tjRemove((l) => setTjPer({ ...tjPer, [tjSel]: l }), tjPer[tjSel] ?? [], slug)
                    }
                  />
                </div>
              )}
            </div>
          </details>

          {tjMsg && <span className="font-mono text-[10px] text-accent">{tjMsg}</span>}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={() => saveTopUpJuga(false)}
              disabled={tjBusy}
              className={`min-h-[44px] w-full px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] sm:w-auto ${tjBusy ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {tjBusy ? "Menyimpan..." : "Simpan Konfigurasi"}
            </button>
            <button
              onClick={() => saveTopUpJuga(true)}
              disabled={tjBusy}
              className="min-h-[44px] w-full border border-border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-destructive sm:w-auto"
            >
              Reset ke Otomatis
            </button>
          </div>
        </div>
      )}

      {/* Reference kecil: metode static yang masih dipakai flow non-Gamestone */}
      <div className="border border-border bg-card p-4 md:p-6">
        <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase block mb-2">
          [Info] Metode bayar legacy (non-Gamestone)
        </span>
        <p className="font-mono text-[10px] text-foreground/50">
          {PAYMENT_METHODS.map((m) => m.label).join(" / ")} &mdash; dipakai game yang belum terhubung Gamestone.
        </p>
        <p className="font-mono text-[10px] text-foreground/35 mt-1">
          Isi katalog database masih kosong → pakai katalog statis default ({GAMES.length} game), terlihat di atas.
        </p>
        <p className="font-mono text-[10px] text-foreground/35">
          Di DB ada {games.length !== GAMES.length ? `${games.length} game` : "katalog sama"} // contoh harga denominasi pertama: {formatIDR(games[0]?.denominations[0]?.price ?? (GAMES[0]?.denominations[0] as Denomination | undefined)?.price ?? 0)}
        </p>
      </div>
    </div>
  )
}
