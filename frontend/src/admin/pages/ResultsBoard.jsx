import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, examApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { toast } from 'sonner';
import { PageHeader, Pagination } from '../components/Shared';
import { Download, Search, Edit3, XCircle, ShieldAlert, ChevronDown, Loader2 } from 'lucide-react';
import { invalidateCachedResourcePattern } from '../../lib/resourceCache';
import CustomSelect from '../../components/CustomSelect';

// ─── MultiSelect Dropdown ────────────────────────────────────────────────────
function MultiSelect({ options, selectedValues, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    const strVal = String(val);
    if (selectedValues.includes(strVal)) {
      onChange(selectedValues.filter(v => v !== strVal));
    } else {
      onChange([...selectedValues, strVal]);
    }
  };

  const hasSelections = selectedValues.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <div
        className={`w-full min-h-[38px] px-3 py-1.5 border rounded-md font-ui text-[14px] bg-white flex flex-wrap gap-1 items-center cursor-pointer transition-all
          ${open ? 'border-navy-soft ring-[3px] ring-navy-wash' : 'border-stone-deep'}
        `}
        onClick={() => setOpen(!open)}
      >
        {!hasSelections ? (
          <span className="text-ink-4 flex-1 select-none">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.map(val => {
              const opt = options.find(o => String(o.value) === val);
              return (
                <span
                  key={val}
                  className="bg-navy/10 text-navy border border-navy/20 px-2 py-0.5 rounded text-[12px] flex items-center gap-1 font-medium"
                >
                  {opt?.label || val}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(selectedValues.filter(v => v !== val)); }}
                    className="text-navy/50 hover:text-crimson transition-colors"
                  >
                    <XCircle size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <ChevronDown
          size={14}
          className={`text-ink-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-deep rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.12)] z-30 max-h-[220px] overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-ink-4 text-center font-ui">Loading...</div>
          ) : (
            options.map(opt => {
              const isChecked = selectedValues.includes(String(opt.value));
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer font-ui text-[13px] border-b border-stone-mid last:border-0 transition-colors
                    ${isChecked ? 'bg-navy/5 text-navy font-medium' : 'hover:bg-stone-wash text-ink-2'}
                  `}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-stone-deep accent-navy cursor-pointer"
                    checked={isChecked}
                    onChange={() => toggle(opt.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {opt.label}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton row for loading state ─────────────────────────────────────────
function SkeletonRow({ cols = 7 }) {
  return (
    <tr className="border-b border-stone-mid animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-stone-mid rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ResultsBoard() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    college: [],
    exam: [],
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    sort: searchParams.get('sort') || 'default',
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // ── Dropdown option lists ─────────────────────────────────────────────────
  const [collegesList, setCollegesList] = useState([]);
  const [examsList, setExamsList] = useState([]);

  // ── Results data ──────────────────────────────────────────────────────────
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  // ── Export modal ──────────────────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    includeAverage: true,
    sortBy: 'Name',
    sortOrder: 'asc',
  });

  // ── Override modal ────────────────────────────────────────────────────────
  const [editingResult, setEditingResult] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ score: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  // ── Load dropdown lists once ──────────────────────────────────────────────
  useEffect(() => {
    adminApi.getColleges()
      .then(res => setCollegesList(res.data?.colleges || []))
      .catch(err => console.error('Failed to load colleges', err));

    adminApi.getExams()
      .then(res => setExamsList(res.data?.exams || []))
      .catch(err => console.error('Failed to load exams', err));
  }, []);

  // ── 300ms debounce on search ──────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // ── Reset page when non-search filters change ─────────────────────────────
  const collegeKey = filters.college.join(',');
  const examKey = filters.exam.join(',');
  useEffect(() => { setPage(1); }, [collegeKey, examKey, filters.status, filters.sort]);

  // ── Core fetch function ───────────────────────────────────────────────────
  const fetchResults = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        search: debouncedSearch,
        status: filters.status,
        sort: filters.sort,
      };
      if (filters.college.length > 0) params.collegeCodes = filters.college.join(',');
      if (filters.exam.length > 0) params.examIds = filters.exam.join(',');

      const response = await examApi.getResults(params);
      if (!controller.signal.aborted) {
        setResults(response?.data?.results || []);
        setPagination(response?.data?.pagination || { totalPages: 1, total: 0 });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Failed to fetch results', err);
        toast.error('Failed to load results.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, debouncedSearch, collegeKey, examKey, filters.status, filters.sort]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // ── Score override ────────────────────────────────────────────────────────
  const handleOverride = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.updateResult(editingResult.id, {
        score: parseInt(overrideForm.score),
        reason: overrideForm.reason,
      });
      toast.success('Score updated successfully.');
      invalidateCachedResourcePattern('admin-results-board');
      setEditingResult(null);
      setOverrideForm({ score: '', reason: '' });
      fetchResults();
    } catch (err) {
      toast.error(err.message || 'Failed to update score.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk export ───────────────────────────────────────────────────────────
  const handleExportSubmit = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Generating export...', { id: 'export-toast' });
      const params = {
        search: debouncedSearch,
        status: filters.status,
        sort: filters.sort,
        includeAverage: exportSettings.includeAverage,
        sortBy: exportSettings.sortBy,
        sortOrder: exportSettings.sortOrder,
      };
      if (filters.college.length > 0) params.collegeCodes = filters.college.join(',');
      if (filters.exam.length > 0) params.examIds = filters.exam.join(',');

      const response = await examApi.exportBulkAdminResults(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NCC_Results_Export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!', { id: 'export-toast' });
      setShowExportModal(false);
    } catch (err) {
      toast.error('Failed to export data.', { id: 'export-toast' });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const collegeOptions = collegesList.map(c => ({ value: c.code, label: c.name }));
  const examOptions = examsList.map(e => ({ value: e.id, label: e.title }));
  const activeFilterCount = filters.college.length + filters.exam.length
    + (filters.status !== 'all' ? 1 : 0)
    + (debouncedSearch ? 1 : 0);
  const clearAllFilters = () => setFilters({ college: [], exam: [], search: '', status: 'all', sort: 'default' });

  const colCount = isAdmin ? 8 : 7;

  return (
    <div>
      <PageHeader
        title="Results & *Intelligence*"
        subtitle="Consolidated performance report across all unit training centres."
        action={
          <button
            className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid"
            onClick={() => setShowExportModal(true)}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>Export Report</span>
          </button>
        }
      />

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">Filter Records</span>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="font-ui text-[12px] text-crimson hover:underline flex items-center gap-1"
            >
              <XCircle size={12} />
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* College */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">
              College
              {filters.college.length > 0 && (
                <span className="ml-2 bg-navy text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">{filters.college.length}</span>
              )}
            </label>
            <MultiSelect
              options={collegeOptions}
              selectedValues={filters.college}
              onChange={(vals) => setFilters(f => ({ ...f, college: vals }))}
              placeholder="All colleges"
            />
          </div>

          {/* Exam */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">
              Examination
              {filters.exam.length > 0 && (
                <span className="ml-2 bg-navy text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">{filters.exam.length}</span>
              )}
            </label>
            <MultiSelect
              options={examOptions}
              selectedValues={filters.exam}
              onChange={(vals) => setFilters(f => ({ ...f, exam: vals }))}
              placeholder="All examinations"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Search Cadet</label>
            <div className="relative">
              <input
                className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                placeholder="Name or Regimental No..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Sort</label>
            <CustomSelect
              value={filters.sort}
              onChange={(val) => setFilters(f => ({ ...f, sort: val }))}
              options={[
                { value: "default", label: "Newest First" },
                { value: "score_desc", label: "Score (High to Low)" }
              ]}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Status</label>
            <CustomSelect
              value={filters.status}
              onChange={(val) => setFilters(f => ({ ...f, status: val }))}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "distinction", label: "Distinction (≥ 70%)" },
                { value: "qualified", label: "Qualified (40% – 69%)" },
                { value: "not_clear", label: "Not Clear (< 40%)" }
              ]}
            />
          </div>
        </div>

        {/* Active filter summary pills */}
        {activeFilterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-mid flex flex-wrap gap-2 items-center">
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-4">Active:</span>
            {filters.college.map(v => {
              const opt = collegeOptions.find(o => String(o.value) === v);
              return (
                <span key={v} className="inline-flex items-center gap-1 bg-stone text-ink-2 border border-stone-deep font-ui text-[11px] px-2 py-0.5 rounded-full">
                  {opt?.label || v}
                  <XCircle size={10} className="cursor-pointer hover:text-crimson" onClick={() => setFilters(f => ({ ...f, college: f.college.filter(x => x !== v) }))} />
                </span>
              );
            })}
            {filters.exam.map(v => {
              const opt = examOptions.find(o => String(o.value) === v);
              return (
                <span key={v} className="inline-flex items-center gap-1 bg-stone text-ink-2 border border-stone-deep font-ui text-[11px] px-2 py-0.5 rounded-full">
                  {opt?.label || v}
                  <XCircle size={10} className="cursor-pointer hover:text-crimson" onClick={() => setFilters(f => ({ ...f, exam: f.exam.filter(x => x !== v) }))} />
                </span>
              );
            })}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-stone text-ink-2 border border-stone-deep font-ui text-[11px] px-2 py-0.5 rounded-full">
                Status: {filters.status.replace('_', ' ')}
                <XCircle size={10} className="cursor-pointer hover:text-crimson" onClick={() => setFilters(f => ({ ...f, status: 'all' }))} />
              </span>
            )}
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 bg-stone text-ink-2 border border-stone-deep font-ui text-[11px] px-2 py-0.5 rounded-full">
                "{debouncedSearch}"
                <XCircle size={10} className="cursor-pointer hover:text-crimson" onClick={() => setFilters(f => ({ ...f, search: '' }))} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Results Table ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10">
        {/* Table-level loading bar */}
        {loading && (
          <div className="h-[3px] bg-stone-mid overflow-hidden">
            <div className="h-full bg-navy animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ width: '60%', animation: 'progress-bar 1.2s ease-in-out infinite' }} />
          </div>
        )}
        <style>{`
          @keyframes progress-bar {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3">Cadet Name</th>
                <th className="font-normal px-4 py-3">Regimental No.</th>
                <th className="font-normal px-4 py-3">College</th>
                <th className="font-normal px-4 py-3">Exam</th>
                <th className="font-normal px-4 py-3">Score</th>
                <th className="font-normal px-4 py-3">Status</th>
                <th className="font-normal px-2 py-3">Violations</th>
                {isAdmin && <th className="font-normal px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className={`font-ui text-[13.5px] text-ink-2 transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              {loading && results.length === 0 ? (
                // Skeleton rows on first load
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-center p-16 text-ink-4 font-light">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={28} strokeWidth={1} className="text-stone-deep" />
                      <span>No records match the selected filters.</span>
                      {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="mt-1 text-[13px] text-navy underline">Clear filters</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.studentName}</div>
                      <div className="text-[11px] text-ink-4 font-light">{r.college}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-[12px] text-ink-3 tracking-wide">{r.regimentalNumber}</code>
                    </td>
                    <td className="px-4 py-3 text-[13px]">{r.college}</td>
                    <td className="px-4 py-3 text-[13px]">{r.examTitle}</td>
                    <td className={`px-4 py-3 font-semibold ${r.score >= 70 ? 'text-[#3B6D11]' : r.score < 40 ? 'text-crimson' : 'text-ink'}`}>
                      {r.score}%
                    </td>
                    <td className="px-4 py-3">
                      {r.score >= 70 ? (
                        <span className="font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex bg-[#3b6d1120] text-[#3B6D11] border border-[#3b6d1130]">Distinction</span>
                      ) : r.score >= 40 ? (
                        <span className="font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex bg-[#10b98120] text-[#059669] border border-[#10b98130]">Qualified</span>
                      ) : (
                        <span className="font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex bg-[#ef444420] text-[#b91c1c] border border-[#b91c1c30]">Not Clear</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.violationCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-bold bg-rose-500/10 text-rose-600 border border-rose-500/25"
                          title={`${r.violationCount} anti-cheat violation${r.violationCount > 1 ? 's' : ''} recorded`}
                        >
                          <ShieldAlert size={10} />
                          {r.violationCount} Violation{r.violationCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-ink-4">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-navy-soft hover:bg-stone hover:text-navy transition-colors"
                          onClick={() => { setEditingResult(r); setOverrideForm({ score: r.score, reason: '' }); }}
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

        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          onPageChange={setPage}
          loading={loading}
        />
      </div>

      {/* ── Export Settings Modal ───────────────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[400px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Download size={20} className="text-navy" />
                <h2 className="m-0 font-ui text-[18px] font-semibold text-navy">Export Settings</h2>
              </div>
              <button className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" onClick={() => setShowExportModal(false)}>
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleExportSubmit} className="p-6">
              <div className="mb-5 p-3 bg-stone rounded-lg text-[12px] text-ink-3 font-ui border border-stone-mid">
                Will export <strong className="text-ink">{pagination.total ?? 'all'}</strong> records with current filters applied.
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-deep accent-navy"
                    checked={exportSettings.includeAverage}
                    onChange={(e) => setExportSettings(s => ({ ...s, includeAverage: e.target.checked }))}
                  />
                  <span className="font-ui text-[14px] text-ink-2">Include Average Score column</span>
                </label>
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Sort By</label>
                <CustomSelect
                  value={exportSettings.sortBy}
                  onChange={(val) => setExportSettings(s => ({ ...s, sortBy: val }))}
                  options={[
                    { value: "Average", label: "Average Score" },
                    { value: "Name", label: "Student Name" }
                  ]}
                />
              </div>
              <div className="mb-6">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Order</label>
                <CustomSelect
                  value={exportSettings.sortOrder}
                  onChange={(val) => setExportSettings(s => ({ ...s, sortOrder: val }))}
                  options={[
                    { value: "asc", label: "Ascending (A–Z / Low to High)" },
                    { value: "desc", label: "Descending (Z–A / High to Low)" }
                  ]}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" className="flex-1 h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 border border-stone-deep hover:bg-stone transition-all" onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="flex-[2] h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all">
                  <Download size={14} />
                  Generate CSV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Override Modal ──────────────────────────────────────────────────── */}
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
              <div className="mb-5 p-3 bg-stone rounded-lg border-l-4 border-l-navy border border-stone-mid">
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-4 mb-1">Target Cadet</div>
                <div className="font-semibold text-navy">{editingResult.studentName}</div>
                <div className="text-[12px] text-ink-3">{editingResult.examTitle}</div>
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Revised Score (%)</label>
                <input
                  type="number"
                  className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                  min="-100" max="100" required
                  value={overrideForm.score}
                  onChange={e => setOverrideForm(f => ({ ...f, score: e.target.value }))}
                />
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Reason for Override</label>
                <textarea
                  className="w-full p-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all min-h-[80px] resize-none"
                  placeholder="e.g. Technical error during submission..."
                  required
                  value={overrideForm.reason}
                  onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
                />
                <div className="text-[10px] text-ink-4 mt-1 font-ui">* This action will be recorded in the HQ audit logs.</div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" className="flex-1 h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-transparent text-ink-2 border border-stone-deep hover:bg-stone transition-all" onClick={() => setEditingResult(null)}>
                  Cancel
                </button>
                <button type="submit" className="flex-[2] h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting}>
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
