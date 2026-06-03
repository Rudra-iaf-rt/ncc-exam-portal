import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi } from '../../api';
import { useExamAutoSave } from '../hooks/useExamAutoSave';
import { 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
  Maximize,
  Monitor
} from 'lucide-react';
import { useProctoring } from '../hooks/useProctoring';

const ExamAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQuestionGridModal, setShowQuestionGridModal] = useState(false);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  // syncStatus: 'idle' | 'saving' | 'saved' | 'error'
  // Start as 'idle' so no badge shows before the first save attempt.
  const { syncStatus, queueSave } = useExamAutoSave(Number(id));

  const {
    isFullscreen,
    isScreenSharing,
    warningCount,
    lastViolationType,
    showWarning,
    setShowWarning,
    requestFullscreen,
    requestScreenShare,
    setExamId: setProctoringExamId,
  } = useProctoring({
    onSecurityBreach: (terminate) => {
      if (terminate) {
        toast.error('Session Terminated: Multiple security breaches detected.');
        executeSubmit();
      }
    }
  });

  useEffect(() => {
    startExam();
  }, [id]);

  const startExam = async () => {
    try {
      const { data } = await examApi.startAttempt(id);
      if (data) {
        setExam(data.exam);
        setAttemptId(data.attemptId);
        setProctoringExamId(Number(id)); 
        setTimeLeft(data.remainingSeconds ?? data.exam.duration * 60);

        if (data.answers && data.answers.length > 0) {
          const ansMap = {};
          data.answers.forEach(a => { ansMap[a.questionId] = a.selectedAnswer; });
          setAnswers(ansMap);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to start exam session');
      navigate('/cadet/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !isFullscreen || !isScreenSharing) return;
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmit(); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isFullscreen, isScreenSharing]);

  const handleSelect = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    queueSave(questionId, option, currentQ);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    
    setIsSubmitting(true);
    const answerList = Object.entries(answersRef.current).map(([qId, val]) => ({
      questionId: Number(qId),
      selectedAnswer: val,
    }));

    try {
      await examApi.submitAttempt({ examId: Number(id), answers: answerList });
      toast.success('Exam submitted successfully.');
      // Redirect to review page for immediate per-question feedback
      navigate(`/exam/review/${id}`);
    } catch (error) {
      toast.error(error.message || 'Critical error during exam submission');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-stone text-navy">
      <Loader2 className="mb-6 animate-spin" size={48} />
      <p className="font-mono text-sm uppercase tracking-widest">Initializing Secure Session...</p>
    </div>
  );

  // STEP 1: Screen Share (Transmission)
  if (!isScreenSharing) return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/95 backdrop-blur-md p-6">
      <div className="w-full max-w-md rounded-rl border border-white/20 bg-white p-10 text-center shadow-2xl">
        <Monitor size={64} className="mx-auto mb-6 text-navy" />
        <h2 className="mb-4 font-display text-3xl text-navy">Screen Share Required</h2>
        <p className="mb-8 font-ui text-ink-3">Live screen sharing is mandatory for this assessment. Please share your <b>Entire Screen</b> to activate the exam console.</p>
        <button 
          onClick={requestScreenShare}
          className="w-full rounded-r bg-navy py-4 font-ui font-bold text-white shadow-lg transition-all hover:bg-navy-mid active:scale-95"
        >
          START SHARING SCREEN
        </button>
      </div>
    </div>
  );

  // STEP 2: Fullscreen (Secure Perimeter)
  if (!isFullscreen) return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/95 backdrop-blur-md p-6">
      <div className="w-full max-w-md rounded-rl border border-white/20 bg-white p-10 text-center shadow-2xl">
        <Maximize size={64} className="mx-auto mb-6 text-navy" />
        <h2 className="mb-4 font-display text-3xl text-navy">Secure Mode Required</h2>
        <p className="mb-8 font-ui text-ink-3">To maintain the integrity of this evaluation, the environment must be locked in fullscreen mode. This prevents unauthorized system access during the session.</p>
        <button 
          onClick={requestFullscreen}
          className="w-full rounded-r bg-navy py-4 font-ui font-bold text-white shadow-lg transition-all hover:bg-navy-mid active:scale-95"
        >
          ENABLE FULLSCREEN MODE
        </button>
      </div>
    </div>
  );

  if (showWarning) return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4 sm:p-6 text-ink animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-rl border border-stone-deep bg-white p-6 sm:p-10 text-center shadow-2xl animate-in zoom-in-95 duration-250">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500 animate-bounce">
          <AlertCircle size={32} />
        </div>
        
        <h2 className="mb-3 font-display text-2xl text-navy font-bold">Stay in the Exam Window</h2>
        
        <p className="mb-6 font-ui text-[14.5px] leading-relaxed text-ink-2">
          {lastViolationType === 'TAB_SWITCH' && "You switched to another window or tab. The system noticed you navigated away."}
          {lastViolationType === 'FULLSCREEN_EXIT' && "You exited fullscreen mode. The exam requires fullscreen to continue."}
          {lastViolationType === 'SCREEN_STOP' && "You stopped sharing your screen. Screen sharing is required to proctor the exam."}
          {lastViolationType === 'FOCUS_LOSS' && "The exam window lost focus. This happens when you click outside the exam."}
          {lastViolationType === 'MOUSE_LEAVE' && "Your cursor moved outside the secure exam area."}
          {!lastViolationType && "A system violation was detected."}
          {" To ensure fairness, please keep your focus solely on the exam."}
        </p>

        <div className="mb-8 flex flex-col items-center justify-center rounded-r bg-stone-wash p-4 border border-stone-deep">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-2">Current Warnings</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <div 
                key={num}
                className={`h-2.5 w-12 rounded-full transition-all duration-300 ${
                  num <= warningCount ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]' : 'bg-stone-deep'
                }`}
              />
            ))}
          </div>
          <span className="mt-2.5 font-ui text-sm font-bold text-rose-500">
            {warningCount === 0 ? '0 of 3 Warnings' : `${warningCount} of 3 Warnings`}
          </span>
          <span className="mt-1 font-ui text-[11px] text-ink-4">
            At 3 warnings, your exam is auto-submitted.
          </span>
        </div>

        <button 
          onClick={() => setShowWarning(false)}
          className="w-full rounded-r bg-navy py-3.5 font-ui font-bold text-[#F4F0E4] shadow-lg transition-all hover:bg-navy-mid active:scale-95 cursor-pointer"
        >
          Return to Exam
        </button>
      </div>
    </div>
  );

  const q = exam.questions[currentQ];

  return (
    <div className="flex h-screen flex-col bg-stone-wash">
      {/* Redesigned Responsive Header */}
      <header className="z-[100] sticky top-0 flex items-center justify-between bg-navy px-4 sm:px-8 py-3.5 shadow-lg border-b border-white/10 shrink-0">
        {/* Left Section: Title & Status Pills */}
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="font-display text-[15px] sm:text-lg text-[#F4F0E4] font-bold truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
            {exam.title}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Proctoring Status Pill */}
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all duration-300 ${
              warningCount === 0 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
              warningCount < 2 ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 animate-pulse' :
              'bg-rose-500/10 border-rose-500/25 text-rose-400 animate-bounce'
            }`}>
              <ShieldCheck size={11} className={warningCount >= 2 ? 'animate-pulse' : ''} />
              <span>{warningCount === 0 ? '0 Violations' : `${warningCount} of 3 Warnings`}</span>
            </div>

            {/* Network Auto-Save status Pill */}
            {syncStatus && syncStatus !== 'idle' && (
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all duration-300 ${
                syncStatus === 'saving' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 
                syncStatus === 'saved' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 
                'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {syncStatus === 'saving' ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : syncStatus === 'saved' ? (
                  <ShieldCheck size={10} />
                ) : (
                  <AlertTriangle size={10} />
                )}
                <span>
                  {syncStatus === 'saving' ? 'Saving' : 
                   syncStatus === 'saved' ? 'Saved' : 
                   'Sync Error'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section: Time & Submit */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className={`flex items-center gap-2 rounded-r px-2.5 sm:px-4 py-1.5 sm:py-2 font-mono text-sm sm:text-base md:text-lg font-bold border transition-all duration-300 ${
            timeLeft < 300 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
              : 'bg-white/10 border border-white/20 text-white'
          }`}>
            <Clock size={16} className="sm:size-5" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button 
            onClick={() => setShowConfirmModal(true)} 
            className="flex items-center gap-1.5 rounded-r bg-white px-3 sm:px-5 py-1.5 sm:py-2 font-ui text-[12px] sm:text-[14px] font-bold text-navy transition-all hover:bg-navy-pale active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            disabled={isSubmitting}
          >
            <span className="hidden xs:inline">{isSubmitting ? 'Finalizing...' : 'Submit'}</span>
            <span className="xs:hidden">{isSubmitting ? '...' : 'Submit'}</span>
            <Send size={13} className="sm:size-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-1 flex-row overflow-hidden relative">
        
        {/* Desktop Sidebar (lg and above only) */}
        <aside className="hidden lg:flex flex-col gap-6 border-r border-stone-deep bg-white p-8 overflow-y-auto w-[300px] shrink-0">
          <div>
            <h3 className="mb-4 font-ui text-[11px] font-bold uppercase tracking-wider text-ink-4">Exam Progress</h3>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((_, idx) => {
                const isActive = currentQ === idx;
                const isAnswered = answers[exam.questions[idx].id];
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQ(idx)}
                    disabled={isSubmitting}
                    className={`aspect-square rounded-r border font-ui text-[13.5px] font-semibold transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none ${
                      isActive ? 'bg-white text-navy font-bold ring-2 ring-navy ring-offset-2 border-navy shadow-sm' : 
                      isAnswered ? 'bg-navy text-white font-bold border-navy' : 
                      'bg-stone-wash border-stone-deep text-ink-3 hover:bg-white hover:border-navy-pale'
                    }`}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Navigation Legend */}
          <div className="mt-auto border-t border-dashed border-stone-deep pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3.5 w-3.5 rounded-r bg-navy shadow-sm"></span>
                <span className="font-ui font-medium">Completed</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3.5 w-3.5 rounded-r border-2 border-navy bg-navy-wash"></span>
                <span className="font-ui font-medium">Active</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3.5 w-3.5 rounded-r border border-stone-deep bg-stone-wash"></span>
                <span className="font-ui font-medium">Unvisited</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Question Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto p-4 lg:p-8">
          
          {/* Question Card */}
          <div className="w-full flex-1 rounded-rl border border-stone-deep bg-white p-5 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="mb-6 sm:mb-8 flex items-center justify-between">
              <span className="font-ui text-[11px] font-bold tracking-wider uppercase text-navy-soft">
                Question {(currentQ + 1).toString().padStart(2, '0')} of {exam.questions.length.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2 rounded-full bg-stone-wash px-3 py-1 text-[11px] font-semibold text-ink-4 border border-stone-deep/40">
                <ShieldCheck size={12} className="text-olive-soft" />
                <span className="font-ui uppercase tracking-wide">Exam Session Secure</span>
              </div>
            </div>
            
            <p className="mb-8 sm:mb-10 font-display text-xl sm:text-2xl leading-relaxed text-ink font-medium">
              {q.question}
            </p>

            {/* Answer Options */}
            <div className="flex flex-col gap-3.5">
              {q.options.map((opt, i) => (
                <label 
                  key={i} 
                  className={`flex cursor-pointer items-center gap-4 rounded-r border p-4 transition-all duration-200 transform hover:translate-x-0.5 ${
                    answers[q.id] === opt 
                      ? 'border-navy bg-navy-wash/75 shadow-sm' 
                      : 'border-stone-deep bg-white hover:border-navy-soft hover:bg-stone-wash'
                  } ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => handleSelect(q.id, opt)}
                    disabled={isSubmitting}
                  />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-ui text-[13.5px] font-bold transition-all duration-200 ${
                    answers[q.id] === opt ? 'border-navy bg-navy text-[#F4F0E4] shadow-sm' : 'border-stone-deep bg-white text-ink-3'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-ui text-[16px] text-ink-2 font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Previous / Next Actions */}
          <div className="mt-5 sm:mt-6 flex w-full justify-between gap-4">
            <button 
              disabled={currentQ === 0 || isSubmitting}
              onClick={() => setCurrentQ(prev => prev - 1)}
              className="flex items-center gap-2 rounded-r border border-stone-deep bg-white px-5 sm:px-8 py-3 font-ui text-[13px] sm:text-[14px] font-bold text-navy transition-all hover:bg-stone-wash active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={18} /> PREVIOUS
            </button>
            <button 
              disabled={currentQ === exam.questions.length - 1 || isSubmitting}
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="flex items-center gap-2 rounded-r bg-navy px-6 sm:px-10 py-3 font-ui text-[13px] sm:text-[14px] font-bold text-[#F4F0E4] transition-all hover:bg-navy-mid active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              NEXT <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Summary and Grid Button */}
      <div className="lg:hidden shrink-0 border-t border-stone-deep bg-white px-4 py-3 shadow-2xl flex items-center justify-between z-50">
        <div className="flex flex-col">
          <span className="font-ui text-[10px] font-bold uppercase tracking-wider text-ink-4">Progress</span>
          <span className="font-ui text-[14px] font-bold text-navy">
            {Object.keys(answers).length} of {exam.questions.length} Answered
          </span>
        </div>
        
        <button 
          onClick={() => setShowQuestionGridModal(true)}
          disabled={isSubmitting}
          className="flex items-center gap-2.5 rounded-r border border-stone-deep bg-stone-wash px-3.5 py-2 font-ui text-[13px] font-bold text-navy hover:bg-stone-deep/20 transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          <span>Questions</span>
          <span className="flex items-center justify-center bg-navy text-white text-[11px] rounded-full h-5 px-2 min-w-[20px] font-ui font-semibold">
            {(currentQ + 1).toString().padStart(2, '0')}
          </span>
        </button>
      </div>

      {/* Mobile Drawer / Expanding Sheet Grid Modal */}
      {showQuestionGridModal && (
        <div 
          onClick={() => setShowQuestionGridModal(false)}
          className="fixed inset-0 z-[1500] lg:hidden flex items-end justify-center bg-navy/80 backdrop-blur-sm p-0 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-2xl border-t border-stone-deep px-6 pb-8 pt-4 shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-300"
          >
            {/* Native drag handle indicator */}
            <div className="w-12 h-1.5 bg-stone-deep rounded-full mx-auto mb-5 shrink-0" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 mb-4 shrink-0 border-b border-stone-wash">
              <div className="flex flex-col">
                <h3 className="font-display text-lg text-navy font-bold">Select Question</h3>
                <span className="font-ui text-xs text-ink-3">Tap any number to instantly navigate</span>
              </div>
            </div>

            {/* Drawer Legend */}
            <div className="flex flex-wrap items-center gap-4 bg-stone-wash p-3 rounded-r mb-4 text-[11px] shrink-0 border border-stone-deep/40">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-r bg-navy shadow-sm" />
                <span className="font-ui font-medium text-ink-2">Completed ({Object.keys(answers).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-r border border-navy bg-navy-wash animate-pulse" />
                <span className="font-ui font-medium text-ink-2">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-r border border-stone-deep bg-white" />
                <span className="font-ui font-medium text-ink-2">Unvisited ({exam.questions.length - Object.keys(answers).length})</span>
              </div>
            </div>

            {/* Scrollable Questions Grid */}
            <div className="overflow-y-auto flex-1 py-2 pr-1 select-none custom-scrollbar">
              <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-2">
                {exam.questions.map((_, idx) => {
                  const isActive = currentQ === idx;
                  const isAnswered = answers[exam.questions[idx].id];
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQ(idx);
                        setShowQuestionGridModal(false);
                      }}
                      disabled={isSubmitting}
                      className={`aspect-square rounded-r border font-ui text-[14px] font-bold transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:pointer-events-none ${
                        isActive ? 'bg-white text-navy font-bold ring-2 ring-navy ring-offset-2 border-navy shadow-sm' : 
                        isAnswered ? 'bg-navy text-white font-bold border-navy shadow-sm' : 
                        'bg-stone-wash border-stone-deep text-ink-3 hover:bg-white hover:border-navy-pale'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      {(idx + 1).toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-navy/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-rl border border-stone-deep bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-250">
            <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center mx-auto mb-6">
              <Send size={28} className="text-navy" />
            </div>
            <h2 className="mb-3 font-display text-2xl text-navy font-bold">Submit Exam?</h2>
            <p className="mb-8 font-ui text-[14px] leading-relaxed text-ink-3">
              Are you sure you want to finalize and submit your answers? You cannot return to this exam once submitted.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-r border border-stone-deep bg-white py-3 font-ui text-[13px] font-bold text-ink-3 transition-all hover:bg-stone-wash cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-r bg-navy py-3 font-ui text-[13px] font-bold text-white transition-all hover:bg-navy-mid cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamAttempt;
