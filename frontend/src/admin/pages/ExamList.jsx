import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import { examApi } from '../../api';
import { PageHeader } from '../components/Shared';
import { Plus, Eye, Info, ShieldAlert, Edit3, Trash2 } from 'lucide-react';

export default function ExamList() {
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

  const CreateAction = (
    <NavLink to="/admin/exams/create" className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid">
      <Plus size={16} strokeWidth={1.5} />
      <span>Create New Exam</span>
    </NavLink>
  );

  const handleStatusChange = async (id, newStatus) => {
    try {
      await examApi.updateExamStatus(id, newStatus);
      setExams(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
      toast.success(`Exam status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || "Failed to update exam status");
    }
  };

  const handleDelete = async (id) => {
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
    return <div className="p-10 text-ink-4 font-mono text-[13px]">Loading exam registry...</div>;
  }

  return (
    <div>
      <PageHeader 
        title="Manage *Exams*" 
        subtitle="Catalog of all training and certificate examinations available in the system." 
        action={CreateAction}
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
                <th className="font-normal px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-ink-4 font-light">
                    No exams found. Create your first exam to get started.
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
                        <button 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-ink-3 hover:text-navy hover:bg-stone transition-colors" 
                          title="Edit (Coming Soon)"
                          onClick={() => toast.info("Exam editing is currently restricted to creation. Please contact system admin for modifications.")}
                        >
                          <Edit3 size={16} strokeWidth={1.5} />
                        </button>
                        <button 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-crimson hover:bg-crimson-wash transition-colors" 
                          title="Delete Exam"
                          onClick={() => handleDelete(e.id)}
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* System Policy */}
      <div className="bg-white border border-stone-deep rounded-md mt-8 p-5 border-l-4 border-l-gold shadow-sm">
        <div className="flex gap-4">
          <ShieldAlert size={20} className="text-gold" />
          <div>
            <div className="font-semibold text-[14px] text-navy font-ui">System Policy</div>
            <div className="text-[13px] text-ink-4 mt-1 leading-[1.5] font-ui">
              Modification of active exams is currently restricted. New exams can be created via the 'Create New Exam' button. 
              To delete or modify existing records, please contact the system administrator.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
