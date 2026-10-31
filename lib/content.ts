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

async function ready(): Promise<void> {
  await ensureIndexes();
}

// ── Hero event ──────────────────────────────────────────────────────────────

export async function getHeroEvent(): Promise<HeroEvent | null> {
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
  await ready();
  const db = await getDb();
  const docs = await db.collection("games").find().sort({ slug: 1 }).toArray();
  if (docs.length === 0) return GAMES;
  return docs.map(({ _id, ...game }) => {
    void _id;
    return game as GameItem;
  });
}

export async function getDynamicGame(slug: string): Promise<GameItem | undefined> {
  await ready();
  const db = await getDb();
  const doc = await db.collection("games").findOne({ slug });
  if (!doc) return getGame(slug);
  const { _id, ...game } = doc;
  void _id;
  return game as GameItem;
}

export async function upsertGame(game: GameItem): Promise<void> {
  await ready();
  const db = await getDb();
  await db
    .collection("games")
    .updateOne({ slug: game.slug }, { $set: game }, { upsert: true });
}

export async function deleteGame(slug: string): Promise<void> {
  await ready();
  const db = await getDb();
  await db.collection("games").deleteOne({ slug });
}
