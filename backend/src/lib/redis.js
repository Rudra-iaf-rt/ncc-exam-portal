const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  const isDev = process.env.NODE_ENV === "development";

  redis = new Redis(process.env.REDIS_URL, {
    // In development, relax thresholds to tolerate high latency to remote cloud databases (e.g. India to US-East-1)
    // In production, keep aggressive thresholds to fail fast and degrade gracefully under high load
    maxRetriesPerRequest: isDev ? null : 1,
    enableOfflineQueue: isDev ? true : false,
    enableReadyCheck: false,
    connectTimeout: isDev ? 10000 : 1000,
    commandTimeout: isDev ? 3000 : 400,
  });

  redis.on("error", (err) => {
    console.error("[Redis Error]", err.message);
  });

  redis.on("connect", () => {
    console.log("[Redis] Connected successfully.");
  });
} else {
  if (process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required in production");
  }
  console.warn("[Redis] REDIS_URL is not set. Caching is currently disabled.");
  
  // Provide a dummy implementation so the app doesn't crash when calling redis.get / redis.set
  redis = {
    get: async () => null,
    set: async () => "OK",
    setex: async () => "OK",
    del: async () => "OK",
  };
}

module.exports = { redis };
