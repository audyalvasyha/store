import { MongoClient, type Db } from "mongodb";

const uri: string = process.env.MONGODB_URI as string;
if (!uri || !uri.startsWith("mongodb")) throw new Error("MONGODB_URI is not set or invalid");

const globalForMongo = globalThis as typeof globalThis & { _mongoClient_?: MongoClient };

function makeClient(): MongoClient {
  return new MongoClient(uri, { maxPoolSize: 10 });
}

export const mongoClient = globalForMongo._mongoClient_ ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForMongo._mongoClient_ = mongoClient;

export const DB_NAME = process.env.MONGODB_DB ?? "topup-store";

let connectPromise: Promise<void> | null = null;
export async function connectIfNeed(): Promise<void> {
  if (connectPromise) return connectPromise;
  connectPromise = mongoClient.connect().then(() => { connectPromise = null; }).catch((err) => {
    connectPromise = null;
    throw err;
  });
  return connectPromise;
}

export async function getDb(): Promise<Db> {
  await connectIfNeed();
  return mongoClient.db(DB_NAME);
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection("orders").createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { createdAt: 1 } },
    { key: { status: 1 } },
    { key: { gameSlug: 1 } },
  ]);
  // Site content (hero event / games MC) + admin auth
  await db.collection("admins").createIndexes([{ key: { email: 1 }, unique: true }]);
  await db.collection("admin_sessions").createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
  await db.collection("site_content").createIndexes([{ key: { key: 1 }, unique: true }]);
  await db.collection("games").createIndexes([{ key: { slug: 1 }, unique: true }]);
}
