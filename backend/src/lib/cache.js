const { redis } = require("./redis");

const CACHE_TIMEOUT_MS = Number(process.env.CACHE_TIMEOUT_MS || 120);

async function withTimeout(promise, fallback = null) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), CACHE_TIMEOUT_MS);
  });

  // Attach a catch handler to the input promise to prevent it from causing
  // an unhandled promise rejection if it rejects in the background after the timeout has resolved.
  if (promise && typeof promise.catch === "function") {
    promise.catch((err) => {
      console.warn("[Redis Cache Background Error]", err.message);
    });
  }

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function cacheGetJson(key) {
  if (!key) return null;
  try {
    const raw = await withTimeout(redis.get(key), null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Redis] GET error", err);
    return null;
  }
}

async function cacheSetJson(key, ttlSec, value) {
  if (!key || !ttlSec) return;
  try {
    const payload = JSON.stringify(value);
    withTimeout(redis.setex(key, ttlSec, payload), null).catch((err) => {
      console.error("[Redis Cache Set Background Failure]", err.message);
    });
  } catch (_err) {
    // Best-effort write only.
  }
}

async function cacheDel(keys) {
  if (!keys || keys.length === 0) return;
  try {
    await Promise.all(
      keys.map((key) =>
        withTimeout(redis.del(key), null).catch((err) => {
          console.error("[Redis Cache Del Background Failure]", err.message);
        })
      )
    );
  } catch (_err) {
    // Best-effort invalidation only.
  }
}

async function cacheDelPattern(pattern) {
  // Disabled: SCAN operations on remote Redis clusters are O(N) over the keyspace and can take 
  // 10+ seconds for large databases, completely blocking the event loop and exhausting quotas.
  // Instead, we rely on the short TTLs (30s - 60s) for cache expiration.
  return Promise.resolve();
}

async function getCacheVersion(namespace) {
  if (!namespace) return 1;
  try {
    const raw = await withTimeout(redis.get(`cache_version:${namespace}`), "1");
    return raw ? Number(raw) : 1;
  } catch (err) {
    return 1;
  }
}

async function incrementCacheVersion(namespace) {
  if (!namespace) return;
  try {
    withTimeout(redis.incr(`cache_version:${namespace}`), null).catch(() => {});
  } catch (err) {
    // Best effort
  }
}

module.exports = {
  cacheGetJson,
  cacheSetJson,
  cacheDel,
  cacheDelPattern,
  getCacheVersion,
  incrementCacheVersion,
};

