import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { adminApi, examApi } from '../../api';
import { 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Users as UsersIcon,
  XCircle,
  ChevronDown
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
      <label className="block text-[11px] text-ink-4 mb-1 uppercase tracking-wider font-mono">{label}</label>
      <div 
        className={`flex items-center justify-between w-full h-[36px] px-3 border rounded font-ui text-[13px] bg-white cursor-pointer transition-all ${isOpen ? 'border-navy ring-2 ring-navy-wash' : 'border-stone-deep'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-ink' : 'text-ink-4 truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[1100] top-[100%] left-0 w-full mt-1 bg-white border border-stone-deep rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-stone">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" size={12} />
              <input 
                autoFocus
                type="text" 
                className="w-full h-[30px] pl-8 pr-3 bg-stone rounded text-[12px] outline-none border-none"
                placeholder="Type to filter..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <div 
              className="px-3 py-2 text-[12px] text-navy font-medium hover:bg-stone cursor-pointer border-b border-stone"
              onClick={() => { onChange(""); setSearch(""); setIsOpen(false); }}
            >
              -- Clear Selection (All) --
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-ink-4 text-[12px]">No matches found</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  className={`px-3 py-2 text-[12px] hover:bg-navy hover:text-white cursor-pointer transition-colors ${value === opt ? 'bg-navy-wash text-navy' : 'text-ink'}`}
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


export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    examId: '',
    wing: '',
    college: '',
    batch: '',
    query: ''
  });

  const [previewResults, setPreviewResults] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ wings: [], colleges: [], batches: [] });

  useEffect(() => {
    fetchData();
    fetchFilters();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, examRes] = await Promise.all([
        adminApi.getAssignments(),
        adminApi.getExams()
      ]);
      setAssignments(assignRes.data);
      setExams(examRes.data.exams);
    } catch (err) {
      console.error("Fetch Assignments Error:", err);
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
      setSelectedUserIds(new Set(data.map(u => u.id)));
      setShowPreview(true);
    } catch (err) {
      toast.error("Failed to fetch cadet preview");
    } finally {
      setSearching(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === previewResults.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(previewResults.map(u => u.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const handleAssign = async (e) => {
    e?.preventDefault();
    if (!form.examId) {
      toast.error("Please select an examination");
      return;
    }

    const isBulk = !showPreview && (form.wing || form.college || form.batch);
    if (selectedUserIds.size === 0 && !isBulk) {
      toast.error("Please search/select cadets or apply filters for bulk authorization");
      return;
    }

    if (isBulk && !window.confirm(`This will authorize ALL matching cadets for this exam. Continue?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        examId: form.examId,
        wing: isBulk ? form.wing : undefined,
        college: isBulk ? form.college : undefined,
        batch: isBulk ? form.batch : undefined,
        userIds: isBulk ? undefined : Array.from(selectedUserIds)
      };
      const { data } = await adminApi.createAssignments(payload);
      toast.success(`Successfully authorized ${data.count} cadets.`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to create authorizations.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ examId: '', wing: '', college: '', batch: '', query: '' });
    setPreviewResults([]);
    setSelectedUserIds(new Set());
    setShowPreview(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Revoke this authorization?")) return;
    try {
      await adminApi.deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      toast.success("Authorization revoked successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to revoke authorization");
    }
  };

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 pb-6 border-b border-stone-mid">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink leading-tight">Exam <em className="not-italic text-navy-soft">Eligibility</em></h1>
          <p className="font-ui text-[14px] text-ink-3 mt-1.5 font-normal">Manage authorization and roll numbers for scheduled examinations.</p>
        </div>
        <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Authorize Cadets</span>
        </button>
      </header>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">Total Authorized</span>
            <UsersIcon size={16} className="opacity-20 text-navy" />
          </div>
          <div className="font-display text-3xl font-medium leading-none text-navy">{assignments.length}</div>
        </div>
        <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">Active Exams</span>
            <ShieldCheck size={16} className="opacity-20 text-olive" />
          </div>
          <div className="font-display text-3xl font-medium leading-none text-olive">{exams.filter(e => e.status === 'LIVE').length}</div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3">Cadet / Reg. No</th>
                <th className="font-normal px-4 py-3">Wing</th>
                <th className="font-normal px-4 py-3">Batch</th>
                <th className="font-normal px-4 py-3">Examination Authorized</th>
                <th className="font-normal px-4 py-3">Assigned On</th>
                <th className="font-normal px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {loading ? (
                <tr><td colSpan="6" className="text-center p-10 text-ink-4">Loading assignments...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan="6" className="text-center p-10 text-ink-4">No assignments found. Authorized cadets will appear here.</td></tr>
              ) : (
                assignments.map(item => (
                  <tr key={item.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{item.user.name}</div>
                      <div className="font-mono text-[11px] text-ink-4">{item.user.regimentalNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex ${
                        item.user.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444420] text-[#b91c1c] border border-[#b91c1c30]' :
                        item.user.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f620] text-[#1d4ed8] border border-[#1d4ed830]' :
                        item.user.wing?.toUpperCase() === 'AIR' ? 'bg-[#06b6d420] text-[#0891b2] border border-[#0891b230]' :
                        'bg-stone-mid text-ink-3'
                      }`}>
                        {item.user.wing || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.user.batch || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{item.exam.title}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-3">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        className="w-8 h-8 rounded-md flex items-center justify-center text-crimson hover:bg-crimson-wash transition-colors" 
                        onClick={() => handleDelete(item.id)}
                        title="Revoke Authorization"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-navy" />
                <h2 className="m-0 font-ui text-[18px] font-semibold text-navy">Examination Authorization</h2>
              </div>
              <button className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" onClick={() => { setShowModal(false); resetForm(); }}>
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">1. Target Examination</label>
                <select 
                  className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all" 
                  required
                  value={form.examId}
                  onChange={e => setForm({...form, examId: e.target.value})}
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title} ({ex.status})</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">2. Find Cadets</label>
                <div className="bg-stone rounded-lg p-4 border border-stone-deep">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[11px] text-ink-4 mb-1 uppercase tracking-wider font-mono">Wing</label>
                      <select 
                        className="w-full h-[36px] px-3 border border-stone-deep rounded font-ui text-[13px] bg-white outline-none focus:border-navy-soft"
                        value={form.wing}
                        onChange={e => setForm({...form, wing: e.target.value})}
                      >
                        <option value="">All Wings</option>
                        {filterOptions.wings.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    
                    <SearchableSelect 
                      label="Batch"
                      options={filterOptions.batches}
                      value={form.batch}
                      onChange={val => setForm({...form, batch: val})}
                      placeholder="All Batches"
                    />
                  </div>

                  <div className="mb-4">
                    <SearchableSelect 
                      label="College / Unit"
                      options={filterOptions.colleges}
                      value={form.college}
                      onChange={val => setForm({...form, college: val})}
                      placeholder="All Colleges"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={14} />
                      <input 
                        type="text" 
                        className="w-full h-[34px] pl-9 pr-3 border border-stone-deep rounded font-ui text-[13px] bg-white" 
                        placeholder="Search Name or Reg No..."
                        value={form.query}
                        onChange={e => setForm({...form, query: e.target.value})}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="h-[34px] px-4 rounded font-ui text-[12px] font-medium bg-stone-deep text-navy hover:bg-stone-mid transition-all"
                      onClick={handlePreview}
                      disabled={searching}
                    >
                      {searching ? '...' : 'Search & Pick'}
                    </button>
                  </div>
                </div>
              </div>

              {showPreview && (
                <div className="mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">3. Authorization List ({selectedUserIds.size} Selected)</label>
                    <button type="button" className="text-[11px] text-navy font-medium hover:underline" onClick={toggleSelectAll}>
                      {selectedUserIds.size === previewResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="border border-stone-deep rounded-md overflow-hidden max-h-[200px] overflow-y-auto">
                    {previewResults.length === 0 ? (
                      <div className="p-8 text-center text-ink-4 text-[13px]">No matching cadets found.</div>
                    ) : (
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-stone text-ink-4 border-b border-stone-deep sticky top-0">
                          <tr>
                            <th className="w-10 p-2"></th>
                            <th className="p-2 font-normal">Cadet</th>
                            <th className="p-2 font-normal text-right">Unit / Wing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewResults.map(u => (
                            <tr key={u.id} className={`border-b border-stone last:border-0 hover:bg-stone/30 cursor-pointer ${selectedUserIds.has(u.id) ? 'bg-navy-wash/10' : ''}`} onClick={() => toggleSelect(u.id)}>
                              <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedUserIds.has(u.id)} 
                                  onChange={() => toggleSelect(u.id)}
                                  className="w-3.5 h-3.5 accent-navy"
                                />
                              </td>
                              <td className="p-2">
                                <div className="font-medium text-navy">{u.name}</div>
                                <div className="text-[10px] text-ink-4 font-mono">{u.regimentalNumber}</div>
                              </td>
                              <td className="p-2 text-right text-ink-3">
                                <div className="truncate max-w-[150px]">{u.college}</div>
                                <div className="text-[10px]">{u.wing} {u.batch}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-stone border-t border-stone-mid shrink-0 flex gap-3">
              <button type="button" className="flex-1 h-[40px] rounded-md font-ui text-[13px] font-medium bg-white text-ink-2 border border-stone-deep hover:bg-stone transition-all" onClick={() => { setShowModal(false); resetForm(); }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="flex-[2] h-[40px] rounded-md font-ui text-[14px] font-bold flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg disabled:opacity-50" 
                onClick={handleAssign}
                disabled={submitting || (selectedUserIds.size === 0 && !(!showPreview && (form.wing || form.college || form.batch)))}
              >
                {submitting ? 'Authorizing...' : 
                 showPreview ? `Authorize ${selectedUserIds.size} Selected` : 
                 (form.wing || form.college || form.batch) ? 'Bulk Authorize All Matching' : 'Authorize Cadets'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
