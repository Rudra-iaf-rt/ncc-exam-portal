import { useState, useEffect, useCallback } from 'react';
import { getRecords, clearRecords, subscribe } from '../lib/performanceMonitor';

/**
 * DevPerfPanel — floating performance diagnostics panel.
 *
 * Only rendered in development mode (gated by import.meta.env.DEV).
 * Toggle visibility with Ctrl+Shift+P.
 *
 * Shows the last 20 timed requests with:
 *  - Label / URL
 *  - Network time (t_request → t_response)
 *  - Render time (t_response → t_render via rAF)
 *  - Total time
 *  - Cache source (memory / network)
 *  - Backend breakdown from Server-Timing header (db, cache) if available
 *
 * Color coding:
 *  green  < 200ms total
 *  yellow < 500ms total
 *  red    ≥ 500ms total
 */

function msColor(ms) {
  if (ms < 200) return '#4ade80';   // green
  if (ms < 500) return '#facc15';   // yellow
  return '#f87171';                  // red
}

function formatMs(ms) {
  if (ms == null) return '—';
  return `${ms.toFixed(1)}ms`;
}

const PANEL_STYLES = {
  panel: {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: 99999,
    width: '600px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '420px',
    background: 'rgba(10, 10, 20, 0.96)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(99, 102, 241, 0.15)',
    borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
    flexShrink: 0,
  },
  title: {
    fontWeight: 700,
    fontSize: '12px',
    color: '#a5b4fc',
    letterSpacing: '0.05em',
  },
  clearBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '4px',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '2px 8px',
  },
  tableWrapper: {
    overflowY: 'auto',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '5px 8px',
    textAlign: 'left',
    color: '#94a3b8',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
  },
  td: {
    padding: '5px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 600,
  },
  hint: {
    padding: '6px 12px',
    color: '#64748b',
    fontSize: '10px',
    textAlign: 'center',
    flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
};

function Pill({ label }) {
  return (
    <span style={{
      ...PANEL_STYLES.badge,
      background: 'rgba(99,102,241,0.2)',
      color: '#a5b4fc',
    }}>
      {label}
    </span>
  );
}

export function DevPerfPanel() {
  const [visible, setVisible] = useState(false);
  const [records, setRecords] = useState(() => getRecords().slice(-20).reverse());

  // Subscribe to ring buffer updates
  useEffect(() => {
    const unsub = subscribe((all) => {
      setRecords([...all].reverse().slice(0, 20));
    });
    return unsub;
  }, []);

  // Keyboard shortcut: Ctrl+Shift+P
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleClear = useCallback(() => {
    clearRecords();
    setRecords([]);
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Open Performance Panel (Ctrl+Shift+P)"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 99999,
          background: 'rgba(10,10,20,0.85)',
          border: '1px solid rgba(99,102,241,0.5)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          color: '#a5b4fc',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        ⚡
      </button>
    );
  }

  return (
    <div style={PANEL_STYLES.panel} role="dialog" aria-label="Performance Panel">
      <div style={PANEL_STYLES.header}>
        <span style={PANEL_STYLES.title}>⚡ PERF PANEL — {records.length} traces</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={PANEL_STYLES.clearBtn} onClick={handleClear}>Clear</button>
          <button
            style={{ ...PANEL_STYLES.clearBtn, background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
            onClick={() => setVisible(false)}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={PANEL_STYLES.tableWrapper}>
        {records.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            No traces yet — navigate to a page to capture timings.
          </div>
        ) : (
          <table style={PANEL_STYLES.table}>
            <thead>
              <tr>
                <th style={PANEL_STYLES.th}>Label</th>
                <th style={PANEL_STYLES.th}>Network</th>
                <th style={PANEL_STYLES.th}>Render</th>
                <th style={PANEL_STYLES.th}>Total</th>
                <th style={PANEL_STYLES.th}>DB (ST)</th>
                <th style={PANEL_STYLES.th}>Cache</th>
                <th style={PANEL_STYLES.th}>Source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ background: r.id % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ ...PANEL_STYLES.td, maxWidth: '140px' }} title={r.label}>
                    {r.label}
                  </td>
                  <td style={{ ...PANEL_STYLES.td, color: msColor(r.network_ms), fontWeight: 600 }}>
                    {formatMs(r.network_ms)}
                  </td>
                  <td style={{ ...PANEL_STYLES.td, color: msColor(r.render_ms), fontWeight: 600 }}>
                    {formatMs(r.render_ms)}
                  </td>
                  <td style={{ ...PANEL_STYLES.td, color: msColor(r.total_ms), fontWeight: 700 }}>
                    {formatMs(r.total_ms)}
                  </td>
                  <td style={{ ...PANEL_STYLES.td, color: r.st_db_ms != null ? msColor(r.st_db_ms) : '#64748b' }}>
                    {r.st_db_ms != null ? formatMs(r.st_db_ms) : '—'}
                  </td>
                  <td style={{ ...PANEL_STYLES.td, color: '#94a3b8' }}>
                    {r.st_cache_ms != null ? formatMs(r.st_cache_ms) : '—'}
                  </td>
                  <td style={PANEL_STYLES.td}>
                    <Pill label={r.cache_source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={PANEL_STYLES.hint}>
        Ctrl+Shift+P to toggle • green &lt;200ms • yellow &lt;500ms • red ≥500ms • DB/Cache from Server-Timing header
      </div>
    </div>
  );
}
