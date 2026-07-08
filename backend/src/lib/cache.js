const { redis } = require("./redis");

const CACHE_TIMEOUT_MS = Number(process.env.CACHE_TIMEOUT_MS || 120);

async function withTimeout(promise, fallback = null) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), CACHE_TIMEOUT_MS);
  });

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

function trackKey(namespace, key) {
  if (!namespace || !key) return;
  withTimeout(redis.sadd(`keys:${namespace}`, key), null).catch(() => {});
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

async function cacheSetJson(key, ttlSec, value, namespace = null) {
  if (!key || !ttlSec) return;
  try {
    const payload = JSON.stringify(value);
    await withTimeout(redis.setex(key, ttlSec, payload), null);
    if (namespace) trackKey(namespace, key);
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

async function cacheDelNamespace(namespace) {
  if (!namespace) return;
  const keySet = `keys:${namespace}`;
  try {
    const keys = await withTimeout(redis.smembers(keySet), []);
    if (keys && keys.length > 0) {
      await cacheDel(keys);
    }
    await withTimeout(redis.del(keySet), null);
  } catch (err) {
    console.error("[Redis] cacheDelNamespace error", err);
  }
}

async function cacheDelPattern(pattern) {
  return Promise.resolve();
}

async function withCacheLock(key, ttlSec, callback) {
  const lockKey = `lock:${key}`;
  const acquired = await withTimeout(
    // ioredis SET option order: value, expiryMode, time, setMode
    // "NX", "EX", n is wrong → sends SET key 1 NX EX n which Redis rejects.
    // Correct: "EX", n, "NX" → sends SET key 1 EX n NX
    redis.set(lockKey, "1", "EX", ttlSec, "NX"),
    null
  );
  if (acquired !== "OK") return null;
  try {
    return await callback();
  } finally {
    await withTimeout(redis.del(lockKey), null);
  }
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
  cacheDelNamespace,
  cacheDelPattern,
  withCacheLock,
  getCacheVersion,
  incrementCacheVersion,
  trackKey,
};
