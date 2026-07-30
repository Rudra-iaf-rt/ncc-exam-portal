const express = require("express");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");

const router = express.Router();

/**
 * Compute percentile from a sorted numeric array.
 * @param {number[]} sorted - ascending sorted array
 * @param {number} p - percentile 0-100
 */
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Aggregate a flat array of records into per-route stats.
 * @param {object[]} records
 */
function aggregate(records) {
  // Group by route (normalised method+path)
  const groups = {};
  for (const r of records) {
    const key = `${r.method} ${r.path.replace(/\/\d+/g, "/:id")}`;
    if (!groups[key]) {
      groups[key] = {
        route: key,
        method: r.method,
        path: r.path.replace(/\/\d+/g, "/:id"),
        count: 0,
        durations: [],
        db_times: [],
        cache_times: [],
        cache_hits: 0,
        cache_misses: 0,
        total_db_queries: 0,
        total_db_rows: 0,
        status_counts: {},
        payload_bytes: [],
      };
    }
    const g = groups[key];
    g.count += 1;
    g.durations.push(r.duration_ms);
    g.db_times.push(r.db_time_ms);
    g.cache_times.push(r.cache_time_ms);
    if (r.cache_checked) {
      r.cache_hit ? g.cache_hits++ : g.cache_misses++;
    }
    g.total_db_queries += r.db_query_count;
    g.total_db_rows += r.db_rows;
    g.status_counts[r.statusCode] = (g.status_counts[r.statusCode] || 0) + 1;
    if (r.payload_bytes) g.payload_bytes.push(r.payload_bytes);
  }

  // Compute stats for each group
  return Object.values(groups).map((g) => {
    const sortedDur = [...g.durations].sort((a, b) => a - b);
    const sortedDb = [...g.db_times].sort((a, b) => a - b);
    const totalCacheChecked = g.cache_hits + g.cache_misses;

    return {
      route: g.route,
      method: g.method,
      count: g.count,
      // Latency percentiles (total API time)
      p50_ms: percentile(sortedDur, 50),
      p95_ms: percentile(sortedDur, 95),
      p99_ms: percentile(sortedDur, 99),
      avg_ms: Number((g.durations.reduce((s, v) => s + v, 0) / g.count).toFixed(2)),
      // DB stats
      avg_db_ms: Number((g.db_times.reduce((s, v) => s + v, 0) / g.count).toFixed(2)),
      p95_db_ms: percentile(sortedDb, 95),
      avg_db_queries: Number((g.total_db_queries / g.count).toFixed(1)),
      avg_db_rows: Number((g.total_db_rows / g.count).toFixed(1)),
      // Cache stats
      cache_hit_rate: totalCacheChecked
        ? Number(((g.cache_hits / totalCacheChecked) * 100).toFixed(1))
        : null,
      // Payload
      avg_payload_bytes: g.payload_bytes.length
        ? Math.round(g.payload_bytes.reduce((s, v) => s + v, 0) / g.payload_bytes.length)
        : 0,
      status_counts: g.status_counts,
    };
  }).sort((a, b) => b.p95_ms - a.p95_ms); // Sorted slowest first
}

/**
 * GET /api/admin/perf
 *
 * Returns:
 *  - raw: last N individual request records (newest first)
 *  - aggregated: per-route p50/p95/p99 stats
 *  - summary: overall totals
 *
 * Query params:
 *  ?route=<substring>   filter raw records by route substring
 *  ?limit=<n>           max raw records to return (default 50, max 200)
 */
router.get(
  "/perf",
  authenticate,
  requireAdmin,
  (req, res) => {
    const ring = global._perfRing || [];
    const routeFilter = req.query.route ? String(req.query.route).toLowerCase() : null;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));

    // Filter records
    const filtered = routeFilter
      ? ring.filter((r) => r.route.toLowerCase().includes(routeFilter))
      : ring;

    // Raw records: newest first, capped at limit
    const raw = [...filtered].reverse().slice(0, limit);

    // Aggregated stats over all filtered records
    const aggregated = aggregate(filtered);

    // Summary
    const totalRequests = ring.length;
    const slowCount = ring.filter((r) => r.duration_ms > 500).length;
    const errorCount = ring.filter((r) => r.statusCode >= 500).length;
    const avgDuration = totalRequests
      ? Number((ring.reduce((s, r) => s + r.duration_ms, 0) / totalRequests).toFixed(2))
      : 0;

    res.json({
      meta: {
        ring_capacity: 200,
        total_recorded: totalRequests,
        filter_applied: routeFilter,
        returned_raw: raw.length,
      },
      summary: {
        avg_duration_ms: avgDuration,
        slow_requests_gt500ms: slowCount,
        error_requests_5xx: errorCount,
        error_rate_pct: totalRequests
          ? Number(((errorCount / totalRequests) * 100).toFixed(2))
          : 0,
      },
      aggregated,
      raw,
    });
  }
);

module.exports = router;
