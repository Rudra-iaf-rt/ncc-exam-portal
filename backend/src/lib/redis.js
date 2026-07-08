const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  const isDev = process.env.NODE_ENV === "development";

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: isDev ? null : 3,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
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
  const setObj = new Map();
  
  redis = {
    get: async (k) => memoryMap.get(k) || null,
    // SET with optional EX/NX support (matches ioredis arg order: key, value, 'EX', secs, 'NX')
    set: async (k, v, ...args) => {
      const upperArgs = args.map((a) => String(a).toUpperCase());
      const isNX = upperArgs.includes("NX");
      if (isNX && memoryMap.has(k)) return null; // NX: do not overwrite existing key
      memoryMap.set(k, v);
      return "OK";
    },
    setex: async (k, s, v) => { memoryMap.set(k, v); return "OK"; },
    del: async (...keys) => {
      let count = 0;
      for (const k of keys) {
        if (memoryMap.has(k)) { memoryMap.delete(k); count++; }
        hashObj.delete(k);
        setObj.delete(k);
      }
      return count;
    },
    sadd: async (k, ...members) => {
      if (!setObj.has(k)) setObj.set(k, new Set());
      const s = setObj.get(k);
      let added = 0;
      for (const m of members) { if (!s.has(m)) { s.add(m); added++; } }
      return added;
    },
    smembers: async (k) => {
      const s = setObj.get(k);
      return s ? Array.from(s) : [];
    },
    incr: async (k) => {
      const val = Number(memoryMap.get(k) || 0) + 1;
      memoryMap.set(k, String(val));
      return val;
    },
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
    // For rate-limit-redis compat: no-op in dev without real Redis
    call: async (_command, ..._args) => null,
  };
}

module.exports = { redis };
