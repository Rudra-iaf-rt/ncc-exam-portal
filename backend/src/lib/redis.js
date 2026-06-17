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
  
  // Provide an in-memory dummy implementation so the app doesn't crash 
  // and local development can still function without a Redis instance.
  const memoryMap = new Map();
  const hashObj = new Map();
  
  redis = {
    get: async (k) => memoryMap.get(k) || null,
    set: async (k, v) => { memoryMap.set(k, v); return "OK"; },
    setex: async (k, s, v) => { memoryMap.set(k, v); return "OK"; },
    del: async (k) => { memoryMap.delete(k); hashObj.delete(k); return 1; },
    hset: async (k, f, v) => {
      if (!hashObj.has(k)) hashObj.set(k, {});
      hashObj.get(k)[f] = v;
      return 1;
    },
    hgetall: async (k) => {
      const obj = hashObj.get(k);
      return obj ? { ...obj } : null;
    },
    expire: async () => 1,
  };
}

module.exports = { redis };
