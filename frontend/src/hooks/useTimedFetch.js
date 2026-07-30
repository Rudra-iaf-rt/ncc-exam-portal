import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCachedResource,
  getOrFetchResource,
  subscribeToCacheKey,
} from '../lib/resourceCache';
import { recordTiming } from '../lib/performanceMonitor';

/**
 * useTimedFetch
 *
 * Drop-in replacement for useCachedFetch that adds performance instrumentation:
 *
 * - t_request  : performance.now() immediately before the fetcher is called
 * - t_response : performance.now() when the fetcher promise resolves
 * - t_render   : performance.now() captured inside a requestAnimationFrame
 *                callback (fired after React has committed the new state to DOM)
 *
 * All timings are stored in the local performanceMonitor ring buffer.
 * Nothing is sent to the network — dev-only tool.
 *
 * @param {string}   cacheKey    — same as useCachedFetch
 * @param {Function} fetcher     — async function that returns data
 * @param {object}   [opts]
 * @param {number}   [opts.staleTimeMs=120000] — cache freshness window
 * @param {boolean}  [opts.enabled=true]       — disable fetch conditionally
 * @param {string}   [opts.label]              — human-readable name shown in DevPerfPanel
 *
 * @returns {{ data, loading, error, refetch }}
 */
export function useTimedFetch(cacheKey, fetcher, {
  staleTimeMs = 120_000,
  enabled = true,
  label,
} = {}) {
  const [data, setData] = useState(() => getCachedResource(cacheKey));
  const [loading, setLoading] = useState(!getCachedResource(cacheKey));
  const [error, setError] = useState(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const labelRef = useRef(label || cacheKey || 'unknown');
  labelRef.current = label || cacheKey || 'unknown';

  const cancelled = useRef(false);

  const fetch = useCallback(async () => {
    if (!enabled || !cacheKey) return;

    const wasCached = getCachedResource(cacheKey) != null;
    const t_request = performance.now();

    try {
      const result = await getOrFetchResource(cacheKey, fetcherRef.current, { staleTimeMs });
      const t_response = performance.now();

      if (!cancelled.current) {
        setData(result);
        setError(null);
        setLoading(false);

        // Schedule render timestamp capture after React commits state + browser paints
        requestAnimationFrame(() => {
          const t_render = performance.now();

          // Try to read Server-Timing from the most recent perf entry for our URL
          // (only available if Axios exposes the response headers, which it does via PerformanceResourceTiming)
          let serverTimingHeader = null;
          try {
            const entries = performance.getEntriesByType('resource');
            // Find the most recent entry that looks like an API call
            const match = entries.slice(-10).reverse().find(
              (e) => e.name.includes('/api/')
            );
            if (match) {
              // PerformanceResourceTiming doesn't expose response headers directly,
              // but if the browser supports it and CORS headers are set, we can check:
              serverTimingHeader = match.serverTiming
                ?.map((st) => `${st.name};dur=${st.duration}`)
                .join(', ') || null;
            }
          } catch (_) {
            // Not all browsers support this; silent fail is correct.
          }

          recordTiming({
            label: labelRef.current,
            url: cacheKey,
            method: 'GET',
            status: 200,
            t_request,
            t_response,
            t_render,
            serverTimingHeader,
            cacheSource: wasCached ? 'memory' : 'network',
          });
        });
      }
    } catch (err) {
      const t_response = performance.now();
      if (!cancelled.current) {
        setError(err);
        setLoading(false);

        // Still record the timing even on error
        requestAnimationFrame(() => {
          recordTiming({
            label: labelRef.current,
            url: cacheKey,
            method: 'GET',
            status: err?.status || 0,
            t_request,
            t_response,
            t_render: performance.now(),
            cacheSource: wasCached ? 'memory' : 'network',
          });
        });
      }
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

    const unsub = subscribeToCacheKey(cacheKey, (newData) => {
      if (cancelled.current) return;
      if (newData !== null && newData !== undefined) {
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
