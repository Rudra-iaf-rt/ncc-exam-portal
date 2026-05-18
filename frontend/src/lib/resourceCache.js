/**
 * Reactive Resource Cache
 *
 * A lightweight pub/sub cache that:
 * 1. Shows cached data immediately on mount (instant navigation)
 * 2. Revalidates in background if data is stale (stale-while-revalidate)
 * 3. When invalidated, forces every subscribed component to re-fetch immediately
 *    — no manual refreshKey or page reload needed
 */

const cache = new Map();          // key → { data, updatedAt, inFlight }
const subscribers = new Map();    // key → Set<callback>

/** Return cached data synchronously (null if no cache) */
export function getCachedResource(key) {
  if (!key) return null;
  return cache.get(key)?.data ?? null;
}

/** Write directly into cache (used for optimistic updates) */
export function setCachedResource(key, data) {
  if (!key) return;
  cache.set(key, { data, updatedAt: Date.now(), inFlight: null });
  _notify(key, data);
}

/**
 * Delete cache entry AND immediately re-trigger every mounted component
 * that is subscribed to this key, forcing them to re-fetch fresh data.
 */
export function invalidateCachedResource(key) {
  if (!key) return;
  cache.delete(key);
  _notify(key, null);          // wake up all subscribers with null → they re-fetch
}

/**
 * Fetch-or-cache with stale-while-revalidate.
 * - Fresh hit  → return cached data immediately, no network call
 * - Stale/miss → fetch, cache result, return it
 * - In-flight  → deduplicate: return the same promise
 */
export async function getOrFetchResource(key, fetcher, { staleTimeMs = 120_000 } = {}) {
  if (!key) return fetcher();

  const now = Date.now();
  const existing = cache.get(key);
  const isFresh = existing && (now - existing.updatedAt) < staleTimeMs;

  if (isFresh && existing.data != null) {
    return existing.data;
  }

  // Deduplicate concurrent requests for the same key
  if (existing?.inFlight) {
    return existing.inFlight;
  }

  const inFlight = (async () => {
    const data = await fetcher();
    cache.set(key, { data, updatedAt: Date.now(), inFlight: null });
    _notify(key, data);
    return data;
  })().catch((error) => {
    const cur = cache.get(key);
    if (cur?.inFlight) {
      cache.set(key, { data: cur.data ?? null, updatedAt: cur.updatedAt ?? 0, inFlight: null });
    }
    throw error;
  });

  cache.set(key, { data: existing?.data ?? null, updatedAt: existing?.updatedAt ?? 0, inFlight });
  return inFlight;
}

/**
 * Subscribe to cache changes for a key.
 * Callback is called with the new data (or null when invalidated).
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToCacheKey(key, callback) {
  if (!key || !callback) return () => {};
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(callback);
  return () => {
    subscribers.get(key)?.delete(callback);
  };
}

function _notify(key, data) {
  subscribers.get(key)?.forEach(cb => {
    try { cb(data); } catch (_) {}
  });
}
