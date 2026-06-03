import React, { useEffect, useState } from 'react';
import { examApi } from '../../api';
import { 
  Award, 
  Calendar, 
  TrendingUp,
  FileText,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCachedResource, getOrFetchResource } from '../../lib/resourceCache';
import { useAuth } from '../hooks/useAuth';

const CadetResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const userKey = user?.id || user?.regimentalNumber || user?.email || 'current';
    const cacheKey = `cadet-results:${userKey}`;
    const cached = getCachedResource(cacheKey);

    if (cached) {
      setResults(cached.results || []);
      setLoading(false);
    }

    const fetchResults = async () => {
      try {
        const data = await getOrFetchResource(
          cacheKey,
          async () => {
            const response = await examApi.getResults();
            return { results: response?.data?.results || [] };
          },
          { staleTimeMs: 2 * 60 * 1000 }
        );
        if (!cancelled) setResults(data.results || []);
      } catch (error) {
        if (!cancelled && error.status !== 401) {
          console.error('Failed to fetch results:', error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => { cancelled = true; };
  }, [user]);

  const getPerformanceTag = (score) => {
    if (score >= 80) return { label: 'Distinction', class: 'distinction' };
    if (score >= 60) return { label: 'First Class', class: 'first' };
    if (score >= 40) return { label: 'Pass', class: 'pass' };
    return { label: 'Fail', class: 'fail' };
  };

  const perfBadge = (cls) => {
    if (cls === 'distinction') return 'bg-gold-wash text-gold-deep border-gold-pale';
    if (cls === 'first')       return 'bg-olive-wash text-olive-mid border-olive-pale';
    if (cls === 'pass')        return 'bg-stone-wash text-ink-3 border-stone-deep';
    return 'bg-crimson/10 text-crimson border-crimson/20';
  };

  return (
    <>
      <header className="mb-8 sm:mb-12">
        <div className="mb-2 font-mono text-[9px] tracking-[0.18em] text-olive-soft uppercase">Performance Records</div>
        <h1 className="font-display text-3xl sm:text-5xl text-ink leading-tight">Examination History</h1>
      </header>

      {/* ── Performance overview stats ── */}
      <section className="mb-6 sm:mb-10 grid grid-cols-3 gap-2 sm:gap-4">
        {/* Average score */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 rounded-xl border border-stone-deep bg-white p-3 sm:p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-sm bg-navy-wash text-navy">
            <TrendingUp size={16} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
          </div>
          <div className="text-center sm:text-left">
            <span className="block font-mono text-[8px] sm:text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-0.5 sm:mb-1">Avg Score</span>
            <span className="font-display text-2xl sm:text-3xl font-medium text-ink leading-none">
              {results.length > 0
                ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
                : 0}%
            </span>
          </div>
        </div>

        {/* Exams completed */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 rounded-xl border border-stone-deep bg-white p-3 sm:p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-sm bg-olive-wash text-olive-mid">
            <CheckCircle2 size={16} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
          </div>
          <div className="text-center sm:text-left">
            <span className="block font-mono text-[8px] sm:text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-0.5 sm:mb-1">Completed</span>
            <span className="font-display text-2xl sm:text-3xl font-medium text-ink leading-none">{results.length}</span>
          </div>
        </div>

        {/* Rank */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 rounded-xl border border-stone-deep bg-white p-3 sm:p-5 shadow-[0_4px_16px_rgba(26,39,68,0.02)]">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-sm bg-gold-wash text-gold-deep">
            <Award size={16} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
          </div>
          <div className="text-center sm:text-left">
            <span className="block font-mono text-[8px] sm:text-[9px] font-bold tracking-widest text-ink-4 uppercase mb-0.5 sm:mb-1">Rank</span>
            <span className="font-display text-base sm:text-2xl font-medium text-ink leading-tight block">
              {results.length > 0 ? getPerformanceTag(results[0]?.score || 0).label : 'Unranked'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Result transcript ── */}
      <section className="rounded-xl border border-stone-deep bg-white shadow-[0_4px_16px_rgba(26,39,68,0.02)] overflow-hidden">
        <div className="border-b border-stone-mid bg-stone-wash/30 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="h-5 sm:h-6 w-1 bg-navy rounded-full"></div>
            <h2 className="font-display text-xl sm:text-2xl text-navy">Result Transcript</h2>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex h-[260px] sm:h-[300px] flex-col items-center justify-center gap-4 text-ink-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-deep border-t-navy"></div>
            <span className="font-mono text-[10px] uppercase tracking-widest">Fetching Results...</span>
          </div>

        ) : results.length > 0 ? (
          <>
            {/* ── Desktop table (md+) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-wash border-b border-stone-deep">
                    <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Exam Title</th>
                    <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Date</th>
                    <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Score</th>
                    <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Status</th>
                    <th className="px-6 py-4 font-mono text-[10px] tracking-widest text-ink-4 uppercase font-medium">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(res => {
                    const perf = getPerformanceTag(res.score);
                    return (
                      <tr key={res.id} className="border-b border-stone-mid transition-colors hover:bg-stone-wash/40 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 font-ui text-[14px] font-medium text-ink group-hover:text-navy">
                            <FileText size={15} className="text-ink-4 shrink-0" />
                            <span className="truncate max-w-[220px]">{res.exam?.title ?? res.examTitle ?? 'Untitled Exam'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3 whitespace-nowrap">
                            <Calendar size={12} className="text-ink-4" />
                            {new Date(res.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[14px] font-bold text-navy">{res.score}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border ${perfBadge(perf.class)}`}>
                            {perf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/exam/review/${res.examId}`)}
                            className="flex items-center gap-1.5 rounded-r border border-navy/30 bg-navy-wash px-3 py-1.5 font-ui text-[12px] font-bold text-navy hover:bg-navy hover:text-white active:scale-95 cursor-pointer transition-all whitespace-nowrap"
                            id={`review-btn-${res.examId}`}
                          >
                            <ClipboardList size={12} /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card list (< md) ── */}
            <div className="md:hidden divide-y divide-stone-mid">
              {results.map(res => {
                const perf = getPerformanceTag(res.score);
                return (
                  <div key={res.id} className="px-4 py-4 flex items-center gap-3 hover:bg-stone-wash/40 transition-colors">
                    {/* Score circle */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center h-13 w-13 rounded-full border-2 border-navy-wash bg-navy/5 text-center" style={{ width: 52, height: 52 }}>
                      <span className="font-mono text-[14px] font-bold text-navy leading-none">{res.score}%</span>
                    </div>

                    {/* Middle: title + date + badge */}
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-[14px] font-semibold text-ink truncate">
                        {res.exam?.title ?? res.examTitle ?? 'Untitled Exam'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono text-[10px] text-ink-4">
                          {new Date(res.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border ${perfBadge(perf.class)}`}>
                          {perf.label}
                        </span>
                      </div>
                    </div>

                    {/* Review CTA — full tap area on right */}
                    <button
                      onClick={() => navigate(`/exam/review/${res.examId}`)}
                      className="flex-shrink-0 flex items-center gap-1 rounded-r border border-navy/30 bg-navy-wash px-2.5 py-2 font-ui text-[11px] font-bold text-navy hover:bg-navy hover:text-white active:scale-95 cursor-pointer transition-all"
                      id={`review-btn-mobile-${res.examId}`}
                      style={{ minHeight: 40 }}
                    >
                      <ClipboardList size={13} />
                      <ChevronRight size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>

        ) : (
          <div className="flex h-[260px] sm:h-[300px] flex-col items-center justify-center text-center px-4">
            <div className="mb-4 rounded-full bg-stone-wash p-5 sm:p-6 text-ink-4/30">
              <Award size={36} strokeWidth={1.5} />
            </div>
            <p className="font-display text-xl sm:text-2xl text-ink font-medium">No Records Found</p>
            <p className="mt-2 font-ui text-[13px] sm:text-[14px] text-ink-4 max-w-[260px] sm:max-w-[280px]">
              Complete your first exam to see your performance record here.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

export default CadetResults;
