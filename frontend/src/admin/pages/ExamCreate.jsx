import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Layout
} from 'lucide-react';

export default function ExamCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: Questions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    duration: 60
  });

  // Step 2: Questions
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], answer: '' }
  ]);

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
    if (!basicInfo.title.trim()) return 'Exam title is required.';
    if (basicInfo.duration < 1) return 'Duration must be at least 1 minute.';
    return null;
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Question #${i + 1} is empty.`;
      if (q.options.some(o => !o.trim())) return `Question #${i + 1} has incomplete options.`;
      if (!q.answer) return `Question #${i + 1} requires a correct answer to be selected.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const vError = validateQuestions();
    if (vError) {
      toast.error(vError);
      return;
    }

    setIsSubmitting(true);

    try {
      await examApi.createExam({
        ...basicInfo,
        questions
      });
      toast.success('Exam created successfully.');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.message || 'Failed to create exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <PageHeader 
        title="Create New *Exam*" 
        subtitle={step === 1 ? 'Step 1: General Exam Settings' : `Step 2: Question Editor (${questions.length} total)`}
      />

      {/* Step Indicator */}
      <div className="flex gap-2 mb-8">
        <div className="h-1 flex-1 bg-navy rounded-full" />
        <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step === 2 ? 'bg-navy' : 'bg-stone-deep'}`} />
      </div>


      {step === 1 ? (
        <div className="bg-white border border-stone-deep p-8 rounded-md shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Exam Title</label>
              <div className="relative">
                <input 
                  className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
                  placeholder="e.g. B-Certificate Common Exam (2025)" 
                  value={basicInfo.title}
                  onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                />
                <ShieldCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
              </div>
              <p className="text-[11px] text-ink-4 mt-2 font-ui">Official title as it will appear on cadet certificates.</p>
            </div>
            
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Duration (Minutes)</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
                  value={basicInfo.duration}
                  onChange={(e) => setBasicInfo({ ...basicInfo, duration: parseInt(e.target.value) || 0 })}
                />
                <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
              </div>
              <p className="text-[11px] text-ink-4 mt-2 font-ui">Total time allowed for the exam.</p>
            </div>
          </div>
          
          <div className="flex justify-end mt-8 pt-6 border-t border-stone-deep">
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all" 
              onClick={() => {
                const err = validateStep1();
                if (err) toast.error(err); else { setStep(2); }
              }}
            >
              <span>Next: Add Questions</span>
              <ArrowRight size={16} strokeWidth={1.5} />
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
                  <span className="font-semibold text-navy text-[13px] tracking-[0.05em] uppercase">Question Details</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qIndex)} className="p-1.5 text-crimson hover:bg-crimson-wash rounded-md transition-colors">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Question Text</label>
                <textarea 
                  className="w-full p-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all min-h-[100px] resize-y" 
                  placeholder="Enter the question here..."
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

          <div className="flex justify-between mt-8 pb-16">
            <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 hover:bg-stone hover:text-navy transition-all" onClick={() => setStep(1)}>
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Back to Settings</span>
            </button>
            <div className="flex gap-4">
              <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-navy border border-navy hover:bg-navy-wash transition-all" onClick={addQuestion}>
                <Plus size={16} strokeWidth={1.5} />
                <span>Add Question</span>
              </button>
              <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={isSubmitting}>
                <ShieldCheck size={16} strokeWidth={1.5} />
                <span>{isSubmitting ? 'Creating Exam...' : 'Create Exam'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
