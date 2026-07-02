import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { invalidateCachedResourcePattern } from '../../lib/resourceCache';
import { 
  ArrowLeft, 
  ArrowRight, 
  Download,
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  FileUp,
  ListChecks
} from 'lucide-react';

export default function ExamCreate() {
  const navigate = useNavigate();
  /** excel = upload a question sheet; manual = step-by-step questions */
  const [creationMode, setCreationMode] = useState('excel');
  const [step, setStep] = useState(1); // 1: Details, 2: Questions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    duration: 60,
    negativeMarking: false,
    positiveMarks: 4,
    negativeMarks: 1.0
  });

  // Step 2: Questions (for manual mode)
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], answer: '', type: 'MCQ', topic: '', marks: 4 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], answer: '', type: 'MCQ', topic: '', marks: 4 }]);
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
    const prevOptionValue = newQuestions[qIndex].options[oIndex];
    newQuestions[qIndex].options[oIndex] = value;
    if (newQuestions[qIndex].answer === prevOptionValue) {
      newQuestions[qIndex].answer = value;
    }
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
      if (!q.question.trim()) return `Question Block #${i + 1} is empty.`;
      if (!q.type) q.type = 'MCQ';
      if (q.type === 'MCQ') {
        if (q.options.some(o => !o.trim())) return `Question Block #${i + 1} has incomplete options.`;
        if (!q.answer) return `Question Block #${i + 1} requires a designated correct answer.`;
      } else if (q.type === 'FILL_IN_THE_BLANK') {
        if (!q.answer) return `Question Block #${i + 1} requires a correct answer.`;
      }
    }
    return null;
  };

  const handleExcelCreate = async () => {
    const err = validateStep1();
    if (err) {
      toast.error(err);
      return;
    }
    if (!excelFile) {
      toast.error('Select an Excel/CSV file that contains questions and answers.');
      return;
    }

    setIsSubmitting(true);

    try {
      await examApi.createExamFromExcel({
        title: basicInfo.title.trim(),
        duration: basicInfo.duration,
        negativeMarking: basicInfo.negativeMarking,
        positiveMarks: basicInfo.positiveMarks,
        negativeMarks: basicInfo.negativeMarks,
        file: excelFile
      });
      toast.success('Exam successfully created from file.');
      invalidateCachedResourcePattern('admin-exam-list');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.message || 'Could not create the exam from this file.');
    } finally {
      setIsSubmitting(false);
    }
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
      toast.success('Examination successfully created.');
      invalidateCachedResourcePattern('admin-exam-list');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.message || 'Operational failure: Unable to create examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <PageHeader 
        title="Create New *Examination*" 
        subtitle={
          creationMode === 'excel'
            ? 'Upload an Excel/CSV sheet with questions and answers to create an exam instantly.'
            : step === 1
              ? 'Phase I: Mission Parameters & Configuration'
              : `Phase II: Intelligence Assessment Architecture (${questions.length} Blocks)`
        }
      />

      <div className="flex gap-3 mb-8">
        <button
          type="button"
          className={`h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all ${creationMode === 'excel' ? 'bg-navy text-[#F4F0E4]' : 'bg-stone text-ink-2 border border-stone-deep hover:bg-stone-mid'}`}
          onClick={() => setCreationMode('excel')}
        >
          <FileUp size={16} strokeWidth={1.5} />
          <span>From Exam File (Excel)</span>
        </button>
        <button
          type="button"
          className={`h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all ${creationMode === 'manual' ? 'bg-navy text-[#F4F0E4]' : 'bg-stone text-ink-2 border border-stone-deep hover:bg-stone-mid'}`}
          onClick={() => setCreationMode('manual')}
        >
          <ListChecks size={16} strokeWidth={1.5} />
          <span>Manual Entry</span>
        </button>
      </div>

      {creationMode === 'excel' ? (
        <div className="bg-white border border-stone-deep p-8 rounded-md shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Examination Title</label>
              <input
                className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                placeholder="e.g. Unit Drill Assessment (March 2026)"
                value={basicInfo.title}
                onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Duration (Minutes)</label>
              <input
                type="number"
                className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                value={basicInfo.duration}
                min={1}
                onChange={(e) => setBasicInfo({ ...basicInfo, duration: parseInt(e.target.value, 10) || 0 })}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <div className="mb-6 p-5 bg-stone border border-stone-deep rounded-md">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="negativeMarkingExcel"
                checked={basicInfo.negativeMarking}
                onChange={(e) => setBasicInfo({ ...basicInfo, negativeMarking: e.target.checked })}
                className="w-4 h-4 text-navy accent-navy bg-white border-stone-deep rounded focus:ring-navy-wash focus:ring-2"
              />
              <label htmlFor="negativeMarkingExcel" className="font-mono text-[11px] tracking-[0.05em] uppercase text-ink-2 cursor-pointer">
                Enable Negative Marking
              </label>
            </div>
            {basicInfo.negativeMarking && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-4 border-t border-stone-deep/50">
                <div>
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Marks for Correct Answer</label>
                  <input
                    type="number"
                    className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                    value={basicInfo.positiveMarks}
                    min={1}
                    onChange={(e) => setBasicInfo({ ...basicInfo, positiveMarks: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Marks Deducted for Incorrect</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                    value={basicInfo.negativeMarks}
                    min={0}
                    onChange={(e) => setBasicInfo({ ...basicInfo, negativeMarks: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">Question File (Excel / CSV)</label>
              <div className="flex gap-2">
                <a href="/exam-template.xlsx" download className="text-[11px] font-medium text-navy-soft hover:text-navy flex items-center gap-1">
                  <Download size={13} /> XLSX Template
                </a>
                <span className="text-stone-deep">|</span>
                <a href="/exam-template.csv" download className="text-[11px] font-medium text-navy-soft hover:text-navy flex items-center gap-1">
                  <Download size={13} /> CSV Template
                </a>
              </div>
            </div>
            <div className="relative group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="w-full p-8 border-2 border-dashed border-stone-deep rounded-md text-center font-ui text-[14px] text-ink-3 hover:border-navy-soft hover:bg-stone-wash transition-all cursor-pointer"
                onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
              />
              {excelFile && (
                <div className="absolute inset-0 bg-[#FDFCF8] flex items-center justify-center gap-3 border-2 border-navy-soft rounded-md pointer-events-none">
                  <FileUp size={20} className="text-olive" />
                  <span className="font-medium text-navy">{excelFile.name}</span>
                  <button className="ml-2 text-ink-4 hover:text-crimson pointer-events-auto" onClick={() => setExcelFile(null)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-ink-4 mt-3 leading-relaxed">
              Required columns: <code>question</code>, <code>optionA</code>, <code>optionB</code>, <code>optionC</code>, <code>optionD</code>, <code>answer</code> (A/B/C/D).
            </p>
          </div>

          <div className="flex justify-end pt-6 border-t border-stone-deep">
            <button
              type="button"
              className="h-[36px] px-[24px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50"
              onClick={handleExcelCreate}
              disabled={isSubmitting}
            >
              <ShieldCheck size={16} strokeWidth={1.5} />
              <span>{isSubmitting ? 'Importing Questions...' : 'Upload Questions'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
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
              
              <div className="mt-6 p-5 bg-stone border border-stone-deep rounded-md">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="negativeMarkingManual"
                    checked={basicInfo.negativeMarking}
                    onChange={(e) => setBasicInfo({ ...basicInfo, negativeMarking: e.target.checked })}
                    className="w-4 h-4 text-navy accent-navy bg-white border-stone-deep rounded focus:ring-navy-wash focus:ring-2"
                  />
                  <label htmlFor="negativeMarkingManual" className="font-mono text-[11px] tracking-[0.05em] uppercase text-ink-2 cursor-pointer">
                    Enable Negative Marking
                  </label>
                </div>
                {basicInfo.negativeMarking && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-4 border-t border-stone-deep/50">
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Marks for Correct Answer</label>
                      <input
                        type="number"
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        value={basicInfo.positiveMarks}
                        min={1}
                        onChange={(e) => setBasicInfo({ ...basicInfo, positiveMarks: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Marks Deducted for Incorrect</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        value={basicInfo.negativeMarks}
                        min={0}
                        onChange={(e) => setBasicInfo({ ...basicInfo, negativeMarks: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-8 pt-6 border-t border-stone-deep">
                <button 
                  className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all" 
                  onClick={() => {
                    const err = validateStep1();
                    if (err) toast.error(err); else { setStep(2); }
                  }}
                >
                  <span>Continue to Questions</span>
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
                      <span className="font-semibold text-navy text-[13px] tracking-[0.05em] uppercase">Question Block</span>
                    </div>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qIndex)} className="p-1.5 text-crimson hover:bg-crimson-wash rounded-md transition-colors">
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Type</label>
                      <select
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        value={q.type || 'MCQ'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateQuestion(qIndex, 'type', val);
                          if (val === 'SUBJECTIVE') {
                            updateQuestion(qIndex, 'answer', 'Manual Grading');
                          } else if (val === 'FILL_IN_THE_BLANK') {
                            updateQuestion(qIndex, 'answer', '');
                          }
                        }}
                      >
                        <option value="MCQ">Multiple Choice</option>
                        <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                        <option value="SUBJECTIVE">Subjective / Essay</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Topic</label>
                      <input
                        type="text"
                        placeholder="e.g. History"
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        value={q.topic || ''}
                        onChange={(e) => updateQuestion(qIndex, 'topic', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Marks</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        value={q.marks ?? 4}
                        onChange={(e) => updateQuestion(qIndex, 'marks', parseFloat(e.target.value) || 0)}
                      />
                    </div>
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

                  {(!q.type || q.type === 'MCQ') && (
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
                  )}

                  {q.type === 'FILL_IN_THE_BLANK' && (
                    <div className="mb-5">
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Correct Answer</label>
                      <input 
                        type="text"
                        className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                        placeholder="Enter the correct answer for the blank"
                        value={q.answer}
                        onChange={(e) => updateQuestion(qIndex, 'answer', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between mt-8 pb-16">
                <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 hover:bg-stone hover:text-navy transition-all" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} strokeWidth={1.5} />
                  <span>Back to Parameters</span>
                </button>
                <div className="flex gap-4">
                  <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-navy border border-navy hover:bg-navy-wash transition-all" onClick={addQuestion}>
                    <Plus size={16} strokeWidth={1.5} />
                    <span>Add Question Block</span>
                  </button>
                  <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={isSubmitting}>
                    <ShieldCheck size={16} strokeWidth={1.5} />
                    <span>{isSubmitting ? 'Creating Exam...' : 'Finalize & Create'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
