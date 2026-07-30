/**
 * Frontend Performance Monitor
 *
 * A lightweight singleton that:
 * 1. Maintains a ring buffer of the last 50 API timing records.
 * 2. Parses Server-Timing headers from Axios responses for backend breakdown.
 * 3. Exposes subscribe/unsubscribe so the DevPerfPanel can react in real time.
 *
 * Records are NEVER sent to the backend — dev-only, local browser memory only.
 *
 * Record shape:
 * {
 *   id          : number     — monotonic counter
 *   ts          : number     — Date.now() when the request started
 *   label       : string     — human-readable name (e.g. "ExamList")
 *   url         : string     — API URL called
 *   method      : string     — HTTP method
 *   status      : number     — HTTP status code
 *   network_ms  : number     — t_response - t_request (fetch round-trip)
 *   render_ms   : number     — t_render - t_response (React commit + rAF)
 *   total_ms    : number     — t_render - t_request
 *   cache_source: string     — "memory" | "redis" | "network" | "unknown"
 *   // From Server-Timing header (parsed from response)
 *   st_total_ms : number|null
 *   st_db_ms    : number|null
 *   st_cache_ms : number|null
 * }
 */

const RING_SIZE = 50;
const ring = [];
let _idCounter = 0;
const _subscribers = new Set();

function _notify() {
  _subscribers.forEach((cb) => {
    try { cb([...ring]); } catch (_) {}
  });
}

/**
 * Parse the Server-Timing header string into a name→dur map.
 * e.g. "total;dur=240.12, db;dur=180.01, cache;dur=12.44"
 * → { total: 240.12, db: 180.01, cache: 12.44 }
 */
function parseServerTiming(headerValue) {
  if (!headerValue) return {};
  const result = {};
  for (const part of headerValue.split(',')) {
    const trimmed = part.trim();
    const nameMatch = trimmed.match(/^([^;]+)/);
    const durMatch = trimmed.match(/dur=([\d.]+)/);
    if (nameMatch && durMatch) {
      result[nameMatch[1].trim()] = parseFloat(durMatch[1]);
    }
  }
  return result;
}

/**
 * Record a timing entry. Called by useTimedFetch after render.
 *
 * @param {object} opts
 * @param {string} opts.label
 * @param {string} opts.url
 * @param {string} opts.method
 * @param {number} opts.status
 * @param {number} opts.t_request  — performance.now() at fetch start
 * @param {number} opts.t_response — performance.now() when promise resolved
 * @param {number} opts.t_render   — performance.now() from rAF after state set
 * @param {string} [opts.serverTimingHeader] — raw Server-Timing header value
 * @param {string} [opts.cacheSource]  — "memory"|"redis"|"network"|"unknown"
 */
export function recordTiming({
  label,
  url,
  method = 'GET',
  status = 200,
  t_request,
  t_response,
  t_render,
  serverTimingHeader = null,
  cacheSource = 'unknown',
}) {
  const network_ms = Number((t_response - t_request).toFixed(2));
  const render_ms = Number((t_render - t_response).toFixed(2));
  const total_ms = Number((t_render - t_request).toFixed(2));

  const st = parseServerTiming(serverTimingHeader);

  const record = {
    id: ++_idCounter,
    ts: Date.now(),
    label: label || url,
    url,
    method,
    status,
    network_ms,
    render_ms,
    total_ms,
    cache_source: cacheSource,
    st_total_ms: st.total ?? null,
    st_db_ms: st.db ?? null,
    st_cache_ms: st.cache ?? null,
  };

  ring.push(record);
  if (ring.length > RING_SIZE) ring.shift();

  _notify();
}

/** Get a snapshot of all current records (newest last). */
export function getRecords() {
  return [...ring];
}

/** Clear all records. */
export function clearRecords() {
  ring.length = 0;
  _notify();
}

/**
 * Subscribe to ring buffer changes.
 * Callback receives the full current array every time a new record is added.
 * Returns an unsubscribe function.
 */
export function subscribe(callback) {
  _subscribers.add(callback);
  return () => _subscribers.delete(callback);
}
