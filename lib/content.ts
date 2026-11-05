/**
 * Konten dinamis dari MongoDB untuk halaman publi:
 * - Hero event (background image + label) — collection `site_content`.
 * - Katalog games yang bisa diedit dari /admin — collection `games`,
 *   fallback ke katalog statis `lib/catalog.ts` kalau DB kosong.
 *
 * File ini SERVER-ONLY: jangan diimpor dari komponen client.
 */
import { getDb, ensureIndexes } from "./mongodb";
import { GAMES, getGame, type GameItem } from "./catalog";

export type HeroEvent = {
  imageUrl: string;
  label?: string;
  note?: string;
  href?: string;
  updatedAt: string;
};

type HeroDoc = Omit<HeroEvent, "key"> & { key: string };

// Memoized per-process: createIndexes (idempotent) cukup sekali per
// instance, bukan di setiap request publik.
let readyPromise: Promise<void> | null = null;

async function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureIndexes().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
}

// ── Hero event ──────────────────────────────────────────────────────────────

export async function getHeroEvent(): Promise<HeroEvent | null> {
  try {
    await ready();
    const db = await getDb();
    const doc = await db.collection<HeroDoc>("site_content").findOne({ key: "hero" });
    if (!doc || !doc.imageUrl) return null;
    return {
      imageUrl: doc.imageUrl,
      label: doc.label,
      note: doc.note,
      href: doc.href,
      updatedAt: doc.updatedAt,
    };
  } catch {
    // DB down / env hilang — landing harus tetap hidup, jadi tanpa event hero.
    return null;
  }
}

export async function saveHeroEvent(input: {
  imageUrl: string;
  label?: string;
  note?: string;
  href?: string;
}): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<HeroDoc>("site_content").updateOne(
    { key: "hero" },
    {
      $set: {
        imageUrl: input.imageUrl,
        label: input.label?.trim() || undefined,
        note: input.note?.trim() || undefined,
        href: input.href?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

export async function clearHeroEvent(): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<HeroDoc>("site_content").deleteOne({ key: "hero" });
}

// ── Katalog games dinamis ───────────────────────────────────────────────────

export async function getDynamicGames(): Promise<GameItem[]> {
  try {
    await ready();
    const db = await getDb();
    const docs = await db.collection("games").find().sort({ slug: 1 }).toArray();
    if (docs.length === 0) return GAMES;
    // Merge: katalog statis sebagai dasar, dokumen DB menimpa slug yang sama.
    // Admin edit di DB tetap menang, tapi game kurasi di lib/catalog tidak ilang
    // walaupun katalog Gamestone di-sync penuh ke DB.
    const bySlug = new Map<string, GameItem>(GAMES.map((g) => [g.slug, g]));
    for (const { _id, ...game } of docs) {
      void _id;
      bySlug.set(game.slug, game as GameItem);
    }
    return [...bySlug.values()];
  } catch {
    // Fallback katalog statis — katalog Gamestone di-sync penuh ke DB (lib/catalog).
    return GAMES;
  }
}

export async function getDynamicGame(slug: string): Promise<GameItem | undefined> {
  try {
    await ready();
    const db = await getDb();
    const doc = await db.collection("games").findOne({ slug });
    if (!doc) return getGame(slug);
    const { _id, ...game } = doc;
    void _id;
    return game as GameItem;
  } catch {
    return getGame(slug);
  }
}

export async function upsertGame(game: GameItem): Promise<void> {
  await ready();
  const db = await getDb();
  await db
    .collection("games")
    .updateOne({ slug: game.slug }, { $set: game }, { upsert: true });
}

// ── Konfigurasi [Top Up Juga] — Game Lainnya ──────────────────────────────

/**
 * Urutan & pemilihan game di blok "[Top Up Juga]" pada halaman top up,
 * aturannya dari /admin:
 * - `global`  : urutan slug yang dipakai SEMUA halaman game (fallback).
 * - `perGame` : override urutan khusus per slug game — menang atas global.
 * Disimpan sebagai dokumen site_content key "topup-juga". Tanpa config,
 * blok pakai urutan otomatis (game se-kategori + featured).
 */
export type TopUpJugaConfig = {
  global: string[];
  perGame: Record<string, string[]>;
  updatedAt: string;
};

type TopUpJugaDoc = {
  key: string;
  global: string[];
  perGame?: Record<string, string[]>;
  updatedAt: string;
};

const TOPUP_JUGA_KEY = "topup-juga";

export async function getTopUpJugaConfig(): Promise<TopUpJugaConfig | null> {
  try {
    await ready();
    const db = await getDb();
    const doc = await db.collection<TopUpJugaDoc>("site_content").findOne({ key: TOPUP_JUGA_KEY });
    if (!doc) return null;
    return {
      global: Array.isArray(doc.global) ? doc.global : [],
      perGame: doc.perGame && typeof doc.perGame === "object" ? doc.perGame : {},
      updatedAt: doc.updatedAt ?? "",
    };
  } catch {
    // DB down — halaman publik jatuh ke urutan otomatis, bukan error.
    return null;
  }
}

export async function saveTopUpJuga(input: {
  global: string[];
  perGame: Record<string, string[]>;
}): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<TopUpJugaDoc>("site_content").updateOne(
    { key: TOPUP_JUGA_KEY },
    {
      $set: {
        global: input.global,
        perGame: input.perGame,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

export async function clearTopUpJuga(): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<TopUpJugaDoc>("site_content").deleteOne({ key: TOPUP_JUGA_KEY });
}

export async function deleteGame(slug: string): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection("games").deleteOne({ slug });
}
