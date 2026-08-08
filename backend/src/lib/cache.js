const { performance } = require("perf_hooks");
const { logger } = require("../utils/logger");
const { redis } = require("./redis");
const { getPerfContext } = require("./perf-context");

const { LRUCache } = require("lru-cache");

const l1Cache = new LRUCache({
  max: 100,
  ttl: 5000, // 5 seconds
});

const CACHE_TIMEOUT_MS = Number(process.env.CACHE_TIMEOUT_MS || 2000);


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
    if (process.env.NODE_ENV !== "test") keys.forEach(key => l1Cache.delete(key));
    await withTimeout(redis.del(...keys), null);
  } catch (err) {
    logger.warn({ action: "cache_del_error", message: err.message });
  }
}


async function cacheGetOrFetch(key, ttlSec, fetchFn, namespace = null) {
  if (process.env.NODE_ENV !== "test" && l1Cache.has(key)) {
    return l1Cache.get(key);
  }

  const cached = await cacheGetJson(key);
  if (cached !== null) {
    if (process.env.NODE_ENV !== "test") l1Cache.set(key, cached);
    return cached;
  }

  if (_pendingFetches.has(key)) {
    return _pendingFetches.get(key);
  }

  const promise = fetchFn()
    .then((result) => {
      _pendingFetches.delete(key);
      cacheSetJson(key, ttlSec, result, namespace);
      if (process.env.NODE_ENV !== "test") l1Cache.set(key, result);
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
    if (process.env.NODE_ENV !== "test") l1Cache.clear(); // Safest way to clear L1 for namespace invalidation on a tiny cache
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
