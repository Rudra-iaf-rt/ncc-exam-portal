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
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  const { syncStatus, queueSave } = useExamAutoSave(attemptId);

  const {
    isFullscreen,
    isScreenSharing,
    warningCount,
    lastViolationType,
    showWarning,
    setShowWarning,
    requestFullscreen,
    requestScreenShare,
    setAttemptId: setProctoringAttemptId,
  } = useProctoring({
    onSecurityBreach: (terminate) => {
      if (terminate) {
        toast.error('Session Terminated: Multiple security breaches detected.');
        handleSubmit(true);
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
        setProctoringAttemptId(data.attemptId); // Give proctoring hook the attemptId
        // Use server-computed remaining seconds so refresh doesn't reset the timer
        setTimeLeft(data.remainingSeconds ?? data.exam.duration * 60);

        // Re-hydrate any answers already saved to the DB
        if (data.answers && data.answers.length > 0) {
          const ansMap = {};
          data.answers.forEach(a => { ansMap[a.questionId] = a.selectedAnswer; });
          setAnswers(ansMap);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to start exam session');
      navigate('/dashboard');
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
          handleSubmit(true); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isFullscreen, isScreenSharing]);

  const handleSelect = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    queueSave(questionId, option);
  };

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto && !window.confirm('Are you sure you want to submit the exam?')) return;
    
    setIsSubmitting(true);
    const answerList = Object.entries(answersRef.current).map(([qId, val]) => ({
      questionId: Number(qId),
      selectedAnswer: val,
    }));

    try {
      await examApi.submitAttempt({ examId: Number(id), answers: answerList });
      toast.success('Exam submitted successfully.');
      navigate('/results');
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-crimson/95 backdrop-blur-md p-6 text-white">
      <div className="w-full max-w-md rounded-rl border border-white/30 bg-crimson-deep p-10 text-center shadow-2xl">
        <AlertCircle size={64} className="mx-auto mb-6 text-white animate-pulse" />
        <h2 className="mb-4 font-display text-3xl">Security Breach</h2>
        <p className="mb-6 font-ui">
          {lastViolationType === 'TAB_SWITCH' && "Unauthorized window or tab switch detected."}
          {lastViolationType === 'FULLSCREEN_EXIT' && "Fullscreen mode was exited prematurely."}
          {lastViolationType === 'SCREEN_STOP' && "Screen transmission was terminated."}
          {lastViolationType === 'FOCUS_LOSS' && "Window focus lost. Please stay within the exam environment."}
          {lastViolationType === 'MOUSE_LEAVE' && "Cursor moved outside the secure examination area."}
          {!lastViolationType && "Security protocol violation detected."}
          {" This incident has been logged."}
        </p>
        <div className="mb-10 rounded-r bg-white/10 p-4 font-mono text-sm">
          WARNING {warningCount.toString().padStart(2, '0')} OF 03
        </div>
        <button 
          onClick={() => setShowWarning(false)}
          className="w-full rounded-r bg-white py-4 font-ui font-bold text-crimson-deep shadow-lg transition-all hover:bg-navy-pale active:scale-95"
        >
          ACKNOWLEDGE & RETURN
        </button>
      </div>
    </div>
  );

  const q = exam.questions[currentQ];

  return (
    <div className="flex h-screen flex-col bg-stone-wash">
      {/* Top Bar */}
      <header className="z-[100] flex items-center justify-between bg-navy px-10 py-4 shadow-lg">
        <div className="flex flex-col">
          <h1 className="font-display text-xl text-[#F4F0E4]">{exam.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              syncStatus === 'saving' ? 'text-gold' : 
              syncStatus === 'saved' ? 'text-olive-pale' : 
              'text-crimson-soft'
            }`}>
              {syncStatus === 'saving' && <RefreshCw size={12} className="animate-spin" />}
              {syncStatus === 'saved' && <ShieldCheck size={12} />}
              {syncStatus === 'error' && <AlertTriangle size={12} />}
              <span className="font-mono">
                {syncStatus === 'saving' ? 'Saving Progress...' : 
                 syncStatus === 'saved' ? 'Data Synchronized' : 
                 'Connection Failure'}
              </span>
            </div>

            <div className={`flex items-center gap-3 rounded-md border px-4 py-2 transition-all ${
              warningCount === 0 ? 'bg-emerald-500/10 border-emerald-500/30' :
              warningCount < 2 ? 'bg-amber-500/20 border-amber-500/40' :
              'bg-rose-500/20 border-rose-500/40'
            }`}>
              <ShieldCheck 
                size={18} 
                className={
                  warningCount === 0 ? 'text-emerald-400' : 
                  warningCount < 2 ? 'text-amber-400 animate-pulse' : 
                  'text-rose-400 animate-bounce'
                } 
              />
              <div className="flex flex-col leading-none">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 mb-0.5">Proctoring Status</span>
                <span className={`font-mono text-[14px] font-bold tracking-tight ${
                  warningCount === 0 ? 'text-emerald-400' : 
                  warningCount < 2 ? 'text-amber-400' : 
                  'text-rose-400'
                }`}>
                  {warningCount === 0 ? 'SECURE (0/03)' : `WARNING (${warningCount}/03)`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center gap-4 rounded-r px-5 py-2.5 font-ui text-xl font-bold transition-all ${
          timeLeft < 300 ? 'bg-crimson text-white animate-pulse' : 'bg-white/15 text-white'
        }`}>
          <Clock size={24} />
          <span className="font-mono">{formatTime(timeLeft)}</span>
        </div>

        <button 
          onClick={() => handleSubmit()} 
          className="flex items-center gap-3 rounded-r bg-white px-6 py-2.5 font-ui text-[14px] font-bold text-navy transition-all hover:bg-navy-pale active:scale-95 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Finalizing...' : 'Submit Exam'}
          <Send size={18} />
        </button>
      </header>

      <main className="grid flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="flex flex-col gap-6 border-r border-stone-deep bg-white p-8">
          <div>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4">Exam Progress</h3>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  className={`aspect-square rounded-[4px] border font-mono text-[13px] font-medium transition-all ${
                    currentQ === idx ? 'border-navy bg-navy-wash text-navy shadow-[0_0_0_2px_var(--navy-wash)]' : 
                    answers[exam.questions[idx].id] ? 'border-navy bg-navy text-white' : 
                    'border-stone-deep bg-white text-ink-3 hover:border-navy-soft'
                  }`}
                >
                  {(idx + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-dashed border-stone-deep pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3 w-3 rounded-[2px] bg-navy"></span>
                <span className="font-mono">Completed</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3 w-3 rounded-[2px] border border-navy bg-navy-wash"></span>
                <span className="font-mono">Active</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-3 w-3 rounded-[2px] border border-stone-deep"></span>
                <span className="font-mono">Unvisited</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <div className="flex flex-col items-center overflow-y-auto p-12">
          <div className="w-full max-w-[850px] rounded-rl border border-stone-deep bg-white p-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-navy-soft">
                Question {(currentQ + 1).toString().padStart(2, '0')} / {exam.questions.length.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2 rounded-full bg-stone-wash px-3 py-1 text-[11px] font-medium text-ink-4">
                <ShieldCheck size={12} className="text-olive-soft" />
                <span className="font-ui uppercase tracking-wide">Exam Session Active</span>
              </div>
            </div>
            
            <p className="mb-10 font-display text-2xl leading-relaxed text-ink">{q.question}</p>

            <div className="flex flex-col gap-4">
              {q.options.map((opt, i) => (
                <label key={i} className={`flex cursor-pointer items-center gap-5 rounded-r border p-5 transition-all ${
                  answers[q.id] === opt ? 'border-navy bg-navy-wash' : 'border-stone-deep bg-white hover:border-navy-soft hover:bg-stone-wash'
                }`}>
                  <input
                    type="radio"
                    className="hidden"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => handleSelect(q.id, opt)}
                  />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[13px] font-bold transition-all ${
                    answers[q.id] === opt ? 'border-navy bg-navy text-white' : 'border-stone-deep bg-white text-ink-3'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-ui text-[16px] text-ink-2">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 flex w-full max-w-[850px] justify-between">
            <button 
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(prev => prev - 1)}
              className="flex items-center gap-3 rounded-r border border-stone-deep bg-white px-8 py-3 font-ui text-[14px] font-bold text-navy transition-all hover:bg-stone-wash active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} /> PREVIOUS
            </button>
            <button 
              disabled={currentQ === exam.questions.length - 1}
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="flex items-center gap-3 rounded-r bg-navy px-10 py-3 font-ui text-[14px] font-bold text-[#F4F0E4] transition-all hover:bg-navy-mid active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              NEXT <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamAttempt;
