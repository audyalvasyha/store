/**
 * Taksonomi genre katalog. Dipakai filter /games dan editor katalog admin.
 * Genre disimpan sebagai id stabil (bukan label) supaya aman kalau label UI
 * berubah.
 */
export type GenreId =
  | "action"
  | "rpg"
  | "strategy"
  | "adventure"
  | "simulation"
  | "puzzle"
  | "sports"
  | "rhythm"
  | "sandbox"
  | "horror"
  | "casual"

export type GameGenre = {
  id: GenreId
  label: string
  detail: string
}

export const GAME_GENRES: readonly GameGenre[] = [
  { id: "action", label: "Action", detail: "FPS, TPS, Fighting, Battle Royale" },
  { id: "rpg", label: "RPG", detail: "Role-Playing Game — MMORPG, Action RPG, JRPG" },
  { id: "strategy", label: "Strategy", detail: "RTS, MOBA, Turn-Based Strategy" },
  { id: "adventure", label: "Adventure", detail: "Action-Adventure, Survival Horror" },
  { id: "simulation", label: "Simulation", detail: "Life Simulator, Racing / Vehicle Simulator" },
  { id: "puzzle", label: "Puzzle & Logic", detail: "Match-3, Physics Puzzle" },
  { id: "sports", label: "Sports", detail: "Sepak bola, basket, dan lainnya" },
  { id: "rhythm", label: "Rhythm / Music", detail: "Game ketukan musik / dansa" },
  { id: "sandbox", label: "Sandbox / Open World", detail: "Eksplorasi & kreasi bebas" },
  { id: "horror", label: "Horror", detail: "Survival Horror, Psychological Horror" },
  { id: "casual", label: "Casual / Hyper-Casual", detail: "Permainan ringan untuk mengisi waktu" },
] as const

export const GAME_GENRE_IDS: readonly GenreId[] = GAME_GENRES.map((genre) => genre.id)

const GENRE_ID_SET = new Set<string>(GAME_GENRE_IDS)

export function isGenreId(value: unknown): value is GenreId {
  return typeof value === "string" && GENRE_ID_SET.has(value)
}

export function genreLabel(id: GenreId): string {
  return GAME_GENRES.find((genre) => genre.id === id)?.label ?? id
}

/**
 * Validasi genre dari DB / admin. Input bisa array id, satu id, atau data
 * lama yang belum punya genre. Hasil selalu urut sesuai urutan taksonomi.
 */
export function normalizeGenres(value: unknown): GenreId[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
  const picked = new Set<GenreId>()
  for (const item of raw) {
    if (isGenreId(item)) picked.add(item)
  }
  return GAME_GENRE_IDS.filter((id) => picked.has(id))
}

/**
 * Mapping katalog yang sudah ada. Banyak game dari Gamestone memakai
 * kategori generik "TOP UP", jadi genre tidak bisa hanya mengandalkan field
 * category. Variant region / partner ikut dipetakan ke genre yang sama.
 */
const slugGenres = new Map<string, GenreId[]>()

function tag(genre: GenreId, slugs: readonly string[]): void {
  for (const slug of slugs) {
    const current = slugGenres.get(slug) ?? []
    if (!current.includes(genre)) current.push(genre)
    slugGenres.set(slug, current)
  }
}

tag("action", [
  "free-fire",
  "free-fire-malaysia",
  "free-fire-partner",
  "ff",
  "ff-max",
  "call-of-duty-mobile",
  "call-of-duty-mobile-id",
  "call-of-duty-mobile-malaysia",
  "valorant",
  "valorant-my",
  "valorant-ph",
  "arena-breakout",
  "delta-force",
  "delta-force-garena",
  "delta-force-garena-malaysia",
  "delta-force-steam",
  "marvel-rivals",
  "metal-slug-awakening",
  "pixel-gun-3d",
  "point-blank",
  "point-blank-voucher-cash",
  "pubg-mobile",
  "pubg-mobile-lite",
  "pubg-mobile-voucher",
  "rainbow-six-mobile",
  "sausage-man",
  "battlefield-1-steam-cd-keys",
  "battlefield-4-steam-cd-keys",
  "battlefield-6-steam-cd-keys",
  "battlefield-v-steam-cd-keys",
  "dark-souls-iii-steam-cd-keys",
  "demon-slayer-kimetsu-no-yaiba-the-hinokami-chronicles-steam-cd-keys",
  "honkai-impact-3",
  "punishing-gray-raven",
  "snowbreak-containment-zone",
  "undawn",
  "lifeafter",
  "mob-rush",
])

tag("rpg", [
  "honkai-star-rail",
  "afk-journey",
  "astra-knights-of-veda",
  "cloud-song-saga-of-skywalkers",
  "crystal-of-atlan",
  "dark-souls-iii-steam-cd-keys",
  "dragon-nest-m-classic",
  "dragonheir-silent-gods",
  "dynasty-heros",
  "ghost-story-love-destiny",
  "goddess-of-victory-nikke",
  "harry-potter-magic-awakening",
  "heaven-burns-red",
  "heroic-uncle-kim",
  "honkai-impact-3",
  "legacy-fate-sacred-and-fearless",
  "legend-of-mushroom-rush",
  "light-of-thel-new-era",
  "love-and-deepspace",
  "mu-origin-2",
  "mu-origin-3-sea",
  "path-to-nowhere",
  "punishing-gray-raven",
  "ragnarok-m-eternal-love",
  "ragnarok-origin",
  "ragnarok-twilight",
  "ragnarok-x-next-generation",
  "snowbreak-containment-zone",
  "tamashi-rise-of-yokai",
  "tarisland",
  "watcher-of-realms",
])

tag("strategy", [
  "mobile-legends",
  "mobile-legends-bang-bang",
  "mobile-legends-bang-bang-my",
  "mobile-legends-bang-bang-my-partner",
  "mobile-legends-bang-bang-partner",
  "mobile-legends-bang-bang-ph",
  "league-of-legends-pc",
  "league-of-legends-pc-my",
  "league-of-legends-pc-ph",
  "league-of-legends-wild-rift",
  "league-of-legends-wild-rift-my",
  "league-of-legends-wild-rift-ph",
  "arena-of-valor",
  "honor-of-kings",
  "pokemon-unite",
  "magic-chess-go-go",
  "magic-chess-go-go-my",
  "teamfight-tactics-mobile",
  "teamfight-tactics-mobile-my",
  "teamfight-tactics-mobile-ph",
  "legends-of-runeterra",
  "legends-of-runeterra-my",
  "legends-of-runeterra-ph",
  "command-conquer-legions",
  "land-of-empires",
  "be-the-king-judge-destiny",
  "the-ants-underground-kingdom",
  "state-of-survival",
  "dragonheir-silent-gods",
  "path-to-nowhere",
  "watcher-of-realms",
])

tag("adventure", [
  "lifeafter",
  "undawn",
  "harry-potter-magic-awakening",
  "love-and-deepspace",
  "tarisland",
])

tag("simulation", [
  "ace-racer",
  "racing-master",
  "speed-drifters",
  "f1-manager-2024-steam-cd-keys",
])

tag("puzzle", ["ludo-club"])

tag("sports", [
  "ea-sports-fc-mobile",
  "ea-sports-fc-mobile-id-voucher",
  "ea-sports-fc-mobile-my",
  "ea-sports-fc-mobile-ph",
  "efootball-powered-by-google-play",
  "captain-tsubasa-ace",
  "football-dream-be-a-pro",
  "football-master-2",
  "football-rising-star",
  "haikyu-fly-high",
  "nba-infinite",
  "top-eleven",
  "total-football",
])

tag("rhythm", ["wesing"])

tag("sandbox", ["roblox", "minecraft", "growtopia"])

tag("horror", [
  "dead-by-daylight-steam-cd-keys",
  "path-to-nowhere",
  "state-of-survival",
  "lifeafter",
  "undawn",
])

tag("casual", [
  "ludo-club",
  "magic-chess-go-go",
  "magic-chess-go-go-my",
  "mob-rush",
  "super-sus",
  "tom-and-jerry-chase",
  "hago",
  "growtopia",
  "sausage-man",
])

/** Fallback untuk katalog baru yang belum punya mapping slug eksplisit. */
const GENRE_KEYWORDS: ReadonlyArray<readonly [RegExp, readonly GenreId[]]> = [
  [/\b(battle royale|fps|tps|shooter|fighting|action)\b/, ["action"]],
  [/\b(moba|rts|strategy|tactics|auto ?chess|turn[- ]based|war|empire|conquest|tower defense)\b/, ["strategy"]],
  [/\b(rpg|mmorpg|jrpg|role[- ]playing|idle rpg|action rpg)\b/, ["rpg"]],
  [/\b(survival|open world|adventure)\b/, ["adventure"]],
  [/\b(racing|racer|drift|simulator|simulation)\b/, ["simulation"]],
  [/\b(puzzle|match[- ]?3|physics puzzle)\b/, ["puzzle"]],
  [/\b(sports?|football|soccer|basket|nba|volleyball|baseball|tennis|golf)\b/, ["sports"]],
  [/\b(rhythm|music|karaoke|dance|beat)\b/, ["rhythm"]],
  [/\b(sandbox|craft|building|roblox|minecraft)\b/, ["sandbox"]],
  [/\b(horror|zombie|ghost|dead by)\b/, ["horror"]],
  [/\b(casual|hyper[- ]?casual|party|board)\b/, ["casual"]],
]

/**
 * Genre final untuk satu game:
 * 1. genre eksplisit dari admin/DB,
 * 2. mapping slug katalog,
 * 3. tebakan dari category/nama untuk game baru.
 * Game non-game (voucher streaming, saldo, dll.) sengaja tidak dipaksa
 * masuk genre supaya filter tetap relevan.
 */
export function resolveGameGenres(game: {
  slug: string
  name?: string
  category?: string
  genres?: unknown
}): GenreId[] {
  const explicit = normalizeGenres(game.genres)
  if (explicit.length > 0) return explicit

  const mapped = slugGenres.get(game.slug)
  if (mapped?.length) return normalizeGenres(mapped)

  const text = `${game.name ?? ""} ${game.category ?? ""}`.toLowerCase()
  if (!text.trim()) return []

  const found = new Set<GenreId>()
  for (const [pattern, genres] of GENRE_KEYWORDS) {
    if (!pattern.test(text)) continue
    for (const genre of genres) found.add(genre)
  }
  return GAME_GENRE_IDS.filter((id) => found.has(id))
}
