"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PAYMENT_METHODS, GAMES, formatIDR, type GameItem, type Denomination } from "@/lib/catalog"
import type { HeroEvent, TopUpJugaConfig } from "@/lib/content"

type Tab = "hero" | "games" | "topupjuga"

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

export function AdminPanel({
  email,
  hero,
  games,
  topUpJuga,
}: {
  email: string
  hero: HeroEvent | null
  games: GameItem[]
  topUpJuga: TopUpJugaConfig | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("hero")

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="font-mono text-[10px] text-accent tracking-[0.3em] uppercase block">
            [Gastros Admin]
          </span>
          <h1 className="font-sans text-3xl md:text-5xl text-foreground tracking-tighter uppercase leading-none">
            Maintenance
          </h1>
          <span className="font-mono text-[10px] text-foreground/40">{email}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("hero")}
            className={`font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-border min-h-[40px] ${tab === "hero" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Hero Event
          </button>
          <button
            onClick={() => setTab("games")}
            className={`font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-border min-h-[40px] ${tab === "games" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Katalog Games ({games.length})
          </button>
          <button
            onClick={() => setTab("topupjuga")}
            className={`font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-border min-h-[40px] ${tab === "topupjuga" ? "text-accent border-accent" : "text-foreground/50 hover:text-foreground"}`}
          >
            Top Up Juga
          </button>
          <button
            onClick={doLogout}
            className="font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border border-border text-foreground/50 hover:text-destructive min-h-[40px]"
          >
            Logout
          </button>
        </div>
      </div>

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
          <div className="flex gap-2">
            <button
              onClick={() => saveHero(false)}
              disabled={heroBusy || !imageUrl.startsWith("https://")}
              className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] ${heroBusy || !imageUrl.startsWith("https://") ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {heroBusy ? "Menyimpan..." : "Simpan & Aktifkan"}
            </button>
            <button
              onClick={() => saveHero(true)}
              disabled={heroBusy}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] border border-border text-foreground/50 hover:text-destructive"
            >
              Nonaktifkan
            </button>
          </div>
        </div>
      )}

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
                  className="flex items-center justify-between gap-2 border border-border bg-background p-2.5"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-foreground block truncate">
                      {game.slug}
                      {game.featured && <span className="text-accent ml-2 uppercase">featured</span>}
                    </span>
                    <span className="font-mono text-[9px] text-foreground/40 block truncate">
                      {game.short} &mdash; {game.name} &mdash; {game.denominations.length} nominal
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setGameJson(JSON.stringify(game, null, 2))}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] px-2.5 py-1.5 border border-border text-foreground/60 hover:text-accent hover:border-accent"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGameBySlug(game.slug)}
                      disabled={gamesBusy}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] px-2.5 py-1.5 border border-border text-foreground/60 hover:text-destructive"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
                Editor Game (JSON)
              </span>
              <button
                onClick={() => setGameJson(JSON.stringify(EMPTY_GAME, null, 2))}
                className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40 hover:text-accent"
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
              className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3.5 min-h-[44px] ${gamesBusy ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {gamesBusy ? "Menyimpan..." : "Simpan Game"}
            </button>
          </div>
        </div>
      )}

      {/* TOP UP JUGA TAB — urutan & pemilihan game blok "[Top Up Juga]" */}
      {tab === "topupjuga" && (
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-3">
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
              Urutan Global (semua halaman game)
            </span>
            <p className="font-mono text-[10px] text-foreground/50 leading-relaxed">
              Game yang muncul di blok [Top Up Juga] tiap halaman top up + urutannya (kiri ke kanan). maksimal 20. Kosongin lalu simpan = urutan otomatis (game se-kategori + featured).
            </p>
            <div className="flex flex-wrap gap-2">
              {(tjGlobal.length > 0 ? tjGlobal : []).map((slug) => {
                const g = tjGamesBySlug.get(slug)
                return (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] text-foreground uppercase"
                  >
                    {g?.short ?? slug}
                    <button
                      onClick={() => tjMove(setTjGlobal, tjGlobal, slug, -1)}
                      disabled={tjGlobal.indexOf(slug) === 0}
                      className="text-foreground/40 hover:text-accent disabled:opacity-25"
                      aria-label={`Geser ${slug} ke kiri`}
                    >
                      &larr;
                    </button>
                    <button
                      onClick={() => tjMove(setTjGlobal, tjGlobal, slug, 1)}
                      disabled={tjGlobal.indexOf(slug) === tjGlobal.length - 1}
                      className="text-foreground/40 hover:text-accent disabled:opacity-25"
                      aria-label={`Geser ${slug} ke kanan`}
                    >
                      &rarr;
                    </button>
                    <button
                      onClick={() => tjRemove(setTjGlobal, tjGlobal, slug)}
                      className="text-foreground/40 hover:text-destructive"
                      aria-label={`Hapus ${slug}`}
                    >
                      &times;
                    </button>
                  </span>
                )
              })}
              {tjGlobal.length === 0 && (
                <span className="font-mono text-[10px] text-foreground/30">(kosong — urutan otomatis)</span>
              )}
            </div>
            <select
              value=""
              onChange={(e) => tjAdd(setTjGlobal, tjGlobal, e.target.value)}
              className="bg-background border border-border p-2.5 font-mono text-[10px] md:text-xs text-foreground focus:outline-none focus:border-accent max-w-xs"
            >
              <option value="">+ Tambah game ke urutan global…</option>
              {games
                .filter((g) => !tjGlobal.includes(g.slug))
                .map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.short} — {g.slug}
                  </option>
                ))}
            </select>
          </div>

          <div className="border border-border bg-card p-4 md:p-6 flex flex-col gap-3">
            <span className="font-mono text-[10px] md:text-xs text-accent tracking-[0.25em] uppercase">
              Override Per Halaman Game (opsional)
            </span>
            <p className="font-mono text-[10px] text-foreground/50 leading-relaxed">
              Mau urutan beda di game tertentu? Pilih game, susun list-nya — override ini menang atas urutan global.
            </p>
            <select
              value={tjSel}
              onChange={(e) => setTjSel(e.target.value)}
              className="bg-background border border-border p-2.5 font-mono text-[10px] md:text-xs text-foreground focus:outline-none focus:border-accent max-w-xs"
            >
              <option value="">— pilih halaman game —</option>
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.short} — {g.slug}{tjPer[g.slug]?.length ? " (override aktif)" : ""}
                </option>
              ))}
            </select>
            {tjSel && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-foreground/60 uppercase">
                    Override: {tjSel}
                  </span>
                  <button
                    onClick={() => {
                      const next = { ...tjPer }
                      delete next[tjSel]
                      setTjPer(next)
                    }}
                    className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40 hover:text-destructive"
                  >
                    Hapus override (ikut global)
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(tjPer[tjSel] ?? []).map((slug) => {
                    const g = tjGamesBySlug.get(slug)
                    const list = tjPer[tjSel] ?? []
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-2 border border-accent/40 bg-background px-2.5 py-1.5 font-mono text-[10px] text-foreground uppercase"
                      >
                        {g?.short ?? slug}
                        <button
                          onClick={() => tjMove((l) => setTjPer({ ...tjPer, [tjSel]: l }), list, slug, -1)}
                          disabled={list.indexOf(slug) === 0}
                          className="text-foreground/40 hover:text-accent disabled:opacity-25"
                          aria-label={`Geser ${slug} ke kiri`}
                        >
                          &larr;
                        </button>
                        <button
                          onClick={() => tjMove((l) => setTjPer({ ...tjPer, [tjSel]: l }), list, slug, 1)}
                          disabled={list.indexOf(slug) === list.length - 1}
                          className="text-foreground/40 hover:text-accent disabled:opacity-25"
                          aria-label={`Geser ${slug} ke kanan`}
                        >
                          &rarr;
                        </button>
                        <button
                          onClick={() => tjRemove((l) => setTjPer({ ...tjPer, [tjSel]: l }), list, slug)}
                          className="text-foreground/40 hover:text-destructive"
                          aria-label={`Hapus ${slug}`}
                        >
                          &times;
                        </button>
                      </span>
                    )
                  })}
                  {(tjPer[tjSel] ?? []).length === 0 && (
                    <span className="font-mono text-[10px] text-foreground/30">(ikuti urutan global)</span>
                  )}
                </div>
                <select
                  value=""
                  onChange={(e) => tjAdd((l) => setTjPer({ ...tjPer, [tjSel]: l }), tjPer[tjSel] ?? [], e.target.value)}
                  className="bg-background border border-border p-2.5 font-mono text-[10px] md:text-xs text-foreground focus:outline-none focus:border-accent max-w-xs"
                >
                  <option value="">+ Tambah game ke override ini…</option>
                  {games
                    .filter((g) => g.slug !== tjSel && !(tjPer[tjSel] ?? []).includes(g.slug))
                    .map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.short} — {g.slug}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {tjMsg && <span className="font-mono text-[10px] text-accent">{tjMsg}</span>}
          <div className="flex gap-2">
            <button
              onClick={() => saveTopUpJuga(false)}
              disabled={tjBusy}
              className={`font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] ${tjBusy ? "bg-foreground/10 text-foreground/30 cursor-not-allowed" : "bg-accent text-accent-foreground hover-glitch"}`}
            >
              {tjBusy ? "Menyimpan..." : "Simpan Konfigurasi"}
            </button>
            <button
              onClick={() => saveTopUpJuga(true)}
              disabled={tjBusy}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 min-h-[44px] border border-border text-foreground/50 hover:text-destructive"
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
