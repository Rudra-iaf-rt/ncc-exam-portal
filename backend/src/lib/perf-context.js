'use strict';
const { AsyncLocalStorage } = require('async_hooks');

/**
 * Per-request performance context store.
 *
 * The telemetry middleware creates a fresh context object and calls
 * runWithPerfContext(ctx, next) so that every downstream async call —
 * including Prisma queries and Redis cache lookups — can annotate the
 * same context object without req being threaded through every function.
 *
 * Shape of ctx:
 * {
 *   db_query_count : number,   — total Prisma queries issued in this request
 *   db_time_ms     : number,   — accumulated ORM time (ms)
 *   db_rows        : number,   — total rows returned across all queries
 *   cache_checked  : boolean,  — was Redis checked at all?
 *   cache_hit      : boolean,  — did Redis serve the response?
 *   cache_time_ms  : number,   — time spent in Redis (ms)
 * }
 */
const _store = new AsyncLocalStorage();

/**
 * Return the perf context for the current async continuation, or null if
 * called outside a request (e.g. background jobs, cron).
 * @returns {object|null}
 */
function getPerfContext() {
  return _store.getStore() ?? null;
}

/**
 * Run `fn` inside an async context bound to `ctx`.
 * Call this once per request in the telemetry middleware.
 * @param {object} ctx
 * @param {Function} fn
 * @returns {*} whatever fn returns
 */
function runWithPerfContext(ctx, fn) {
  return _store.run(ctx, fn);
}

/**
 * Create a fresh, zeroed-out perf context object.
 * @returns {object}
 */
function createPerfContext() {
  return {
    db_query_count: 0,
    db_time_ms: 0,
    db_rows: 0,
    cache_checked: false,
    cache_hit: false,
    cache_time_ms: 0,
  };
}

module.exports = { getPerfContext, runWithPerfContext, createPerfContext };
