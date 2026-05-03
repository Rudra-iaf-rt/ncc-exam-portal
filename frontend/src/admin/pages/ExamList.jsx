import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import { examApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { PageHeader } from '../components/Shared';
import { Plus, Eye, ShieldAlert, Edit3, Trash2, UserCheck } from 'lucide-react';

export default function ExamList() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      try {
        const { data } = await examApi.getExams();
        if (data) setExams(data.exams);
      } catch (error) {
        console.error('Failed to fetch exams:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    if (!isAdmin) return;
    try {
      await examApi.updateExamStatus(id, newStatus);
      setExams(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
      toast.success(`Exam status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || "Failed to update exam status");
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this exam? This will also purge all related student attempts and results. This action cannot be undone.")) return;
    
    try {
      await examApi.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
      toast.success("Exam successfully deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete exam");
    }
  };

  if (loading) {
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
                        <select 
                          className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex border-none outline-none cursor-pointer appearance-none text-center ${
                            e.status === 'LIVE' ? 'bg-[#10b98120] text-[#059669]' : 
                            e.status === 'DRAFT' ? 'bg-[#f59e0b20] text-[#b45309]' : 
                            'bg-stone-mid text-ink-3'
                          }`}
                          value={e.status}
                          onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="LIVE">LIVE</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
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
                            <NavLink 
                              to={`/admin/exams/edit/${e.id}`}
                              className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-navy hover:bg-stone transition-colors" 
                              title="Edit Exam"
                            >
                              <Edit3 size={16} strokeWidth={1.5} />
                            </NavLink>
                            <button 
                              className="w-8 h-8 rounded-md flex items-center justify-center text-crimson hover:bg-crimson-wash transition-colors" 
                              title="Delete Exam"
                              onClick={() => handleDelete(e.id)}
                            >
                              <Trash2 size={16} strokeWidth={1.5} />
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
      </div>
    </div>
  );
}
