import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Zap, Database, Clock, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle2, Layers,
  Copy, Check, Search, Filter
} from 'lucide-react';
import { adminApi } from '../../api';
import { PageHeader } from '../components/Shared';

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function getStatusBadge(ms) {
  if (ms == null || ms === 0) return { bg: 'bg-stone-wash text-ink-4', text: '—' };
  if (ms < 200) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Fast' };
  if (ms < 500) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Moderate' };
  return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Slow' };
}

function fmtMs(ms) {
  if (ms == null || ms === 0) return '—';
  return `${Number(ms).toFixed(1)}ms`;
}

function fmtPct(n) {
  if (n == null) return '—';
  return `${n}%`;
}

// ─── Bottleneck Diagnostic Banner ─────────────────────────────────────────────

function DiagnosticBanner({ aggregated }) {
  if (!aggregated?.length) return null;

  const top5 = aggregated.slice(0, 5);
  const avgDbRatio = top5.reduce((s, r) => {
    const ratio = r.avg_ms > 0 ? r.avg_db_ms / r.avg_ms : 0;
    return s + ratio;
  }, 0) / top5.length;

  const avgCacheHit = top5.filter(r => r.cache_hit_rate != null)
    .reduce((s, r) => s + r.cache_hit_rate, 0) / (top5.filter(r => r.cache_hit_rate != null).length || 1);

  let title, detail, badgeStyle, Icon;

  if (avgDbRatio > 0.7) {
    title = 'Database Query Latency';
    detail = `${Math.round(avgDbRatio * 100)}% of API response time is spent in Postgres. Query connection pool keep-alive is active.`;
    badgeStyle = 'bg-rose-50 border-rose-200 text-rose-800';
    Icon = Database;
  } else if (avgCacheHit < 30) {
    title = 'Redis Cache Waking Up';
    detail = `Cache hit rate is ${Math.round(avgCacheHit)}% on initial page views. Navigating pages populates Redis.`;
    badgeStyle = 'bg-amber-50 border-amber-200 text-amber-800';
    Icon = Layers;
  } else if (top5.some(r => r.p95_ms > 500)) {
    title = 'Occasional Spike Detected';
    detail = 'Some endpoints exceed 500ms p95 latency. Likely cold-start or initial un-cached queries.';
    badgeStyle = 'bg-amber-50 border-amber-200 text-amber-800';
    Icon = TrendingUp;
  } else {
    title = 'System Operating Efficiently';
    detail = 'All recorded p95 latencies are healthy and database response times are nominal.';
    badgeStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    Icon = CheckCircle2;
  }

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3.5 mb-6 shadow-sm transition-all ${badgeStyle}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-display font-semibold text-[14px] leading-snug">{title}</div>
        <div className="font-ui text-[13px] opacity-90 mt-0.5 leading-relaxed">{detail}</div>
      </div>
    </div>
  );
}

// ─── Main Performance Dashboard Page ───────────────────────────────────────────

export default function PerformanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [routeFilter, setRouteFilter] = useState('');
  const [tab, setTab] = useState('aggregated'); // 'aggregated' | 'raw'
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminApi.getPerfData(routeFilter ? { route: routeFilter } : {});
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [routeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const copyTelemetry = () => {
    if (!data?.raw?.length) return;
    const header = 'Time\tRoute\tStatus\tTotal\tDB Time\tDB Queries\tDB Rows\tCache\tPayload\n';
    const rows = data.raw.map(r => {
      const time = new Date(r.ts).toLocaleTimeString();
      const cache = r.cache_checked ? (r.cache_hit ? 'HIT' : 'MISS') : '—';
      const payload = r.payload_bytes ? `${(r.payload_bytes / 1024).toFixed(1)}KB` : '—';
      return `${time}\t${r.route}\t${r.statusCode}\t${fmtMs(r.duration_ms)}\t${fmtMs(r.db_time_ms)}\t${r.db_query_count}\t${r.db_rows}\t${cache}\t${payload}`;
    }).join('\n');

    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const summary = data?.summary;
  const aggregated = data?.aggregated || [];
  const raw = data?.raw || [];
  const meta = data?.meta;

  const maxP95 = aggregated.length ? Math.max(...aggregated.map(r => r.p95_ms)) : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Performance *Diagnostics*"
        subtitle={`Live backend request telemetry — tracking last ${meta?.total_recorded ?? 0} API requests`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyTelemetry}
              disabled={!raw.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-mono font-semibold rounded-md border border-stone-deep bg-white text-ink-2 hover:bg-stone-wash disabled:opacity-40 transition-colors shadow-sm"
              title="Copy telemetry log formatted for sharing"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-ink-3" />}
              {copied ? 'Copied!' : 'Copy Telemetry'}
            </button>
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-mono font-semibold rounded-md border transition-colors shadow-sm ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-stone-deep text-ink-3 hover:bg-stone-wash'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {autoRefresh ? 'Auto 30s' : 'Paused'}
            </button>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-mono font-semibold rounded-md bg-navy text-white hover:bg-navy-soft disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Diagnostic Overview Banner */}
      <DiagnosticBanner aggregated={aggregated} />

      {/* Metric Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-deep p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-ink-3 mb-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Avg Latency</span>
              <Clock className="w-4 h-4 text-navy" />
            </div>
            <div className="font-mono text-2xl font-bold text-navy tracking-tight">{fmtMs(summary.avg_duration_ms)}</div>
            <div className="font-ui text-[11px] text-ink-4 mt-1">Across all recorded routes</div>
          </div>

          <div className="bg-white border border-stone-deep p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-ink-3 mb-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Slow Requests</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-amber-600 tracking-tight">{summary.slow_requests_gt500ms}</div>
            <div className="font-ui text-[11px] text-ink-4 mt-1">Requests taking &gt;500ms</div>
          </div>

          <div className="bg-white border border-stone-deep p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-ink-3 mb-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">5xx Errors</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="font-mono text-2xl font-bold text-rose-600 tracking-tight">{summary.error_requests_5xx}</div>
            <div className="font-ui text-[11px] text-ink-4 mt-1">{summary.error_rate_pct}% failure rate</div>
          </div>

          <div className="bg-white border border-stone-deep p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between text-ink-3 mb-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Total Profiled</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-700 tracking-tight">{meta?.total_recorded ?? 0}</div>
            <div className="font-ui text-[11px] text-ink-4 mt-1">Requests in ring buffer</div>
          </div>
        </div>
      )}

      {/* Filter and Tab Bar */}
      <div className="bg-white border border-stone-deep rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="inline-flex rounded-md border border-stone-deep p-0.5 bg-stone-wash">
            <button
              onClick={() => setTab('aggregated')}
              className={`px-3.5 py-1.5 text-[12px] font-mono font-semibold rounded-md transition-colors ${
                tab === 'aggregated'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Route Breakdown
            </button>
            <button
              onClick={() => setTab('raw')}
              className={`px-3.5 py-1.5 text-[12px] font-mono font-semibold rounded-md transition-colors ${
                tab === 'raw'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Live Request Log ({raw.length})
            </button>
          </div>

          {/* Search filter */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              type="text"
              placeholder="Filter endpoint (e.g. exams, auth)..."
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[12px] font-mono bg-stone-wash border border-stone-deep rounded-md text-ink placeholder:text-ink-4 focus:outline-none focus:border-navy transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Aggregated Table */}
        {!loading && tab === 'aggregated' && (
          <div className="overflow-x-auto">
            {aggregated.length === 0 ? (
              <div className="py-12 text-center text-ink-4 font-mono text-xs">
                No telemetry recorded yet. Navigate through the portal to stream data.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-deep text-[11px] font-mono font-bold uppercase tracking-wider text-ink-3 bg-stone-wash">
                    <th className="py-2.5 px-3">Method & Route</th>
                    <th className="py-2.5 px-3 text-center">Hits</th>
                    <th className="py-2.5 px-3">p50</th>
                    <th className="py-2.5 px-3">p95</th>
                    <th className="py-2.5 px-3">p99</th>
                    <th className="py-2.5 px-3">Avg DB</th>
                    <th className="py-2.5 px-3 text-center">Queries</th>
                    <th className="py-2.5 px-3 text-center">Cache Hit%</th>
                    <th className="py-2.5 px-3">Payload</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-mid font-mono text-[12px]">
                  {aggregated.map((r, i) => {
                    const badge = getStatusBadge(r.p95_ms);
                    return (
                      <tr key={i} className="hover:bg-stone-wash/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-navy max-w-[260px] truncate" title={r.route}>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 uppercase ${
                            r.method === 'POST' ? 'bg-amber-100 text-amber-800' :
                            r.method === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {r.method}
                          </span>
                          {r.route.replace(`${r.method} `, '')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-ink-3">{r.count}</td>
                        <td className="py-2.5 px-3 text-ink-2 font-medium">{fmtMs(r.p50_ms)}</td>
                        <td className="py-2.5 px-3 font-bold text-ink">{fmtMs(r.p95_ms)}</td>
                        <td className="py-2.5 px-3 text-ink-3">{fmtMs(r.p99_ms)}</td>
                        <td className="py-2.5 px-3 text-ink-2">{fmtMs(r.avg_db_ms)}</td>
                        <td className="py-2.5 px-3 text-center text-ink-3">{r.avg_db_queries}</td>
                        <td className="py-2.5 px-3 text-center">
                          {r.cache_hit_rate != null ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.cache_hit_rate >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              r.cache_hit_rate >= 30 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-rose-50 border-rose-200 text-rose-700'
                            }`}>
                              {fmtPct(r.cache_hit_rate)}
                            </span>
                          ) : <span className="text-ink-4">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-ink-4 text-[11px]">
                          {r.avg_payload_bytes ? `${(r.avg_payload_bytes / 1024).toFixed(1)}KB` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                            {badge.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Live Raw Request Stream */}
        {!loading && tab === 'raw' && (
          <div className="overflow-x-auto">
            {raw.length === 0 ? (
              <div className="py-12 text-center text-ink-4 font-mono text-xs">
                No raw telemetry events recorded for current filter.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-deep text-[11px] font-mono font-bold uppercase tracking-wider text-ink-3 bg-stone-wash">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Total Time</th>
                    <th className="py-2.5 px-3">DB Time</th>
                    <th className="py-2.5 px-3 text-center">DB Queries</th>
                    <th className="py-2.5 px-3 text-center">DB Rows</th>
                    <th className="py-2.5 px-3 text-center">Cache</th>
                    <th className="py-2.5 px-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-mid font-mono text-[12px]">
                  {raw.map((r, i) => (
                    <tr key={i} className="hover:bg-stone-wash/60 transition-colors">
                      <td className="py-2 px-3 text-ink-4 whitespace-nowrap text-[11px]">
                        {new Date(r.ts).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-semibold text-navy max-w-[220px] truncate" title={r.route}>
                        {r.route}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          r.statusCode >= 500 ? 'bg-rose-100 text-rose-800' :
                          r.statusCode >= 400 ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.statusCode}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-ink">{fmtMs(r.duration_ms)}</td>
                      <td className="py-2 px-3 text-ink-2">{fmtMs(r.db_time_ms)}</td>
                      <td className="py-2 px-3 text-center text-ink-3">{r.db_query_count}</td>
                      <td className="py-2 px-3 text-center text-ink-4">{r.db_rows}</td>
                      <td className="py-2 px-3 text-center">
                        {r.cache_checked ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.cache_hit
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-rose-50 border-rose-300 text-rose-700'
                          }`}>
                            {r.cache_hit ? 'HIT' : 'MISS'}
                          </span>
                        ) : <span className="text-ink-4">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-ink-4 text-[11px]">
                        {r.payload_bytes ? `${(r.payload_bytes / 1024).toFixed(1)}KB` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
