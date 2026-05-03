import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { PageHeader } from '../components/Shared';
import { 
  ShieldCheck, 
  Search, 
  Filter,
  Users as UsersIcon,
  ChevronDown,
  UserCheck,
  Building2,
  Calendar,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  Clock,
  Loader2
} from 'lucide-react';

const SearchableSelect = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">{label}</label>
      <div 
        className={`flex items-center justify-between w-full h-[38px] px-3 border rounded-md font-ui text-[14px] bg-white cursor-pointer transition-all ${isOpen ? 'border-navy ring-[3px] ring-navy-wash' : 'border-stone-deep hover:border-navy-soft/50'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-ink font-medium' : 'text-ink-4 truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 text-ink-4 ${isOpen ? 'rotate-180 text-navy' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[1100] top-[100%] left-0 w-full mt-2 bg-white border border-stone-deep rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-stone bg-stone-wash/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" size={13} />
              <input 
                autoFocus
                type="text" 
                className="w-full h-[32px] pl-8 pr-2 bg-white border border-stone-deep rounded text-[13px] outline-none focus:border-navy-soft transition-all"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <div 
              className="px-3 py-2 text-[13px] text-navy font-semibold hover:bg-navy-wash/30 cursor-pointer border-b border-stone transition-colors"
              onClick={() => { onChange(""); setSearch(""); setIsOpen(false); }}
            >
              Clear Selection (All)
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-ink-4 text-[13px] italic">No results match your search</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  className={`px-3 py-2 text-[13px] hover:bg-navy hover:text-white cursor-pointer transition-colors ${value === opt ? 'bg-navy-wash/50 text-navy font-bold' : 'text-ink font-medium'}`}
                  onClick={() => { onChange(opt); setSearch(""); setIsOpen(false); }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StepIndicator = ({ currentStep }) => {
  return (
    <div className="flex gap-2 mb-5">
      <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${currentStep >= 1 ? 'bg-navy shadow-sm shadow-navy-wash' : 'bg-stone-deep'}`} />
      <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${currentStep >= 2 ? 'bg-navy shadow-sm shadow-navy-wash' : 'bg-stone-deep'}`} />
      <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${currentStep >= 3 ? 'bg-navy shadow-sm shadow-navy-wash' : 'bg-stone-deep'}`} />
    </div>
  );
};

export default function ScheduleExam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ wings: [], colleges: [], batches: [] });

  // Form State
  const [form, setForm] = useState({
    examId: '',
    wing: '',
    college: '',
    batch: '',
    query: ''
  });

  const [previewResults, setPreviewResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Map());
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchFilters();
  }, []);

  // Live search when on Step 2
  useEffect(() => {
    if (currentStep !== 2) return;
    
    const timeoutId = setTimeout(() => {
      handlePreview();
    }, 400); // 400ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [form.wing, form.college, form.batch, form.query, currentStep]);

  useEffect(() => {
    const preselectedExamId = searchParams.get('examId');
    if (preselectedExamId && exams.length > 0) {
      setForm(prev => ({ ...prev, examId: preselectedExamId }));
      setCurrentStep(2);
    }
  }, [searchParams, exams]);

  const fetchExams = async () => {
    try {
      const { data } = await adminApi.getExams();
      setExams(data.exams.filter(e => e.status !== 'ARCHIVED'));
    } catch (err) {
      toast.error("Failed to fetch available exams");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const { data } = await adminApi.getFilters();
      setFilterOptions(data);
    } catch (err) {
      console.error("Fetch Filters Error:", err);
    }
  };

  const handlePreview = async () => {
    setSearching(true);
    try {
      const { data } = await adminApi.searchUsers({
        wing: form.wing,
        college: form.college,
        batch: form.batch,
        query: form.query
      });
      setPreviewResults(data);
      // Removed automatic overwrite of selected users to preserve manual selections across searches
    } catch (err) {
      toast.error("Failed to fetch cadet preview");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelectAll = () => {
    const allFilteredSelected = previewResults.length > 0 && previewResults.every(u => selectedUsers.has(u.id));
    const next = new Map(selectedUsers);
    
    if (allFilteredSelected) {
      // Deselect current filtered results
      previewResults.forEach(u => next.delete(u.id));
    } else {
      // Select all current filtered results
      previewResults.forEach(u => next.set(u.id, u));
    }
    setSelectedUsers(next);
  };

  const toggleSelect = (user) => {
    const next = new Map(selectedUsers);
    if (next.has(user.id)) next.delete(user.id);
    else next.set(user.id, user);
    setSelectedUsers(next);
  };

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      const payload = {
        examId: form.examId,
        userIds: Array.from(selectedUsers.keys())
      };
      const { data } = await adminApi.createAssignments(payload);
      toast.success(`Successfully scheduled exams for ${data.count || selectedUsers.size} cadets.`);
      navigate('/admin/assignments');
    } catch (err) {
      toast.error(err.message || "Failed to finalize exam schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedExam = exams.find(e => e.id.toString() === form.examId.toString());

  if (loading) {
    return <div className="p-12 text-center text-ink-4 font-mono text-[13px] animate-pulse">Loading exams...</div>;
  }

  return (
    <div className="w-full pb-10">
      <PageHeader 
        title="Schedule *Examination*"
        subtitle={
          currentStep === 1 ? "Select an exam to schedule." :
          currentStep === 2 ? `Selecting cadets for: ${selectedExam?.title}` :
          "Step 3: Final Review & Confirmation."
        }
        action={
          currentStep > 1 && (
            <button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="h-[36px] px-4 rounded-md font-ui text-[13px] font-medium flex items-center gap-2 bg-stone text-ink-2 border border-stone-deep hover:bg-stone-mid transition-all"
            >
              <ArrowLeft size={16} />
              <span>Previous Step</span>
            </button>
          )
        }
      />

      <StepIndicator currentStep={currentStep} />

      {/* Step 1: Select Exam */}
      {currentStep === 1 && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone bg-stone-wash/50">
              <h2 className="font-display text-lg font-semibold text-navy">Select Exam</h2>
              <p className="text-[13px] text-ink-3">Choose the exam to schedule.</p>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-mid text-[11px] uppercase tracking-wider text-ink-4 font-mono">
                      <th className="pb-2 font-medium px-4">Exam</th>
                      <th className="pb-2 font-medium px-4">Duration</th>
                      <th className="pb-2 font-medium px-4">Blocks</th>
                      <th className="pb-2 font-medium px-4 text-right">Selection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-ink-4 border-b border-stone-deep border-dashed">
                          <ShieldCheck size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-[14px]">No exams available to schedule.</p>
                          <button onClick={() => navigate('/admin/exams/create')} className="mt-3 text-navy font-bold hover:underline text-[13px]">Create an exam first →</button>
                        </td>
                      </tr>
                    ) : (
                      exams.map(ex => (
                        <tr 
                          key={ex.id}
                          onClick={() => setForm({ ...form, examId: ex.id.toString() })}
                          className={`border-b border-stone-mid last:border-0 transition-all cursor-pointer ${
                            form.examId.toString() === ex.id.toString()
                              ? 'bg-navy-wash/20' 
                              : 'hover:bg-stone-wash/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded ${form.examId.toString() === ex.id.toString() ? 'bg-navy text-white shadow-sm' : 'bg-stone text-navy'}`}>
                                <Layers size={16} />
                              </div>
                              <span className="font-bold text-[14px] text-navy">{ex.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[13px] text-ink-3 font-ui">
                            <span className="flex items-center gap-1.5"><Clock size={14} className="opacity-50" /> {ex.duration} min</span>
                          </td>
                          <td className="py-3 px-4 text-[13px] text-ink-3 font-ui">
                            <span className="flex items-center gap-1.5"><Search size={14} className="opacity-50" /> {ex.questionCount}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                form.examId.toString() === ex.id.toString() ? 'border-navy bg-navy' : 'border-stone-deep bg-white'
                              }`}>
                                {form.examId.toString() === ex.id.toString() && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-stone-wash/50 border-t border-stone flex justify-end">
              <button 
                disabled={!form.examId}
                onClick={() => setCurrentStep(2)}
                className="h-[36px] px-[18px] rounded-md font-medium text-[13px] flex items-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-30"
              >
                Continue Configuration
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Target Cadets */}
      {currentStep === 2 && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              {/* Filter Sidebar */}
              <div className="lg:col-span-4 p-6 border-r border-stone bg-stone/20">
                <div className="space-y-5">
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Wing / Service Unit</label>
                    <select 
                      className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] bg-white outline-none focus:border-navy-soft transition-all"
                      value={form.wing}
                      onChange={e => setForm({...form, wing: e.target.value})}
                    >
                      <option value="">All Service Wings</option>
                      {filterOptions.wings.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  <SearchableSelect 
                    label="Cadet Batch"
                    options={filterOptions.batches}
                    value={form.batch}
                    onChange={val => setForm({...form, batch: val})}
                    placeholder="All Available Batches"
                  />

                  <SearchableSelect 
                    label="Institutional Body"
                    options={filterOptions.colleges}
                    value={form.college}
                    onChange={val => setForm({...form, college: val})}
                    placeholder="All Registered Colleges"
                  />

                  <div className="pt-4 border-t border-stone">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={14} />
                      <input 
                        type="text" 
                        className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[13px] bg-white outline-none focus:border-navy-soft" 
                        placeholder="Search Name / Reg. No."
                        value={form.query}
                        onChange={e => setForm({...form, query: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-navy/5 rounded border border-navy/10 flex gap-3">
                    <Info size={16} className="text-navy shrink-0 mt-0.5" />
                    <p className="text-[11px] text-navy/70 leading-relaxed font-ui italic">
                      Filter and select cadets from the list below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection Table */}
              <div className="lg:col-span-8 flex flex-col relative">
                {searching && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-navy font-bold text-[13px]">
                      <Loader2 className="animate-spin" size={16} /> Syncing Data...
                    </div>
                  </div>
                )}
                
                <div className="p-3 border-b border-stone flex justify-between items-center bg-stone-wash/30">
                  <div className="font-mono text-[10px] font-bold text-ink-3 uppercase tracking-widest">
                    Results: <span className="text-navy">{previewResults.length}</span>
                  </div>
                  <button 
                    onClick={toggleSelectAll}
                    disabled={previewResults.length === 0}
                    className="text-[10px] font-bold text-navy hover:underline px-2 py-1 disabled:opacity-30 disabled:hover:no-underline"
                  >
                    {previewResults.length > 0 && previewResults.every(u => selectedUsers.has(u.id)) ? 'Deselect Filtered' : 'Select All Filtered'}
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto max-h-[400px]">
                  {previewResults.length === 0 && !searching ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center text-ink-4 opacity-60">
                      <UsersIcon size={32} strokeWidth={1} className="mb-3" />
                      <p className="italic text-[13px]">
                        No records match current filters.
                      </p>
                    </div>
                  ) : previewResults.length > 0 && (
                        <table className="w-full text-left text-[13px] border-collapse">
                          <thead className="bg-stone/50 text-ink-4 border-b border-stone-deep sticky top-0 z-10">
                            <tr>
                              <th className="w-10 p-3 text-center">
                                <input 
                                  type="checkbox" 
                                  className="accent-navy w-3.5 h-3.5" 
                                  checked={previewResults.length > 0 && previewResults.every(u => selectedUsers.has(u.id))}
                                  onChange={toggleSelectAll}
                                />
                              </th>
                              <th className="p-3 font-semibold uppercase tracking-wider text-[9px]">Cadet</th>
                              <th className="p-3 font-semibold uppercase tracking-wider text-[9px]">Unit Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone">
                            {previewResults.map(u => (
                              <tr 
                                key={u.id} 
                                onClick={() => toggleSelect(u)}
                                className={`group hover:bg-stone-wash cursor-pointer transition-all ${selectedUsers.has(u.id) ? 'bg-navy-wash/5' : ''}`}
                              >
                                <td className="p-3 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedUsers.has(u.id)} 
                                    onChange={() => toggleSelect(u)}
                                    className="accent-navy w-3.5 h-3.5 cursor-pointer"
                                    onClick={e => e.stopPropagation()}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-navy">{u.name}</div>
                                  <div className="font-mono text-[10px] text-ink-4 mt-0.5 uppercase">{u.regimentalNumber}</div>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-ink-3 text-[11px]">
                                      <Building2 size={11} className="opacity-40" />
                                      <span className="truncate max-w-[120px]">{u.college}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-black tracking-widest border ${
                                        u.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444410] text-[#b91c1c] border-[#b91c1c20]' :
                                        u.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f610] text-[#1d4ed8] border-[#1d4ed820]' :
                                        'bg-[#06b6d410] text-[#0891b2] border-[#0891b220]'
                                      }`}>
                                        {u.wing}
                                      </span>
                                      {u.batch && <span className="text-[8px] px-1.5 py-0.5 bg-stone-deep text-ink-4 rounded-sm font-bold uppercase">{u.batch}</span>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
              </div>
            </div>

            <div className="p-4 bg-stone border-t border-stone-mid flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white border border-stone-deep px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
                  <UsersIcon size={14} className="text-navy" />
                  <span className="font-bold text-navy text-[13px]">{selectedUsers.size}</span>
                  <span className="text-ink-4 text-[11px] font-medium uppercase tracking-tight">Authorized</span>
                </div>
              </div>
              
              <button 
                disabled={selectedUsers.size === 0}
                onClick={() => setCurrentStep(3)}
                className="h-[36px] px-[18px] rounded-md font-medium text-[13px] bg-navy text-[#F4F0E4] shadow-sm hover:bg-navy-mid transition-all disabled:opacity-30 flex items-center gap-2"
              >
                Review Selection
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Finalize */}
      {currentStep === 3 && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            {/* Left side: Header info & Exam Details */}
            <div className="md:w-1/3 p-8 bg-navy text-white flex flex-col border-r border-stone-deep relative overflow-hidden">

              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                  <ShieldCheck size={24} className="text-white" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-3">Final Review</h2>
                <p className="text-white/70 text-[13px] leading-relaxed mb-10">
                  Verify the selected exam and cadets. This action allows the selected cadets to take the exam.
                </p>

                <div className="mt-auto">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-2">Selected Exam</div>
                  <div className="bg-white/10 border border-white/10 rounded-md p-4">
                    <div className="text-[15px] font-bold text-white mb-1">{selectedExam?.title}</div>
                    <div className="flex flex-col gap-1 text-[12px] text-white/70">
                      <span>• {selectedExam?.duration} Minutes Duration</span>
                      <span>• {selectedExam?.questionCount} Questions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Cadet List & Action */}
            <div className="md:w-2/3 flex flex-col">
              <div className="px-8 py-5 border-b border-stone-deep flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-4 mb-1">Cadets Selected</div>
                  <div className="text-[16px] font-bold text-navy">{selectedUsers.size} Cadets Identified</div>
                </div>
                <div className="w-10 h-10 rounded bg-olive/10 flex items-center justify-center text-olive">
                  <UserCheck size={20} />
                </div>
              </div>

              {/* Roster Table */}
              <div className="flex-1 overflow-y-auto max-h-[460px] bg-white">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead className="bg-stone-wash/50 text-ink-4 border-b border-stone-deep sticky top-0 z-10">
                    <tr>
                      <th className="p-3 pl-6 font-semibold uppercase tracking-wider text-[9px]">Cadet Name & ID</th>
                      <th className="p-3 font-semibold uppercase tracking-wider text-[9px]">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone">
                    {Array.from(selectedUsers.values()).map(u => (
                      <tr key={u.id} className="hover:bg-stone-wash/50">
                        <td className="p-3 pl-6">
                          <div className="font-bold text-navy">{u.name}</div>
                          <div className="font-mono text-[10px] text-ink-4 mt-0.5 uppercase">{u.regimentalNumber}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-ink-3 text-[11px] mb-1">
                            <Building2 size={11} className="opacity-40" />
                            <span className="truncate max-w-[200px]">{u.college}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-black tracking-widest border ${
                              u.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444410] text-[#b91c1c] border-[#b91c1c20]' :
                              u.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f610] text-[#1d4ed8] border-[#1d4ed820]' :
                              'bg-[#06b6d410] text-[#0891b2] border-[#0891b220]'
                            }`}>
                              {u.wing}
                            </span>
                            {u.batch && <span className="text-[8px] px-1.5 py-0.5 bg-stone-deep text-ink-4 rounded-sm font-bold uppercase">{u.batch}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-stone border-t border-stone flex justify-between items-center">
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="text-[13px] font-medium text-ink-4 hover:text-navy transition-colors"
                >
                  Return to Selection
                </button>
                <button 
                  disabled={submitting}
                  onClick={handleAssign}
                  className="h-[44px] px-8 rounded-md font-bold text-[13px] bg-navy text-[#F4F0E4] shadow-md hover:bg-navy-mid transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Scheduling Exam...' : (
                    <>
                      <CheckCircle2 size={16} />
                      Finalize Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
