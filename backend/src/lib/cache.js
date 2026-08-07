const { performance } = require("perf_hooks");
const { logger } = require("../utils/logger");
const { redis } = require("./redis");
const { getPerfContext } = require("./perf-context");

// CACHE_TIMEOUT_MS: max time to wait for a Redis GET/SET before falling through to DB.
// Default raised to 2000ms — Upstash RTT from India is ~400-600ms, so 500ms was
// timing out on nearly every GET, treating all cache hits as misses and hitting the DB.
const CACHE_TIMEOUT_MS = Number(process.env.CACHE_TIMEOUT_MS || 2000);

// In-process deduplication map — prevents thundering herd / cache stampede.
// When the cache misses and N concurrent requests all want the same key, only
// ONE DB fetch fires; all others join the same Promise. Works correctly on
// Render free tier (single process). On multi-instance it doesn't cross-process
// coalesce, but that is safe — just means at most one fetch per instance.
const _pendingFetches = new Map();

async function withTimeout(promise, fallback = null) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), CACHE_TIMEOUT_MS);
  });

  if (promise && typeof promise.catch === "function") {
    promise.catch((err) => {
      logger.warn({ action: "cache_timeout_error", message: err.message });
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
  const t0 = performance.now();
  try {
    const raw = await withTimeout(redis.get(key), null);
    const elapsed = performance.now() - t0;

    const ctx = getPerfContext();
    if (ctx) {
      ctx.cache_checked = true;
      ctx.cache_time_ms += elapsed;
      if (raw) ctx.cache_hit = true;
    }

    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ action: "cache_get_error", message: err.message });
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
          logger.warn({ action: "cache_del_error", message: err.message });
        })
      )
    );
  } catch (_err) {
    // Best-effort invalidation only.
  }
}

/**
 * cacheGetOrFetch — cache-aside with in-process stampede prevention.
 *
 * Usage:
 *   const data = await cacheGetOrFetch(
 *     'some:key',
 *     300,                // TTL seconds
 *     () => expensiveDbQuery(),
 *     'namespace'         // optional, for cacheDelNamespace support
 *   );
 *
 * Guarantees:
 * - If cache HIT  → returns cached value immediately (no DB touch).
 * - If cache MISS and NO in-flight fetch → runs fetchFn(), caches result, returns it.
 * - If cache MISS and EXISTING in-flight fetch → joins the existing Promise (zero extra DB queries).
 * - On fetchFn() error → clears the pending entry so the next request retries clean.
 */
async function cacheGetOrFetch(key, ttlSec, fetchFn, namespace = null) {
  // 1. Try cache first.
  const cached = await cacheGetJson(key);
  if (cached !== null) return cached;

  // 2. If another request is already fetching this key, join it (stampede guard).
  if (_pendingFetches.has(key)) {
    return _pendingFetches.get(key);
  }

  // 3. This request wins the race — start the fetch and register the shared Promise.
  const promise = fetchFn()
    .then(async (result) => {
      _pendingFetches.delete(key);
      // Write-through: best-effort, never blocks the response.
      await cacheSetJson(key, ttlSec, result, namespace);
      return result;
    })
    .catch((err) => {
      _pendingFetches.delete(key);
      throw err;
    });

  _pendingFetches.set(key, promise);
  return promise;
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
  } catch (_err) {
    return 1;
  }
}

async function incrementCacheVersion(namespace) {
  if (!namespace) return;
  try {
    withTimeout(redis.incr(`cache_version:${namespace}`), null).catch(() => {});
  } catch (err) {
    logger.error("Error incrementing cache version", err);
  }
}

module.exports = {
  cacheGetJson,
  cacheSetJson,
  cacheGetOrFetch,
  cacheDel,
  cacheDelNamespace,
  cacheDelPattern,
  withCacheLock,
  getCacheVersion,
  incrementCacheVersion,
  trackKey,
  withTimeout,
};
