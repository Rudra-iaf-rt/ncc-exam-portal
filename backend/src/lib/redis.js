const Redis = require("ioredis");

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    connectTimeout: 2000,
    commandTimeout: 1000,
  });

  redis.on("error", (err) => {
    console.error("[Redis Error]", err.message);
  });

  redis.on("connect", () => {
    console.log("[Redis] Connected successfully.");
  });
} else {
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
