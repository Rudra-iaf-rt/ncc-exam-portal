import React, { useState, useRef, useEffect } from 'react';
import PageLoader from '../../components/PageLoader';

import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import { examApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { PageHeader, Pagination } from '../components/Shared';
import { Plus, Eye, ShieldAlert, Edit3, Trash2, UserCheck, Loader2, MonitorPlay, BarChart, AlertTriangle, XCircle, ChevronDown, Check, FileEdit, Radio, CheckCircle2, Archive, Send } from 'lucide-react';
import { invalidateCachedResourcePattern, getCachedResource, setCachedResource } from '../../lib/resourceCache';
import { useCachedFetch } from '../../hooks/useCachedFetch';

function StatusDropdown({ status, disabled, onChange, processing }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statuses = [
    { value: 'DRAFT', label: 'DRAFT', icon: FileEdit, colorClass: 'text-[#b45309] bg-[#f59e0b20]' },
    { value: 'LIVE', label: 'LIVE', icon: Radio, colorClass: 'text-[#059669] bg-[#10b98120]' },
    { value: 'COMPLETED', label: 'COMPLETED', icon: CheckCircle2, colorClass: 'text-[#2563eb] bg-[#2563eb20]' },
    { value: 'ARCHIVED', label: 'ARCHIVED', icon: Archive, colorClass: 'text-ink-3 bg-stone-mid' }
  ];

  const current = statuses.find(s => s.value === status) || statuses[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between gap-1.5 font-mono text-[10px] tracking-[0.06em] py-1 pl-2.5 pr-2 rounded-full font-medium border transition-all duration-200 outline-none
          ${current.colorClass} 
          ${!disabled ? 'hover:shadow-sm cursor-pointer border-black/5 hover:border-black/10' : 'opacity-70 cursor-not-allowed border-transparent'}
        `}
      >
        <span className="flex items-center gap-1.5">
          {processing ? <Loader2 size={12} className="animate-spin" /> : <CurrentIcon size={12} strokeWidth={2.5} />}
          {current.label}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div 
          className="absolute z-50 mt-1.5 w-36 left-0 origin-top-left bg-white rounded-xl shadow-[0_12px_40px_rgb(0,0,0,0.12)] border border-stone-deep p-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex flex-col gap-0.5">
            {statuses.map((s) => {
              const Icon = s.icon;
              const isSelected = s.value === status;
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    onChange(s.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg transition-colors text-[11px] font-mono tracking-[0.03em]
                    ${isSelected ? 'bg-stone-wash text-navy font-semibold' : 'text-ink-3 hover:bg-stone-wash hover:text-ink-2'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={13} strokeWidth={2.5} className={isSelected ? s.colorClass.split(' ')[0] : 'opacity-50'} />
                    {s.label}
                  </span>
                  {isSelected && <Check size={14} strokeWidth={2.5} className="text-navy" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamList() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [processingItems, setProcessingItems] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const limit = 20;

  const addProcessing = (key) => setProcessingItems(prev => new Set(prev).add(key));
  const removeProcessing = (key) => setProcessingItems(prev => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });

  const { data, loading } = useCachedFetch(
    `admin-exam-list:p${page}`,
    async () => {
      const response = await examApi.getExams({ page, limit });
      return { 
        exams: response?.data?.exams || [],
        pagination: response?.data?.pagination || { totalPages: 1 }
      };
    },
    { staleTimeMs: 2 * 60 * 1000 }
  );
  const exams = data?.exams || [];
  const pagination = data?.pagination || { totalPages: 1 };

  const handleStatusChange = async (id, newStatus) => {
    if (!isAdmin) return;
    
    const procKey = `status-${id}`;
    addProcessing(procKey);

    // Optimistic Update
    const cacheKey = `admin-exam-list:p${page}`;
    const previousData = getCachedResource(cacheKey);
    if (previousData && previousData.exams) {
      const updatedExams = previousData.exams.map(e => e.id === id ? { ...e, status: newStatus } : e);
      setCachedResource(cacheKey, { ...previousData, exams: updatedExams });
    }

    try {
      await examApi.updateExamStatus(id, newStatus);
      invalidateCachedResourcePattern('admin-exam-list');
      toast.success(`Exam status updated to ${newStatus}`);
    } catch (err) {
      // Revert if error
      if (previousData) {
        setCachedResource(cacheKey, previousData);
      }
      toast.error(err.message || "Failed to update exam status");
    } finally {
      removeProcessing(procKey);
    }
  };

  const handlePublishResults = (id) => {
    if (!isAdmin) return;
    setConfirmAction({ type: 'publish', id });
  };

  const executePublishResults = async (id) => {
    const procKey = `publish-${id}`;
    addProcessing(procKey);

    // Optimistic Update
    const cacheKey = `admin-exam-list:p${page}`;
    const previousData = getCachedResource(cacheKey);
    if (previousData && previousData.exams) {
      const updatedExams = previousData.exams.map(e => e.id === id ? { ...e, resultsPublished: true } : e);
      setCachedResource(cacheKey, { ...previousData, exams: updatedExams });
    }

    try {
      await examApi.publishResults(id);
      invalidateCachedResourcePattern('admin-exam-list');
      toast.success("Exam results successfully published!");
    } catch (err) {
      // Revert if error
      if (previousData) {
        setCachedResource(cacheKey, previousData);
      }
      toast.error(err.message || "Failed to publish results");
    } finally {
      removeProcessing(procKey);
    }
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    setConfirmAction({ type: 'delete', id });
  };

  const executeDelete = async (id) => {
    const procKey = `delete-${id}`;
    addProcessing(procKey);

    try {
      await examApi.deleteExam(id);
      invalidateCachedResourcePattern('admin-exam-list');
      toast.success("Exam successfully deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete exam");
    } finally {
      removeProcessing(procKey);
    }
  };

  const isInitialLoading = loading && exams.length === 0;

  return (
    <div>
      <PageHeader 
        title="Exam *Management*" 
        subtitle={isAdmin ? "List of all exams available in the system." : "Scheduled examinations."}
        action={isAdmin && (
          <NavLink to="/admin/exams/create" className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid">
            <Plus size={16} strokeWidth={1.5} />
            <span>Create New Exam</span>
          </NavLink>
        )}
      />

      {isInitialLoading ? (
        <PageLoader text="Accessing exam list..." />
      ) : (
        <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3 w-[80px]">ID</th>
                <th className="font-normal px-4 py-3">Exam Title</th>
                <th className="font-normal px-4 py-3">Duration</th>
                <th className="font-normal px-4 py-3">Questions</th>
                <th className="font-normal px-4 py-3">Status</th>
                <th className="font-normal px-4 py-3">College</th>
                {isAdmin && <th className="font-normal px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-12 text-ink-4 font-light">
                    No active exams found in the database.
                  </td>
                </tr>
              ) : (
                exams.map((e) => (
                  <tr key={e.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3"><code className="font-mono text-[12px] bg-transparent p-0 text-ink-3">#{e.id.toString().padStart(3, '0')}</code></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{e.title}</div>
                    </td>
                    <td className="px-4 py-3">{e.duration} Minutes</td>
                    <td className="px-4 py-3">{e.questionCount} Items</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <StatusDropdown 
                            status={e.status}
                            disabled={processingItems.has(`status-${e.id}`)}
                            processing={processingItems.has(`status-${e.id}`)}
                            onChange={(newStatus) => handleStatusChange(e.id, newStatus)}
                          />
                        </div>
                      ) : (
                        <span className={`font-mono text-[10px] tracking-[0.06em] py-1 pl-2.5 pr-2.5 rounded-full font-medium inline-flex items-center gap-1.5 border border-stone-deep text-center ${
                          e.status === 'LIVE' ? 'bg-[#10b98120] text-[#059669]' : 
                          e.status === 'DRAFT' ? 'bg-[#f59e0b20] text-[#b45309]' : 
                          e.status === 'COMPLETED' ? 'bg-[#2563eb20] text-[#2563eb]' :
                          'bg-stone-mid text-ink-3'
                        }`}>
                          {e.status === 'DRAFT' && <FileEdit size={12} strokeWidth={2.5} />}
                          {e.status === 'LIVE' && <Radio size={12} strokeWidth={2.5} />}
                          {e.status === 'COMPLETED' && <CheckCircle2 size={12} strokeWidth={2.5} />}
                          {e.status === 'ARCHIVED' && <Archive size={12} strokeWidth={2.5} />}
                          {e.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.creator?.college ? (
                        <span className="font-mono text-[10px] tracking-[0.05em] py-1 px-2.5 rounded-full font-medium inline-flex bg-stone-mid text-ink-3 border border-stone-deep">
                          {e.creator.college}
                        </span>
                      ) : (
                        <span className="text-ink-4 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <NavLink 
                          to={`/admin/results?exam=${encodeURIComponent(e.title)}`} 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-navy hover:bg-stone transition-colors" 
                          title="View Detailed Results"
                        >
                          <Eye size={16} strokeWidth={1.5} />
                        </NavLink>
                        {isAdmin && (
                          <>
                            {e.status === 'LIVE' && (
                              <NavLink 
                                to={`/admin/exams/${e.id}/monitor`}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-blue-600 hover:bg-stone transition-colors" 
                                title="Live Monitor"
                              >
                                <MonitorPlay size={16} strokeWidth={1.5} />
                              </NavLink>
                            )}
                            {['COMPLETED', 'ARCHIVED'].includes(e.status) && (
                              <NavLink 
                                to={`/admin/exams/${e.id}/analytics`}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-olive hover:bg-stone transition-colors" 
                                title="Exam Analytics"
                              >
                                <BarChart size={16} strokeWidth={1.5} />
                              </NavLink>
                            )}
                            <NavLink 
                              to={`/admin/exams/schedule?examId=${e.id}`}
                              className="group h-[28px] px-2.5 rounded-md bg-navy/5 text-navy border border-navy/10 hover:bg-navy hover:text-white transition-all flex items-center gap-1.5 font-medium text-[11px] whitespace-nowrap flex-shrink-0 overflow-hidden" 
                              title="Schedule Examination"
                            >
                              <UserCheck size={14} strokeWidth={2} className="transition-transform group-hover:scale-110" />
                              <span>Schedule</span>
                            </NavLink>
                            {e.status === 'COMPLETED' && !e.resultsPublished && (
                              <button 
                                type="button"
                                onClick={() => handlePublishResults(e.id)}
                                disabled={processingItems.has(`publish-${e.id}`)}
                                className="group relative h-[28px] px-2.5 rounded-md bg-[#10b98115] text-[#059669] border border-[#10b98130] hover:bg-[#10b981] hover:border-[#10b981] hover:text-white transition-all flex items-center justify-center gap-1.5 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0" 
                                title="Publish Results"
                              >
                                {processingItems.has(`publish-${e.id}`) ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="font-medium text-[11px]">Publishing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={13} strokeWidth={2.5} className="transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" />
                                    <span className="font-medium text-[11px]">Publish</span>
                                  </>
                                )}
                              </button>
                            )}
                            <NavLink 
                              to={`/admin/exams/edit/${e.id}`}
                              className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-navy hover:bg-stone transition-colors" 
                              title="Edit Exam"
                            >
                              <Edit3 size={16} strokeWidth={1.5} />
                            </NavLink>
                            <button 
                              className="w-8 h-8 rounded-md flex items-center justify-center text-crimson hover:bg-crimson-wash transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                              title="Delete Exam"
                              disabled={processingItems.has(`delete-${e.id}`)}
                              onClick={() => handleDelete(e.id)}
                            >
                              {processingItems.has(`delete-${e.id}`) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.5} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
      )}

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[400px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className={confirmAction.type === 'delete' ? "text-crimson" : "text-navy"} />
                <h2 className="m-0 font-ui text-[18px] font-semibold text-navy">
                  {confirmAction.type === 'delete' ? 'Delete Exam' : 'Publish Results'}
                </h2>
              </div>
              <button 
                className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors" 
                onClick={() => setConfirmAction(null)}
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="font-ui text-[14px] text-ink-2 mb-6">
                {confirmAction.type === 'delete' 
                  ? "Are you sure you want to delete this exam? This will also purge all related student attempts and results. This action cannot be undone."
                  : "Are you sure you want to publish results for this exam? This will allow all students to view their scores and detailed breakdown."
                }
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 font-ui text-[13px] font-medium text-ink-3 hover:text-ink bg-white border border-stone-deep rounded-md hover:bg-stone-light transition-colors"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 font-ui text-[13px] font-medium text-white rounded-md transition-colors ${
                    confirmAction.type === 'delete' 
                      ? "bg-crimson hover:bg-crimson/90" 
                      : "bg-navy hover:bg-navy/90"
                  }`}
                  onClick={() => {
                    const id = confirmAction.id;
                    const type = confirmAction.type;
                    setConfirmAction(null);
                    if (type === 'delete') {
                      executeDelete(id);
                    } else {
                      executePublishResults(id);
                    }
                  }}
                >
                  {confirmAction.type === 'delete' ? 'Delete Exam' : 'Publish Results'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
