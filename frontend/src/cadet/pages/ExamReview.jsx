import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigation } from '../../contexts/NavigationContext';
import { examApi } from '../../api';
import {
  ChevronLeft,
  Award,
  TrendingUp,
  RotateCcw,
  ListChecks,
  ClipboardClock 
} from 'lucide-react';
import SharedExamReview, { getPerf, SkeletonCard } from '../../components/exam/SharedExamReview';

const ExamReview = () => {
  const { examId } = useParams();
  const navigate   = useNavigate();
  const { goBack } = useAppNavigation();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReview = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await examApi.getResultReview(examId);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled) return;
        const status  = err?.response?.status ?? 0;
        const message = err?.response?.data?.error ?? err?.message ?? 'Failed to load review';
        setError({ status, message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReview();
    return () => { cancelled = true; };
  }, [examId]);

  const perf = useMemo(() => data ? getPerf(data.score) : null, [data]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-wash flex flex-col">
        <header className="sticky top-0 z-50 bg-navy px-4 py-3.5 flex items-center gap-3 shadow-lg border-b border-white/10">
          <div className="h-7 w-7 rounded-full bg-white/10 animate-pulse" />
          <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
        </header>
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 space-y-4">
          <div className="rounded-xl border border-stone-deep bg-white p-5 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-32 w-32 rounded-full bg-stone-mid shrink-0" />
              <div className="grid grid-cols-3 gap-3 w-full">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-stone-wash rounded-xl border border-stone-mid" />)}
              </div>
            </div>
          </div>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    const is403 = error.status === 403;
    const is404 = error.status === 404;
    return (
      <div className="min-h-screen bg-stone-wash flex flex-col">
        <header className="sticky top-0 z-50 bg-navy px-4 py-3.5 flex items-center gap-3 shadow-lg border-b border-white/10">
          <button
            onClick={() => goBack('/cadet/results')}
            className="flex items-center gap-1.5 rounded-r px-3 py-1.5 font-ui text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} /> Back
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-stone p-5 mb-5 text-navy">
            <ClipboardClock size={36} />
          </div>
          <h2 className="font-display text-xl sm:text-2xl text-ink font-bold mb-2">
            {is403 ? 'Review Not Available' : is404 ? 'Exam Not Found' : 'Under Evaluation'}
          </h2>
          <p className="font-ui text-[13px] sm:text-[14px] text-ink-3 max-w-xs mb-6 leading-relaxed">
            {is403
              ? error.message || 'Results for this exam are not yet published.'
              : is404
              ? 'We could not locate this exam or your attempt.'
              : error.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={() => goBack('/cadet/results')}
              className="flex-1 flex items-center justify-center gap-2 rounded-r border border-stone-deep bg-white px-5 py-3 font-ui text-[13px] font-bold text-ink-3 hover:bg-stone-wash transition-all cursor-pointer"
            >
              <ChevronLeft size={15} /> Back to Results
            </button>
            {!is403 && !is404 && (
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 rounded-r bg-navy px-5 py-3 font-ui text-[13px] font-bold text-white hover:bg-navy-mid transition-all cursor-pointer"
              >
                <RotateCcw size={13} /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { examTitle, correct, total } = data;

  return (
    <div className="min-h-screen bg-stone-wash flex flex-col">
      {/* ══ Sticky header ══ */}
      <header className="sticky top-0 z-50 bg-navy px-4 py-3 sm:py-3.5 shadow-lg border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => goBack('/cadet/results')}
            className="flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
            id="review-back-btn"
            aria-label="Back to results"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-[14px] sm:text-[15px] text-[#F4F0E4] font-bold truncate max-w-[160px] xs:max-w-[200px] sm:max-w-sm">
              {examTitle}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/40 leading-none mt-0.5">
              Answer Review
            </span>
          </div>
        </div>
        <span className={`flex-shrink-0 flex items-center gap-1 rounded-full border px-2 sm:px-3 py-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${perf.bg} ${perf.text} ${perf.border}`}>
          <Award size={10} />
          <span className="hidden xs:inline">{perf.label}</span>
          <span className="xs:hidden">{data.score}%</span>
        </span>
      </header>

      {/* ══ Body ══ */}
      <SharedExamReview data={data} context="cadet" />

      {/* ══ Sticky footer ══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-deep bg-white/96 backdrop-blur-md shadow-[0_-4px_20px_rgba(26,39,68,0.1)]">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 rounded-r bg-stone-wash border border-stone-deep px-2.5 py-1.5">
              <ListChecks size={13} className="text-navy shrink-0" />
              <span className="font-mono text-[12px] font-bold text-ink whitespace-nowrap">
                {correct}/{total}
              </span>
            </div>
            <span className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${perf.bg} ${perf.text} ${perf.border}`}>
              {perf.label}
            </span>
            <span className={`sm:hidden font-mono text-[10px] font-bold uppercase tracking-wider ${perf.text} truncate`}>
              {perf.label}
            </span>
          </div>
          <button
            onClick={() => goBack('/cadet/results')}
            className="flex items-center gap-1.5 rounded-r bg-navy px-3 sm:px-5 py-2.5 font-ui text-[12px] sm:text-[13px] font-bold text-[#F4F0E4] hover:bg-navy-mid active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            id="review-footer-back-btn"
            style={{ minHeight: 40 }}
          >
            <TrendingUp size={13} />
            <span className="hidden sm:inline">All Results</span>
            <span className="sm:hidden">Results</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ExamReview;
