import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi } from '../../api';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Award,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  ListChecks,
  Target,
} from 'lucide-react';

/* ─── Score ring ─────────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 136 }) {
  const clamped = Math.min(100, Math.max(0, score));
  const angle   = Math.round((clamped / 100) * 360);

  const ringColor =
    clamped >= 80 ? '#B8860B' :
    clamped >= 60 ? '#5A5E3E' :
    clamped >= 40 ? '#4A6090' :
    '#8B1A1A';

  const thickness = 12;

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${ringColor} ${angle}deg, #E8E4D8 ${angle}deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: thickness,
      }}
    >
      <div
        style={{
          width: size - thickness * 2, height: size - thickness * 2,
          borderRadius: '50%', background: '#FDFCF8',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}
      >
        <span style={{
          fontFamily: 'Noto Sans Mono, monospace',
          fontSize: size * 0.225, fontWeight: 700, color: ringColor, lineHeight: 1,
        }}>
          {score}%
        </span>
        <span style={{
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: size * 0.09, color: '#9A9A8E',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Score
        </span>
      </div>
    </div>
  );
}

/* ─── Performance config ─────────────────────────────────────────────────── */
function getPerf(score) {
  if (score >= 80) return { label: 'Distinction', bg: 'bg-gold-wash',    text: 'text-gold-deep',  border: 'border-gold-pale' };
  if (score >= 60) return { label: 'First Class', bg: 'bg-olive-wash',   text: 'text-olive-mid',  border: 'border-olive-pale' };
  if (score >= 40) return { label: 'Pass',        bg: 'bg-navy-wash',    text: 'text-navy-soft',  border: 'border-navy-pale' };
  return            { label: 'Fail',       bg: 'bg-crimson-wash', text: 'text-crimson',    border: 'border-crimson/30' };
}

/* ─── Skeleton card ──────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-stone-deep bg-white p-4 sm:p-6 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 rounded-full bg-stone-mid shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-mid rounded w-4/5" />
          <div className="h-3 bg-stone-wash rounded w-1/2" />
          <div className="space-y-2 mt-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-11 bg-stone-wash rounded-lg border border-stone-mid" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Per-question card ──────────────────────────────────────────────────── */
function QuestionCard({ item, index }) {
  const { question, options, correctAnswer, studentAnswer, isCorrect, isSkipped } = item;

  const statusConfig = isCorrect
    ? { label: 'Correct (+1)',   bg: 'bg-emerald-50',   border: 'border-emerald-200', iconClass: 'text-emerald-600', chipBg: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    : isSkipped
    ? { label: 'Skipped (0)',   bg: 'bg-stone-wash',   border: 'border-stone-deep',  iconClass: 'text-ink-4',       chipBg: 'bg-stone-mid text-ink-3 border-stone-deep' }
    : { label: 'Incorrect (-1)', bg: 'bg-crimson-wash',  border: 'border-crimson/20', iconClass: 'text-crimson',     chipBg: 'bg-crimson-wash text-crimson border-crimson/30' };

  const StatusIcon = isCorrect ? CheckCircle2 : isSkipped ? MinusCircle : XCircle;

  return (
    <div className={`rounded-xl border ${statusConfig.border} ${statusConfig.bg} overflow-hidden`}>

      {/* ── Question header ── */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-inherit">
        {/* Status chip — top-right on mobile via flex-wrap */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Question number bubble */}
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-stone-deep font-mono text-[10px] sm:text-[11px] font-bold text-ink-3 shadow-sm mt-0.5">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <p className="font-ui text-[14px] sm:text-[15px] font-medium text-ink leading-snug">
              {question}
            </p>
          </div>
          {/* Status chip */}
          <span className={`flex-shrink-0 self-start flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${statusConfig.chipBg}`}>
            <StatusIcon size={10} className={statusConfig.iconClass} />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* ── Options ── */}
      <div className="flex flex-col gap-2 px-4 py-3 sm:px-5 sm:py-4">
        {options.map((opt, i) => {
          const isTheCorrect  = opt === correctAnswer;
          const isStudentPick = opt === studentAnswer;

          let optClass    = 'border-stone-mid bg-white text-ink-3';
          let indicator   = null;

          if (isTheCorrect && isStudentPick && isCorrect) {
            optClass  = 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]';
            indicator = <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />;
          } else if (isTheCorrect && !isStudentPick) {
            optClass  = 'border-emerald-300 bg-emerald-50/70 text-emerald-700';
            indicator = <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />;
          } else if (isStudentPick && !isCorrect) {
            optClass  = 'border-crimson/40 bg-crimson-wash text-crimson shadow-[0_0_0_1px_rgba(139,26,26,0.1)]';
            indicator = <XCircle size={15} className="text-crimson shrink-0" />;
          }

          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 ${optClass}`}
              style={{ minHeight: 44 }} // WCAG minimum touch target
            >
              <span className="flex-shrink-0 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border border-current/20 font-mono text-[11px] font-bold opacity-60">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-ui text-[13.5px] sm:text-[14px] font-medium flex-1 leading-snug">{opt}</span>
              {indicator}
            </div>
          );
        })}

        {isSkipped && (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-4 flex items-center gap-1.5">
            <MinusCircle size={10} /> You did not answer this question
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Stat mini-card ─────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, count, label, bg, border, iconCls, textCls }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border ${border} ${bg} py-4 px-1 sm:py-5 sm:px-2 text-center`}>
      <Icon size={20} className={`sm:w-[22px] sm:h-[22px] ${iconCls}`} />
      <span className={`font-mono text-xl sm:text-2xl font-bold leading-none ${textCls}`}>{count}</span>
      <span className={`font-ui text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${iconCls} opacity-80`}>{label}</span>
    </div>
  );
}

/* ─── Main ExamReview ────────────────────────────────────────────────────── */
const ExamReview = () => {
  const { examId } = useParams();
  const navigate   = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('all');

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

  const questionsWithIndex = useMemo(() => {
    if (!data?.questions) return [];
    return data.questions.map((q, i) => ({ ...q, originalIndex: i }));
  }, [data?.questions]);

  const filteredQuestions = useMemo(() => {
    return questionsWithIndex.filter(q => {
      if (filter === 'all') return true;
      if (filter === 'correct') return q.isCorrect;
      if (filter === 'skipped') return q.isSkipped;
      if (filter === 'incorrect') return !q.isCorrect && !q.isSkipped;
      return true;
    });
  }, [questionsWithIndex, filter]);

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
            onClick={() => navigate('/cadet/results')}
            className="flex items-center gap-1.5 rounded-r px-3 py-1.5 font-ui text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} /> Back
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-crimson-wash p-5 mb-5 text-crimson">
            <AlertCircle size={36} />
          </div>
          <h2 className="font-display text-xl sm:text-2xl text-ink font-bold mb-2">
            {is403 ? 'Review Not Available' : is404 ? 'Exam Not Found' : 'Something Went Wrong'}
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
              onClick={() => navigate('/cadet/results')}
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

  const { examTitle, score, correct, incorrect, skipped, total, submittedAt, questions } = data;

  return (
    <div className="min-h-screen bg-stone-wash flex flex-col">

      {/* ══ Sticky header ══ */}
      <header className="sticky top-0 z-50 bg-navy px-4 py-3 sm:py-3.5 shadow-lg border-b border-white/10 flex items-center justify-between shrink-0">
        {/* Left: back + title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/cadet/results')}
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
        {/* Right: performance badge */}
        <span className={`flex-shrink-0 flex items-center gap-1 rounded-full border px-2 sm:px-3 py-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${perf.bg} ${perf.text} ${perf.border}`}>
          <Award size={10} />
          <span className="hidden xs:inline">{perf.label}</span>
          {/* On very small screens show score instead of label */}
          <span className="xs:hidden">{score}%</span>
        </span>
      </header>

      {/* ══ Body ══ */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-6 pb-24 space-y-4">

        {/* ════ STATS HERO ════ */}
        <section className="rounded-xl border border-stone-deep bg-white shadow-[0_4px_24px_rgba(26,39,68,0.06)] overflow-hidden">

          {/* Banner */}
          <div className="bg-navy px-4 py-2.5 flex items-center gap-2">
            <Target size={13} className="text-white/50" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Performance Summary</span>
          </div>

          {/* Hero content — stacked on mobile, side-by-side on sm+ */}
          <div className="p-4 sm:p-6">

            {/* Ring + title row (mobile: ring centred + title below; sm: ring left + stats right) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-5">

              {/* Score ring — smaller on mobile */}
              <div className="flex flex-col items-center gap-2 shrink-0 self-center">
                <div className="sm:hidden">
                  <ScoreRing score={score} size={116} />
                </div>
                <div className="hidden sm:block">
                  <ScoreRing score={score} size={140} />
                </div>
              </div>

              {/* Title + meta + badge */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider mb-2 ${perf.bg} ${perf.text} ${perf.border}`}>
                  <Award size={10} /> {perf.label}
                </span>
                <p className="font-display text-[17px] sm:text-xl text-ink font-bold leading-snug truncate">
                  {examTitle}
                </p>
                <p className="font-mono text-[10px] text-ink-4 tracking-wider uppercase mt-1">
                  Submitted · {new Date(submittedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
              <StatCard
                icon={CheckCircle2} count={correct}   label="Correct"
                bg="bg-emerald-50"   border="border-emerald-200"
                iconCls="text-emerald-600" textCls="text-emerald-700"
              />
              <StatCard
                icon={XCircle}      count={incorrect} label="Incorrect"
                bg="bg-crimson-wash" border="border-crimson/20"
                iconCls="text-crimson"     textCls="text-crimson"
              />
              <StatCard
                icon={MinusCircle}  count={skipped}   label="Skipped"
                bg="bg-stone-wash"  border="border-stone-deep"
                iconCls="text-ink-4"       textCls="text-ink-3"
              />
              <StatCard
                icon={AlertCircle}  count={incorrect > 0 ? `-${incorrect}` : "0"} label="-ve Marks"
                bg="bg-orange-50"  border="border-orange-200"
                iconCls="text-orange-600"       textCls="text-orange-700"
              />
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-4">
                <span>Breakdown</span>
                <span>{correct}/{total} correct</span>
              </div>
              <div className="flex h-2 sm:h-2.5 w-full rounded-full overflow-hidden bg-stone-mid">
                {correct   > 0 && <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(correct   / total) * 100}%` }} />}
                {incorrect > 0 && <div className="bg-crimson    transition-all duration-700" style={{ width: `${(incorrect / total) * 100}%` }} />}
                {skipped   > 0 && <div className="bg-stone-deep  transition-all duration-700" style={{ width: `${(skipped   / total) * 100}%` }} />}
              </div>
              <div className="flex gap-3 font-mono text-[9px] uppercase tracking-wider text-ink-4">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Correct</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-crimson    inline-block" />Wrong</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-stone-deep  inline-block" />Skipped</span>
              </div>
            </div>

            {/* Penalty Explanation */}
            {incorrect > 0 && (
              <div className="mt-4 bg-crimson-wash border border-crimson/20 rounded-lg p-3 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-crimson shrink-0 mt-0.5" />
                <p className="font-ui text-[12px] sm:text-[13px] text-crimson leading-snug">
                  <strong>Negative Marking Applied:</strong> {incorrect} incorrect answer{incorrect > 1 ? 's' : ''} resulted in a penalty of {incorrect} mark{incorrect > 1 ? 's' : ''} deducted from your raw score.
                </p>
              </div>
            )}

          </div>
        </section>

        {/* ════ QUESTION BREAKDOWN ════ */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 bg-navy rounded-full" />
              <h2 className="font-display text-lg sm:text-xl text-navy">Question Breakdown</h2>
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink-4 bg-stone-wash border border-stone-deep rounded-full px-2 py-0.5">
                {filteredQuestions.length} / {total} Qs
              </span>
            </div>
            
            <div className="flex bg-stone-wash p-1 rounded-lg border border-stone-deep inline-flex self-start sm:self-auto overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
              <button 
                onClick={() => setFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all ${filter === 'all' ? 'bg-white text-navy shadow-sm' : 'text-ink-4 hover:text-ink'}`}
              >
                ALL
              </button>
              <button 
                onClick={() => setFilter('correct')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all ${filter === 'correct' ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-ink-4 hover:text-ink'}`}
              >
                CORRECT
              </button>
              <button 
                onClick={() => setFilter('incorrect')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all ${filter === 'incorrect' ? 'bg-white text-crimson shadow-sm border border-crimson/10' : 'text-ink-4 hover:text-ink'}`}
              >
                INCORRECT
              </button>
              <button 
                onClick={() => setFilter('skipped')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all ${filter === 'skipped' ? 'bg-white text-ink-3 shadow-sm border border-stone-3' : 'text-ink-4 hover:text-ink'}`}
              >
                SKIPPED
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="text-center p-8 bg-stone-wash border border-stone-deep rounded-xl font-ui text-[14px] text-ink-4">
                No questions found matching this filter.
              </div>
            ) : (
              filteredQuestions.map((item) => (
                <QuestionCard key={item.questionId} item={item} index={item.originalIndex} />
              ))
            )}
          </div>
        </section>

      </main>

      {/* ══ Sticky footer ══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-deep bg-white/96 backdrop-blur-md shadow-[0_-4px_20px_rgba(26,39,68,0.1)]">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">

          {/* Score pill */}
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
            {/* Mobile-only inline perf text */}
            <span className={`sm:hidden font-mono text-[10px] font-bold uppercase tracking-wider ${perf.text} truncate`}>
              {perf.label}
            </span>
          </div>

          {/* Back to results */}
          <button
            onClick={() => navigate('/cadet/results')}
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
