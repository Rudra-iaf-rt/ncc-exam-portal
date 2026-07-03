import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCachedResource,
  getOrFetchResource,
  subscribeToCacheKey,
} from '../lib/resourceCache';

export function useCachedFetch(cacheKey, fetcher, { staleTimeMs = 120_000, enabled = true } = {}) {
  const [data, setData] = useState(() => getCachedResource(cacheKey));
  const [loading, setLoading] = useState(!getCachedResource(cacheKey));
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cancelled = useRef(false);

  const fetch = useCallback(async () => {
    if (!enabled || !cacheKey) return;
    try {
      const result = await getOrFetchResource(cacheKey, fetcherRef.current, { staleTimeMs });
      if (!cancelled.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!cancelled.current) setError(err);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [cacheKey, staleTimeMs, enabled]);

  useEffect(() => {
    if (!enabled || !cacheKey) return;
    cancelled.current = false;

    const cached = getCachedResource(cacheKey);
    if (cached != null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetch();

    // Subscribe: when this key is invalidated anywhere, immediately re-fetch
    const unsub = subscribeToCacheKey(cacheKey, (newData) => {
      if (cancelled.current) return;
      if (newData !== null && newData !== undefined) {
        // Cache was updated (e.g. optimistic write) — reflect immediately
        setData(newData);
        setLoading(false);
      } else {
        setLoading(true);
        fetch();
      }
    });

    return () => {
      cancelled.current = true;
      unsub();
    };
  }, [cacheKey, fetch, enabled]);

  return { data, loading, error, refetch: fetch };
}
