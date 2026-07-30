import { useState, useEffect, useCallback } from 'react';
import { getRecords, clearRecords, subscribe } from '../lib/performanceMonitor';
import { Zap, X, Trash2 } from 'lucide-react';

function msBadgeClass(ms) {
  if (ms < 200) return 'text-emerald-700 font-semibold';
  if (ms < 500) return 'text-amber-700 font-semibold';
  return 'text-rose-700 font-bold';
}

function formatMs(ms) {
  if (ms == null) return '—';
  return `${ms.toFixed(1)}ms`;
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
        title="Open Client Performance Traces (Ctrl+Shift+P)"
        className="fixed bottom-4 right-4 z-[99999] w-10 h-10 rounded-full bg-navy text-gold-pale border border-navy-soft shadow-lg hover:scale-105 transition-all flex items-center justify-center cursor-pointer group"
      >
        <Zap className="w-5 h-5 text-gold-mid group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Performance Panel"
      className="fixed bottom-4 right-4 z-[99999] w-[620px] max-w-[calc(100vw-32px)] max-h-[440px] bg-white/95 backdrop-blur-md border border-stone-deep rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] font-mono text-[11px] text-ink flex flex-col overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-wash border-b border-stone-deep shrink-0">
        <div className="flex items-center gap-2 font-bold text-[12px] text-navy">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>CLIENT TIMING TRACES ({records.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded text-ink-3 hover:text-navy hover:bg-stone-deep/40 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-y-auto flex-1">
        {records.length === 0 ? (
          <div className="py-12 text-center text-ink-4 text-[12px]">
            No client timing traces captured yet. Navigate through the app.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-deep bg-stone-wash/80 text-[10px] font-bold uppercase tracking-wider text-ink-3 sticky top-0">
                <th className="py-1.5 px-3">Request Label</th>
                <th className="py-1.5 px-3">Network</th>
                <th className="py-1.5 px-3">Render</th>
                <th className="py-1.5 px-3">Total</th>
                <th className="py-1.5 px-3">DB (ST)</th>
                <th className="py-1.5 px-3">Cache</th>
                <th className="py-1.5 px-3 text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-mid/60 text-[11px]">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-stone-wash/70 transition-colors">
                  <td className="py-1.5 px-3 font-semibold text-navy max-w-[150px] truncate" title={r.label}>
                    {r.label}
                  </td>
                  <td className={`py-1.5 px-3 ${msBadgeClass(r.network_ms)}`}>
                    {formatMs(r.network_ms)}
                  </td>
                  <td className={`py-1.5 px-3 ${msBadgeClass(r.render_ms)}`}>
                    {formatMs(r.render_ms)}
                  </td>
                  <td className={`py-1.5 px-3 ${msBadgeClass(r.total_ms)}`}>
                    {formatMs(r.total_ms)}
                  </td>
                  <td className="py-2 px-3 text-ink-3">
                    {r.st_db_ms != null ? formatMs(r.st_db_ms) : '—'}
                  </td>
                  <td className="py-2 px-3 text-ink-3">
                    {r.st_cache_ms != null ? formatMs(r.st_cache_ms) : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${
                      r.cache_source === 'HIT' || r.cache_source === 'memory'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-stone-wash border-stone-deep text-ink-3'
                    }`}>
                      {r.cache_source || 'network'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-3 py-1.5 bg-stone-wash border-t border-stone-deep text-[10px] text-ink-4 text-center shrink-0">
        Press <span className="font-bold text-navy">Ctrl+Shift+P</span> to toggle • Timings recorded in browser ring buffer
      </div>
    </div>
  );
}
