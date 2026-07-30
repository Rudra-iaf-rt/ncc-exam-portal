import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Zap, Database, Clock, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle2, Layers
} from 'lucide-react';
import { adminApi } from '../../api';

// ─── Helpers ────────────────────────────────────────────────────────────────

function msColor(ms) {
  if (ms == null) return '#64748b';
  if (ms < 200) return '#4ade80';
  if (ms < 500) return '#facc15';
  return '#f87171';
}

function fmt(ms) {
  if (ms == null || ms === 0) return '—';
  return `${Number(ms).toFixed(1)}ms`;
}

function pct(n) {
  if (n == null) return '—';
  return `${n}%`;
}

function Bar({ value, max, color }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, width: '100%', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = '#a5b4fc' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
    </div>
  );
}

// ─── Bottleneck Verdict ──────────────────────────────────────────────────────

function VerdictCard({ aggregated }) {
  if (!aggregated?.length) return null;

  // Look at the top 5 slowest routes
  const top5 = aggregated.slice(0, 5);
  const avgDbRatio = top5.reduce((s, r) => {
    const ratio = r.avg_ms > 0 ? r.avg_db_ms / r.avg_ms : 0;
    return s + ratio;
  }, 0) / top5.length;

  const avgCacheHit = top5.filter(r => r.cache_hit_rate != null)
    .reduce((s, r) => s + r.cache_hit_rate, 0) / (top5.filter(r => r.cache_hit_rate != null).length || 1);

  let verdict, detail, color, Icon;

  if (avgDbRatio > 0.7) {
    verdict = 'Database is the bottleneck';
    detail = `${Math.round(avgDbRatio * 100)}% of API time is spent in DB queries. Consider adding indexes, using select projections, or enabling query result caching.`;
    color = '#f87171';
    Icon = Database;
  } else if (avgCacheHit < 30) {
    verdict = 'Redis cache hit rate is low';
    detail = `Cache hit rate is ${Math.round(avgCacheHit)}% on high-traffic routes. Cold cache or short TTL. Review cacheSetJson TTL values.`;
    color = '#facc15';
    Icon = Layers;
  } else if (top5.some(r => r.p95_ms > 500)) {
    verdict = 'High p95 latency detected';
    detail = 'Some endpoints exceed 500ms at p95. This points to occasional slow queries or connection pool pressure under concurrent load.';
    color = '#fb923c';
    Icon = TrendingUp;
  } else {
    verdict = 'Backend performance looks healthy';
    detail = 'All recorded p95 latencies are under 500ms and DB usage is proportional. If UI still feels slow, the bottleneck is likely frontend rendering or network.';
    color = '#4ade80';
    Icon = CheckCircle2;
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
      marginBottom: 24,
    }}>
      <Icon size={22} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 700, color, fontSize: 15, marginBottom: 4 }}>{verdict}</div>
        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PerformanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [routeFilter, setRouteFilter] = useState('');
  const [tab, setTab] = useState('aggregated'); // 'aggregated' | 'raw'

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

  const summary = data?.summary;
  const aggregated = data?.aggregated || [];
  const raw = data?.raw || [];
  const meta = data?.meta;

  const maxP95 = aggregated.length ? Math.max(...aggregated.map(r => r.p95_ms)) : 1;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Activity size={22} style={{ color: '#a5b4fc' }} />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Performance Diagnostics</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            Live backend request profiling — last {meta?.total_recorded ?? 0} of 200 requests recorded
            {meta?.filter_applied && <span style={{ color: '#a5b4fc' }}> • filter: "{meta.filter_applied}"</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: autoRefresh ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${autoRefresh ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: autoRefresh ? '#4ade80' : '#94a3b8',
            }}
          >
            {autoRefresh ? '⏱ Auto 30s' : '⏸ Manual'}
          </button>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(165,180,252,0.15)', border: '1px solid rgba(165,180,252,0.3)', color: '#a5b4fc',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Filter by route (e.g. exams, results, auth)..."
          value={routeFilter}
          onChange={e => setRouteFilter(e.target.value)}
          style={{
            width: '100%', maxWidth: 400, padding: '8px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', marginBottom: 20 }}>
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: 8 }} />{error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard icon={Clock} label="Avg Response" value={fmt(summary.avg_duration_ms)} sub="All recorded requests" color="#a5b4fc" />
          <StatCard icon={Zap} label="Slow (>500ms)" value={summary.slow_requests_gt500ms} sub="Requests over threshold" color="#facc15" />
          <StatCard icon={AlertTriangle} label="5xx Errors" value={summary.error_requests_5xx} sub={`${summary.error_rate_pct}% error rate`} color="#f87171" />
          <StatCard icon={Activity} label="Total Recorded" value={meta?.total_recorded ?? 0} sub="In-memory ring buffer" color="#4ade80" />
        </div>
      )}

      {/* Verdict */}
      <VerdictCard aggregated={aggregated} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[['aggregated', 'Per-Route Stats'], ['raw', 'Raw Request Log']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: tab === key ? '2px solid #a5b4fc' : '2px solid transparent',
              color: tab === key ? '#a5b4fc' : '#64748b',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: 14 }}>
          Loading diagnostics...
        </div>
      )}

      {/* Aggregated Table */}
      {!loading && tab === 'aggregated' && (
        <div style={{ overflowX: 'auto' }}>
          {aggregated.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              No requests recorded yet. Navigate around the portal to generate data.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Route', 'Count', 'p50', 'p95', 'p99', 'Avg DB', 'DB Queries', 'Cache Hit%', 'Payload', 'p95 Bar'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((r, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.route}>
                      <span style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                        background: r.method === 'POST' ? 'rgba(250,204,21,0.15)' : r.method === 'DELETE' ? 'rgba(248,113,113,0.15)' : 'rgba(165,180,252,0.12)',
                        color: r.method === 'POST' ? '#fde68a' : r.method === 'DELETE' ? '#fca5a5' : '#a5b4fc',
                        fontSize: 10, fontWeight: 700, marginRight: 6,
                      }}>{r.method}</span>
                      {r.route.replace(`${r.method} `, '')}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', textAlign: 'center' }}>{r.count}</td>
                    <td style={{ padding: '10px 12px', color: msColor(r.p50_ms), fontWeight: 600 }}>{fmt(r.p50_ms)}</td>
                    <td style={{ padding: '10px 12px', color: msColor(r.p95_ms), fontWeight: 700 }}>{fmt(r.p95_ms)}</td>
                    <td style={{ padding: '10px 12px', color: msColor(r.p99_ms) }}>{fmt(r.p99_ms)}</td>
                    <td style={{ padding: '10px 12px', color: msColor(r.avg_db_ms) }}>{fmt(r.avg_db_ms)}</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', textAlign: 'center' }}>{r.avg_db_queries}</td>
                    <td style={{ padding: '10px 12px', color: r.cache_hit_rate != null ? (r.cache_hit_rate > 70 ? '#4ade80' : r.cache_hit_rate > 30 ? '#facc15' : '#f87171') : '#64748b' }}>
                      {pct(r.cache_hit_rate)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>
                      {r.avg_payload_bytes ? `${(r.avg_payload_bytes / 1024).toFixed(1)}KB` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', width: 100 }}>
                      <Bar value={r.p95_ms} max={maxP95} color={msColor(r.p95_ms)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Raw Request Log */}
      {!loading && tab === 'raw' && (
        <div style={{ overflowX: 'auto' }}>
          {raw.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              No raw requests in the current filter.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Time', 'Route', 'Status', 'Total', 'DB Time', 'DB Queries', 'DB Rows', 'Cache', 'Payload'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raw.map((r, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}>
                    <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(r.ts).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.route}>
                      {r.route}
                    </td>
                    <td style={{ padding: '6px 10px', color: r.statusCode >= 500 ? '#f87171' : r.statusCode >= 400 ? '#facc15' : '#4ade80', fontWeight: 700 }}>
                      {r.statusCode}
                    </td>
                    <td style={{ padding: '6px 10px', color: msColor(r.duration_ms), fontWeight: 700 }}>{fmt(r.duration_ms)}</td>
                    <td style={{ padding: '6px 10px', color: msColor(r.db_time_ms) }}>{fmt(r.db_time_ms)}</td>
                    <td style={{ padding: '6px 10px', color: '#94a3b8', textAlign: 'center' }}>{r.db_query_count}</td>
                    <td style={{ padding: '6px 10px', color: '#64748b', textAlign: 'center' }}>{r.db_rows}</td>
                    <td style={{ padding: '6px 10px' }}>
                      {r.cache_checked ? (
                        <span style={{ color: r.cache_hit ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                          {r.cache_hit ? 'HIT' : 'MISS'}
                        </span>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#475569' }}>
                      {r.payload_bytes ? `${(r.payload_bytes / 1024).toFixed(1)}KB` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
