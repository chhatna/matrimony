import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured. Set it in .env.local");

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        // On disconnect, drop the cache so the next connect attempt retries fresh.
        m.connection.on("disconnected", () => {
          cache.conn = null;
          cache.promise = null;
        });
        return m;
      });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    // CRITICAL: clear the rejected promise so the next request retries instead of
    // forever returning the same cached failure (e.g. when an IP whitelist is fixed
    // but the server has cached a previous connection failure).
    cache.promise = null;
    cache.conn = null;
    throw err;
  }
}
