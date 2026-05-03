import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, examApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { Download, Search, Edit3, XCircle, ShieldAlert } from 'lucide-react';

export default function ResultsBoard() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    college: searchParams.get('college') || '', 
    exam: searchParams.get('exam') || '', 
    search: searchParams.get('search') || '' 
  });
  
  // Override State
  const [editingResult, setEditingResult] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ score: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data } = await examApi.getResults();
      if (data) setResults(data.results);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      toast.error("Could not retrieve student performance records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.updateResult(editingResult.id, { 
        score: parseInt(overrideForm.score), 
        reason: overrideForm.reason 
      });
      toast.success('Score updated successfully.');
      fetchResults();
      setEditingResult(null);
      setOverrideForm({ score: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update score.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter options
  const colleges = useMemo(() => [...new Set(results.map(r => r.college))].sort(), [results]);
  const exams = useMemo(() => [...new Set(results.map(r => r.examTitle))].sort(), [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesCollege = !filters.college || r.college === filters.college;
      const matchesExam = !filters.exam || r.examTitle === filters.exam;
      const matchesSearch = !filters.search || 
        r.studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.regimentalNumber.toLowerCase().includes(filters.search.toLowerCase());
      return matchesCollege && matchesExam && matchesSearch;
    });
  }, [results, filters]);

  const exportCSV = () => {
    const headers = ['Student Name', 'Regimental No', 'College', 'Exam', 'Score (%)', 'Status'];
    const rows = filteredResults.map(r => [
      r.studentName, 
      r.regimentalNumber, 
      r.college, 
      r.examTitle, 
      r.score,
      r.score >= 40 ? 'Qualified' : 'Not Clear'
    ]);
    const content = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NCC_Results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <div className="p-10 text-ink-4 font-mono text-[13px]">Retrieving cadet performance records...</div>;

  return (
    <div>
      <PageHeader 
        title="Results & *Intelligence*" 
        subtitle="Consolidated performance report across all unit training centres."
        action={
          <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid disabled:opacity-50 disabled:cursor-not-allowed" onClick={exportCSV} disabled={filteredResults.length === 0}>
            <Download size={16} strokeWidth={1.5} />
            <span>Export Report (CSV)</span>
          </button>
        }
      />

      {/* Filters Area */}
      <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Filter by College</label>
          <div className="relative">
            <select 
              className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all" 
              value={filters.college}
              onChange={(e) => setFilters({ ...filters, college: e.target.value })}
            >
              <option value="">All affiliated colleges</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Filter by Examination</label>
          <select 
            className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all" 
            value={filters.exam}
            onChange={(e) => setFilters({ ...filters, exam: e.target.value })}
          >
            <option value="">All active examinations</option>
            {exams.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Search Cadets</label>
          <div className="relative">
            <input 
              className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
              placeholder="Name or Regimental No..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3">Cadet Name</th>
                <th className="font-normal px-4 py-3">Regimental No.</th>
                <th className="font-normal px-4 py-3">College</th>
                <th className="font-normal px-4 py-3">Exam Name</th>
                <th className="font-normal px-4 py-3">Score</th>
                <th className="font-normal px-4 py-3">Status</th>
                {isAdmin && <th className="font-normal px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-ink-4 font-light">
                    No result records found in the archive.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => (
                  <tr key={r.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.studentName}</div>
                      <div className="text-[11px] text-ink-4 font-light">{r.college}</div>
                    </td>
                    <td className="px-4 py-3"><code className="font-mono text-[12px] bg-transparent p-0 text-ink-3 tracking-wide">{r.regimentalNumber}</code></td>
                    <td className="px-4 py-3">{r.college}</td>
                    <td className="px-4 py-3">{r.examTitle}</td>
                    <td className={`px-4 py-3 font-semibold ${r.score >= 70 ? 'text-[#3B6D11]' : r.score < 40 ? 'text-crimson' : 'text-ink'}`}>
                      {r.score}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex ${r.score >= 40 ? 'bg-[#10b98120] text-[#059669] border border-[#10b98130]' : 'bg-[#ef444420] text-[#b91c1c] border border-[#b91c1c30]'}`}>
                        {r.score >= 40 ? 'Qualified' : 'Not Clear'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button 
                          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-navy-soft hover:bg-stone hover:text-navy transition-colors" 
                          onClick={() => {
                            setEditingResult(r);
                            setOverrideForm({ score: r.score, reason: '' });
                          }}
                          title="Override Score"
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      {isAdmin && editingResult && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[450px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={20} className="text-crimson" />
                <h2 className="m-0 font-ui text-[18px] font-semibold text-crimson">Score Override</h2>
              </div>
              <button className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" onClick={() => setEditingResult(null)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleOverride} className="p-6">
              <div className="mb-5 p-3 bg-stone rounded-lg border-l-4 border-l-navy border border-transparent border-t-stone-deep border-r-stone-deep border-b-stone-deep">
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-4 mb-1">Target Cadet</div>
                <div className="font-semibold text-navy">{editingResult.studentName}</div>
                <div className="text-[12px] text-ink-3">{editingResult.examTitle}</div>
              </div>

              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Revised Score (%)</label>
                <input 
                  type="number" 
                  className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all" 
                  min="0" 
                  max="100"
                  required
                  value={overrideForm.score}
                  onChange={e => setOverrideForm({...overrideForm, score: e.target.value})}
                />
              </div>

              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Reason for Override</label>
                <textarea 
                  className="w-full p-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all min-h-[80px] resize-none" 
                  placeholder="e.g. Technical error during submission, re-evaluation requested..."
                  required
                  value={overrideForm.reason}
                  onChange={e => setOverrideForm({...overrideForm, reason: e.target.value})}
                />
                <div className="text-[10px] text-ink-4 mt-1 font-ui">* This action will be recorded in the HQ audit logs.</div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" className="flex-1 h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 border border-stone-deep hover:bg-stone transition-all" onClick={() => setEditingResult(null)}>
                  Cancel
                </button>
                <button type="submit" className="flex-[2] h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
