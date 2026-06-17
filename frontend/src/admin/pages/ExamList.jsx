import { useState } from 'react';
import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import { examApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { PageHeader, Pagination } from '../components/Shared';
import { Plus, Eye, ShieldAlert, Edit3, Trash2, UserCheck, Loader2 } from 'lucide-react';
import { invalidateCachedResourcePattern, getCachedResource, setCachedResource } from '../../lib/resourceCache';
import { useCachedFetch } from '../../hooks/useCachedFetch';

export default function ExamList() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [processingItems, setProcessingItems] = useState(new Set());
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

  const handlePublishResults = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to publish results for this exam? This will allow all students to view their scores and detailed breakdown.")) return;
    
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

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this exam? This will also purge all related student attempts and results. This action cannot be undone.")) return;
    
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

  if (loading && exams.length === 0) {
    return <div className="p-10 text-ink-4 font-mono text-[13px]">Accessing exam list...</div>;
  }

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
                          <select 
                            className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex border-none outline-none cursor-pointer appearance-none text-center ${
                              e.status === 'LIVE' ? 'bg-[#10b98120] text-[#059669]' : 
                              e.status === 'DRAFT' ? 'bg-[#f59e0b20] text-[#b45309]' : 
                              'bg-stone-mid text-ink-3'
                            } disabled:opacity-50`}
                            value={e.status}
                            disabled={processingItems.has(`status-${e.id}`)}
                            onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="LIVE">LIVE</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                          {processingItems.has(`status-${e.id}`) && <Loader2 size={14} className="animate-spin text-ink-4" />}
                        </div>
                      ) : (
                        <span className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex border border-stone-deep text-center ${
                          e.status === 'LIVE' ? 'bg-[#10b98120] text-[#059669]' : 
                          e.status === 'DRAFT' ? 'bg-[#f59e0b20] text-[#b45309]' : 
                          'bg-stone-mid text-ink-3'
                        }`}>
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
                            <NavLink 
                              to={`/admin/exams/schedule?examId=${e.id}`}
                              className="h-[28px] px-2.5 rounded bg-navy/5 text-navy border border-navy/10 hover:bg-navy hover:text-white transition-all flex items-center gap-1.5 font-medium text-[11px]" 
                              title="Schedule Examination"
                            >
                              <UserCheck size={14} strokeWidth={2} />
                              <span>Schedule</span>
                            </NavLink>
                            {e.status === 'COMPLETED' && !e.resultsPublished && (
                              <button 
                                onClick={() => handlePublishResults(e.id)}
                                disabled={processingItems.has(`publish-${e.id}`)}
                                className="h-[28px] px-2.5 rounded bg-[#10b98120] text-[#059669] border border-[#10b98140] hover:bg-[#10b981] hover:text-white transition-all flex items-center gap-1.5 font-medium text-[11px] disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Publish Results"
                              >
                                {processingItems.has(`publish-${e.id}`) ? <Loader2 size={14} className="animate-spin" /> : null}
                                <span>{processingItems.has(`publish-${e.id}`) ? 'Publishing...' : 'Publish Results'}</span>
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
    </div>
  );
}
