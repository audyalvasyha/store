/**
 * Konten dinamis dari MongoDB untuk halaman publi:
 * - Hero event (background image + label) — collection `site_content`.
 * - Katalog games yang bisa diedit dari /admin — collection `games`,
 *   fallback ke katalog statis `lib/catalog.ts` kalau DB kosong.
 *
 * File ini SERVER-ONLY: jangan diimpor dari komponen client.
 */
import { cache } from "react";
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

// ── Cache katalog antar-request ─────────────────────────────────────────────
// Katalog `games` & konfigurasi "Top Up Juga" cuma berubah lewat /admin, jadi
// hasil query-nya disimpan sebentar di memori proses. Tanpa ini setiap render
// /top-up/[slug] menembak MongoDB ~1 detik hanya untuk blok "Top Up Juga".
const CATALOG_TTL_MS = 60_000;
// Kalau DB error dan belum ada data lama, cache fallback cuma sebentar supaya
// DB yang sedang down nggak dihantam di setiap request.
const FALLBACK_TTL_MS = 10_000;

type ContentCacheGlobal = {
  _gasCatalogCache_?: { value: GameItem[]; expiresAt: number };
  _gasCatalogInflight_?: Promise<GameItem[]>;
  _gasTopUpJugaCache_?: { value: TopUpJugaConfig | null; expiresAt: number };
  _gasTopUpJugaInflight_?: Promise<TopUpJugaConfig | null>;
  // Naik setiap admin mengubah katalog/config. Refresh yang mulai sebelum
  // perubahan tidak boleh menimpa cache dengan data lama.
  _gasContentVersion_?: number;
};

// Ditaruh di globalThis supaya reload module (dev/HMR) tidak membuang cache.
const globalForContent = globalThis as typeof globalThis & ContentCacheGlobal;

function bumpContentVersion(): void {
  globalForContent._gasContentVersion_ = (globalForContent._gasContentVersion_ ?? 0) + 1;
}

/** Panggil setiap kali katalog berubah dari /admin. */
function invalidateCatalogCache(): void {
  bumpContentVersion();
  globalForContent._gasCatalogCache_ = undefined;
  globalForContent._gasCatalogInflight_ = undefined;
}

/** Panggil setiap kali konfigurasi "Top Up Juga" berubah dari /admin. */
function invalidateTopUpJugaCache(): void {
  bumpContentVersion();
  globalForContent._gasTopUpJugaCache_ = undefined;
  globalForContent._gasTopUpJugaInflight_ = undefined;
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

// React cache membuat query yang sama dalam satu request cuma jalan sekali.
// Contoh: generateMetadata + page top-up sama-sama butuh game yang sama.
export const getDynamicGames = cache(async (): Promise<GameItem[]> => {
  const cached = globalForContent._gasCatalogCache_;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const inflight = globalForContent._gasCatalogInflight_;
  if (inflight) {
    // Selama refresh berjalan, data lama tetap disajikan.
    if (cached) {
      void inflight.catch(() => {});
      return cached.value;
    }
    return inflight;
  }

  const version = globalForContent._gasContentVersion_ ?? 0;
  const task = (async () => {
    try {
      await ready();
      const db = await getDb();
      const docs = await db.collection("games").find().sort({ slug: 1 }).toArray();
      let value: GameItem[];
      if (docs.length === 0) {
        value = GAMES;
      } else {
        // Merge: katalog statis sebagai dasar, dokumen DB menimpa slug yang sama.
        // Admin edit di DB tetap menang, tapi game kurasi di lib/catalog tidak ilang
        // walaupun katalog Gamestone di-sync penuh ke DB.
        const bySlug = new Map<string, GameItem>(GAMES.map((g) => [g.slug, g]));
        for (const { _id, ...game } of docs) {
          void _id;
          bySlug.set(game.slug, game as GameItem);
        }
        value = [...bySlug.values()];
      }

      // Jangan timpa cache kalau admin menyimpan perubahan saat query ini jalan.
      if ((globalForContent._gasContentVersion_ ?? 0) === version) {
        globalForContent._gasCatalogCache_ = {
          value,
          expiresAt: Date.now() + CATALOG_TTL_MS,
        };
      }
      return value;
    } catch {
      // DB sedang bermasalah: pertahankan data terakhir yang bagus, jangan
      // ganti katalog dengan versi statis.
      if (cached) {
        if ((globalForContent._gasContentVersion_ ?? 0) === version) {
          globalForContent._gasCatalogCache_ = {
            value: cached.value,
            expiresAt: Date.now() + FALLBACK_TTL_MS,
          };
        }
        return cached.value;
      }
      // Belum ada data lama sama sekali — pakai katalog statis sebentar.
      if ((globalForContent._gasContentVersion_ ?? 0) === version) {
        globalForContent._gasCatalogCache_ = {
          value: GAMES,
          expiresAt: Date.now() + FALLBACK_TTL_MS,
        };
      }
      return GAMES;
    }
  })().finally(() => {
    if (globalForContent._gasCatalogInflight_ === task) {
      globalForContent._gasCatalogInflight_ = undefined;
    }
  });

  globalForContent._gasCatalogInflight_ = task;

  // Stale-while-revalidate: kalau masih ada data lama, sajikan langsung dan
  // biarkan refresh jalan di belakang. Tanpa ini, request pertama setelah TTL
  // habis ikut menunggu query ~1 detik.
  if (cached) {
    void task.catch(() => {});
    return cached.value;
  }
  return task;
})

export const getDynamicGame = cache(async (slug: string): Promise<GameItem | undefined> => {
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
})

export async function upsertGame(game: GameItem): Promise<void> {
  await ready();
  const db = await getDb();
  await db
    .collection("games")
    .updateOne({ slug: game.slug }, { $set: game }, { upsert: true });
  invalidateCatalogCache();
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

export const getTopUpJugaConfig = cache(async (): Promise<TopUpJugaConfig | null> => {
  const cached = globalForContent._gasTopUpJugaCache_;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const inflight = globalForContent._gasTopUpJugaInflight_;
  if (inflight) {
    if (cached) {
      void inflight.catch(() => {});
      return cached.value;
    }
    return inflight;
  }

  const version = globalForContent._gasContentVersion_ ?? 0;
  const task = (async () => {
    try {
      await ready();
      const db = await getDb();
      const doc = await db.collection<TopUpJugaDoc>("site_content").findOne({ key: TOPUP_JUGA_KEY });
      const value: TopUpJugaConfig | null = doc
        ? {
            global: Array.isArray(doc.global) ? doc.global : [],
            perGame: doc.perGame && typeof doc.perGame === "object" ? doc.perGame : {},
            updatedAt: doc.updatedAt ?? "",
          }
        : null;

      if ((globalForContent._gasContentVersion_ ?? 0) === version) {
        globalForContent._gasTopUpJugaCache_ = {
          value,
          expiresAt: Date.now() + CATALOG_TTL_MS,
        };
      }
      return value;
    } catch {
      // DB bermasalah: kalau sudah ada config lama, jangan ganti dengan null.
      if (cached) {
        if ((globalForContent._gasContentVersion_ ?? 0) === version) {
          globalForContent._gasTopUpJugaCache_ = {
            value: cached.value,
            expiresAt: Date.now() + FALLBACK_TTL_MS,
          };
        }
        return cached.value;
      }
      // DB down — halaman publik jatuh ke urutan otomatis, bukan error.
      if ((globalForContent._gasContentVersion_ ?? 0) === version) {
        globalForContent._gasTopUpJugaCache_ = { value: null, expiresAt: Date.now() + FALLBACK_TTL_MS };
      }
      return null;
    }
  })().finally(() => {
    if (globalForContent._gasTopUpJugaInflight_ === task) {
      globalForContent._gasTopUpJugaInflight_ = undefined;
    }
  });

  globalForContent._gasTopUpJugaInflight_ = task;

  // Sama seperti katalog: data lama dipakai dulu, refresh di belakang.
  if (cached) {
    void task.catch(() => {});
    return cached.value;
  }
  return task;
})

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
  invalidateTopUpJugaCache();
}

export async function clearTopUpJuga(): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection<TopUpJugaDoc>("site_content").deleteOne({ key: TOPUP_JUGA_KEY });
  invalidateTopUpJugaCache();
}

export async function deleteGame(slug: string): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection("games").deleteOne({ slug });
  invalidateCatalogCache();
}
