import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function ExamEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: Questions
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingMeta, setIsSubmittingMeta] = useState(false);
  const [isSubmittingQuestions, setIsSubmittingQuestions] = useState(false);

  // Status info
  const [examStatus, setExamStatus] = useState('');

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    duration: 60
  });

  // Step 2: Questions
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], answer: '' }
  ]);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      setIsLoading(true);
      const res = await examApi.getExamDetails(id);
      const exam = res.data.exam;
      if (!exam) throw new Error("Exam not found");
      
      setBasicInfo({
        title: exam.title || '',
        duration: exam.duration || 60
      });
      setExamStatus(exam.status);
      
      if (exam.questions && exam.questions.length > 0) {
        setQuestions(exam.questions.map(q => ({
          question: q.question || '',
          options: q.options || ['', '', '', ''],
          answer: q.answer || ''
        })));
      }
    } catch (error) {
      toast.error('Failed to load examination details.');
      navigate('/admin/exams');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], answer: '' }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const validateStep1 = () => {
    if (!basicInfo.title.trim()) return 'Examination title is required.';
    if (basicInfo.duration < 1) return 'Duration must be at least 1 minute for valid assessment.';
    return null;
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Intelligence block #${i + 1} is empty.`;
      if (q.options.some(o => !o.trim())) return `Intelligence block #${i + 1} has incomplete options.`;
      if (!q.answer) return `Intelligence block #${i + 1} requires a designated correct answer.`;
    }
    return null;
  };

  const handleUpdateMeta = async () => {
    const err = validateStep1();
    if (err) {
      toast.error(err);
      return;
    }

    setIsSubmittingMeta(true);
    try {
      await examApi.updateExamMeta(id, {
        title: basicInfo.title.trim(),
        duration: basicInfo.duration
      });
      toast.success('Examination metadata updated successfully.');
      setStep(2); // Auto-advance to questions
    } catch (error) {
      toast.error(error.message || 'Operational failure: Unable to update metadata.');
    } finally {
      setIsSubmittingMeta(false);
    }
  };

  const handleUpdateQuestions = async () => {
    const vError = validateQuestions();
    if (vError) {
      toast.error(vError);
      return;
    }

    setIsSubmittingQuestions(true);
    try {
      await examApi.updateExamQuestions(id, { questions });
      toast.success('Examination intelligence blocks synchronized successfully.');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.message || 'Operational failure: Unable to update questions.');
    } finally {
      setIsSubmittingQuestions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto pb-12">
      <div className="mb-6 flex items-center gap-3">
        <button 
          onClick={() => navigate('/admin/exams')}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-stone-deep text-ink-3 hover:text-navy hover:bg-stone transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <PageHeader 
          title="Edit *Examination*" 
          subtitle={
            step === 1
              ? 'Step 1: Exam Settings'
              : `Step 2: Questions & Answers (${questions.length} Blocks)`
          }
        />
      </div>

      {examStatus === 'LIVE' && (
        <div className="bg-gold-wash border border-gold/30 rounded-md mb-6 p-4 flex gap-3 shadow-sm">
          <AlertCircle size={20} className="text-gold shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[13px] text-gold-dark font-ui">Examination is Live</div>
            <div className="text-[12px] text-gold-dark/80 mt-0.5 leading-relaxed">
              This examination is currently deployed and accessible to cadets. Modifications will immediately impact active or future assessment attempts. Proceed with caution.
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex gap-2 mb-8">
        <div className="h-1 flex-1 bg-navy rounded-full" />
        <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 2 ? 'bg-navy' : 'bg-stone-deep'}`} />
      </div>

      {step === 1 ? (
        <div className="bg-white border border-stone-deep p-8 rounded-md shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Examination Title</label>
              <div className="relative">
                <input 
                  className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
                  placeholder="e.g. B-Certificate Common Exam (2025)" 
                  value={basicInfo.title}
                  onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                />
                <ShieldCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
              </div>
              <p className="text-[11px] text-ink-4 mt-2 font-ui">Official designation as it will appear on cadet certificates.</p>
            </div>
            
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Assignment Duration</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
                  value={basicInfo.duration}
                  onChange={(e) => setBasicInfo({ ...basicInfo, duration: parseInt(e.target.value, 10) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
                <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
              </div>
              <p className="text-[11px] text-ink-4 mt-2 font-ui">Duration in standard minutes.</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-stone-deep">
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-3 hover:bg-stone hover:text-navy transition-all" 
              onClick={() => {
                // If they don't want to save, just skip to next step
                setStep(2);
              }}
            >
              <span>Skip to Questions</span>
              <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50" 
              onClick={handleUpdateMeta}
              disabled={isSubmittingMeta}
            >
              <CheckCircle2 size={16} strokeWidth={1.5} />
              <span>{isSubmittingMeta ? 'Synchronizing...' : 'Save & Proceed'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white border border-stone-deep p-6 rounded-md shadow-sm mb-6">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-stone-deep">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-navy text-white flex items-center justify-center text-[12px] font-semibold">
                    {qIndex + 1}
                  </div>
                  <span className="font-semibold text-navy text-[13px] tracking-[0.05em] uppercase">Question Block</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qIndex)} className="p-1.5 text-crimson hover:bg-crimson-wash rounded-md transition-colors">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Question Content</label>
                <textarea 
                  className="w-full p-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all min-h-[100px] resize-y" 
                  placeholder="Formulate the assessment question here..."
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">Option {String.fromCharCode(65 + oIndex)}</label>
                      <label className={`flex items-center gap-1.5 cursor-pointer text-[11px] font-medium ${q.answer === opt && opt !== '' ? 'text-[#3B6D11]' : 'text-ink-4'}`}>
                        <input 
                          type="radio" 
                          name={`q-${qIndex}-ans`}
                          checked={q.answer === opt && opt !== ''}
                          onChange={() => updateQuestion(qIndex, 'answer', opt)}
                          className="accent-[#3B6D11]"
                        />
                        {q.answer === opt && opt !== '' ? 'Correct' : 'Mark Correct'}
                      </label>
                    </div>
                    <input 
                      className={`w-full h-[38px] px-3 border rounded-md font-ui text-[14px] text-ink outline-none transition-all ${q.answer === opt && opt !== '' ? 'border-[#3B6D11] bg-[#556B2F08] focus:ring-[#556B2F30]' : 'border-stone-deep bg-white focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash'}`} 
                      placeholder={`Choice ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between mt-8">
            <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 hover:bg-stone hover:text-navy transition-all" onClick={() => setStep(1)}>
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Back to Parameters</span>
            </button>
            <div className="flex gap-4">
              <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-navy border border-navy hover:bg-navy-wash transition-all" onClick={addQuestion}>
                <Plus size={16} strokeWidth={1.5} />
                <span>Add Question Block</span>
              </button>
              <button 
                className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleUpdateQuestions} 
                disabled={isSubmittingQuestions}
              >
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>{isSubmittingQuestions ? 'Synchronizing...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
