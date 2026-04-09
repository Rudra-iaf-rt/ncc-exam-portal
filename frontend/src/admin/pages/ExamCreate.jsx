import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
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
import '../admin.css';

export default function ExamCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: Questions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setError(vError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const { data, error: apiError } = await apiFetch('/exams/create', {
      method: 'POST',
      body: JSON.stringify({
        ...basicInfo,
        questions
      })
    });

    if (data) {
      navigate('/admin/exams');
    } else {
      setError(apiError || 'Failed to create exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <PageHeader 
        title="Create New *Exam*" 
        subtitle={step === 1 ? 'Step 1: General Exam Settings' : `Step 2: Question Editor (${questions.length} total)`}
      />

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <div style={{ height: '4px', flex: 1, background: 'var(--navy)', borderRadius: '2px' }} />
        <div style={{ height: '4px', flex: 1, background: step === 2 ? 'var(--navy)' : 'var(--stone-3)', borderRadius: '2px', transition: 'all 0.3s' }} />
      </div>

      {error && (
        <div className="adm-card" style={{ padding: '16px', borderLeft: '4px solid var(--crimson)', background: '#FFF5F5', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertCircle size={18} style={{ color: 'var(--crimson)' }} />
          <span style={{ fontSize: '13px', color: 'var(--crimson)', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <div className="adm-card" style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div className="adm-form-group">
              <label className="adm-label">Exam Title</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="adm-input" 
                  placeholder="e.g. B-Certificate Common Exam (2025)" 
                  value={basicInfo.title}
                  onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
                  style={{ paddingLeft: '40px' }}
                />
                <ShieldCheck size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '8px' }}>Official title as it will appear on cadet certificates.</p>
            </div>
            
            <div className="adm-form-group">
              <label className="adm-label">Duration (Minutes)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number"
                  className="adm-input" 
                  value={basicInfo.duration}
                  onChange={(e) => setBasicInfo({ ...basicInfo, duration: parseInt(e.target.value) || 0 })}
                  style={{ paddingLeft: '40px' }}
                />
                <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '8px' }}>Total time allowed for the exam.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--stone-3)' }}>
            <button 
              className="adm-btn adm-btn-primary" 
              onClick={() => {
                const err = validateStep1();
                if (err) setError(err); else { setError(''); setStep(2); }
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
            <div key={qIndex} className="adm-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--stone-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                    {qIndex + 1}
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Question Details</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qIndex)} className="adm-btn adm-btn-ghost" style={{ padding: '6px', color: 'var(--crimson)' }}>
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="adm-form-group">
                <label className="adm-label">Question Text</label>
                <textarea 
                  className="adm-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Enter the question here..."
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="adm-form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="adm-label" style={{ marginBottom: 0 }}>Option {String.fromCharCode(65 + oIndex)}</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 500, color: q.answer === opt && opt !== '' ? 'var(--olive)' : 'var(--ink-4)' }}>
                        <input 
                          type="radio" 
                          name={`q-${qIndex}-ans`}
                          checked={q.answer === opt && opt !== ''}
                          onChange={() => updateQuestion(qIndex, 'answer', opt)}
                          style={{ accentColor: 'var(--olive)' }}
                        />
                        {q.answer === opt && opt !== '' ? 'Correct' : 'Mark Correct'}
                      </label>
                    </div>
                    <input 
                      className="adm-input" 
                      placeholder={`Choice ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      style={{ 
                        borderColor: q.answer === opt && opt !== '' ? 'var(--olive)' : 'var(--stone-3)',
                        background: q.answer === opt && opt !== '' ? 'rgba(85, 107, 47, 0.03)' : 'var(--parchment)'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingBottom: '60px' }}>
            <button className="adm-btn adm-btn-ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Back to Settings</span>
            </button>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="adm-btn adm-btn-ghost" onClick={addQuestion}>
                <Plus size={16} strokeWidth={1.5} />
                <span>Add Question</span>
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
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
