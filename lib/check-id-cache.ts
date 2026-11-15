/**
 * Cache hasil cek ID yang dipakai bersama semua instance.
 *
 * Cache in-memory tetap jadi lapisan pertama (paling cepat), tapi kalau
 * instance lain sudah pernah mengecek ID yang sama, hasilnya bisa diambil
 * dari Mongo tanpa memanggil APIGames lagi. Ini menghemat biaya per cek dan
 * mengurangi lonjakan request ke provider saat trafik naik.
 *
 * SERVER-ONLY: file ini mengimpor MongoDB.
 */
import { getDb } from "./mongodb"
import type { ApigamesCheckResult } from "./apigames"

export type CachedCheckIdResult = ApigamesCheckResult & {
  regionMismatch?: boolean
}

type CacheDoc = {
  _id: string
  value: CachedCheckIdResult
  expiresAt: Date
}

const COLLECTION = "check_id_cache"

/** Ambil hasil yang masih berlaku. Error DB = cache miss, bukan error API. */
export async function getCachedCheckId(
  key: string
): Promise<CachedCheckIdResult | null> {
  try {
    const db = await getDb()
    const doc = await db
      .collection<CacheDoc>(COLLECTION)
      .findOne({ _id: key, expiresAt: { $gt: new Date() } })
    return doc?.value ?? null
  } catch {
    return null
  }
}

/** Simpan hasil; kegagalan cache tidak boleh menggagalkan cek ID. */
export async function setCachedCheckId(
  key: string,
  value: CachedCheckIdResult,
  ttlMs: number
): Promise<void> {
  try {
    const db = await getDb()
    await db.collection<CacheDoc>(COLLECTION).updateOne(
      { _id: key },
      {
        $set: {
          value,
          expiresAt: new Date(Date.now() + ttlMs),
        },
      },
      { upsert: true }
    )
  } catch {
    // Cache bersifat best-effort; provider tetap jadi sumber kebenaran.
  }
}
