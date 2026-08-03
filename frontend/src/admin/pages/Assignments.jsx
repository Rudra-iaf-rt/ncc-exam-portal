import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { PageHeader, Pagination, StatCard } from '../components/Shared';
import { invalidateCachedResource } from '../../lib/resourceCache';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { 
  ShieldCheck, 
  Trash2, 
  Users as UsersIcon,
  UserCheck,
  Calendar,
  Search,
  Clock
} from 'lucide-react';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function Assignments() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, loading } = useCachedFetch(
    'admin-assignments',
    async () => {
      const [assignRes, examRes] = await Promise.all([
        adminApi.getAssignments(),
        adminApi.getExams()
      ]);
      return {
        assignments: assignRes.data || [],
        exams: examRes.data?.exams || [],
      };
    },
    { staleTimeMs: 2 * 60 * 1000 }
  );
  const assignments = data?.assignments || [];
  const exams = data?.exams || [];

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Revoke Authorization',
      message: 'Revoke this examination authorization? The cadet will no longer be able to attempt this exam.',
      confirmText: 'Revoke',
      isDanger: true
    });
    if (!confirmed) return;
    try {
      await adminApi.deleteAssignment(id);
      invalidateCachedResource('admin-assignments');
      toast.success("Authorization revoked successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to revoke authorization");
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user.regimentalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredAssignments.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedAssignments = filteredAssignments.slice((page - 1) * limit, page * limit);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return (
    <div>
      <PageHeader 
        title="Exam *Assignments*"
        subtitle="Manage and track authorized examinations for cadets."
        action={
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" size={14} />
              <input 
                type="text" 
                placeholder="Search assignments..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-[36px] pl-9 pr-4 bg-white border border-stone-deep rounded-md font-ui text-[13px] outline-none focus:border-navy-soft transition-all w-[200px]"
              />
            </div>
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid" 
              onClick={() => navigate('/admin/exams/schedule')}
            >
              <UserCheck size={16} strokeWidth={1.5} />
              <span>Schedule Exams</span>
            </button>
          </div>
        }
      />

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="transition-transform duration-200 hover:scale-[1.02]">
          <StatCard 
            label="Total Authorized" 
            value={assignments.length} 
            subtext="Active Records"
            icon={<UsersIcon size={18} strokeWidth={1.5} />}
            colorClass="text-navy"
          />
        </div>
        
        <div className="transition-transform duration-200 hover:scale-[1.02]">
          <StatCard 
            label="Scheduled Exams" 
            value={exams.filter(e => e.status === 'LIVE').length} 
            subtext="Active Exams"
            icon={<ShieldCheck size={18} strokeWidth={1.5} />}
            colorClass="text-olive"
          />
        </div>

        <div className="bg-stone-wash/50 border border-stone-deep border-dashed p-5 rounded-md flex flex-col justify-center transition-transform duration-200 hover:scale-[1.02]">
          <div className="text-[11px] text-ink-4 italic font-ui">
            Bulk schedule exams via the background queue.
          </div>
          <button 
            onClick={() => navigate('/admin/exams/schedule')}
            className="text-navy font-bold text-[12px] hover:underline mt-0.5 flex items-center gap-1"
          >
            Access Bulk Scheduler →
          </button>
        </div>
      </div>

      {/* Assignments Registry Table */}
      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3 w-[80px]">ID</th>
                <th className="font-normal px-4 py-3">Cadet</th>
                <th className="font-normal px-4 py-3">Wing</th>
                <th className="font-normal px-4 py-3">Batch</th>
                <th className="font-normal px-4 py-3">Authorized Exam</th>
                <th className="font-normal px-4 py-3">Deployment Date</th>
                <th className="font-normal px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-16"><div className="animate-pulse text-ink-4 font-mono text-[12px]">Retrieving assignment records...</div></td></tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={32} />
                      <div className="text-ink-3 font-medium">No exam assignments found.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map(item => (
                  <tr key={item.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3"><code className="font-mono text-[12px] bg-transparent p-0 text-ink-3">#{item.id.toString().padStart(3, '0')}</code></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{item.user.name}</div>
                      <div className="font-mono text-[10px] text-ink-4 mt-0.5 uppercase tracking-wide">{item.user.regimentalNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[8px] px-2 py-0.5 rounded-sm font-black tracking-widest border uppercase ${
                        item.user.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444410] text-[#b91c1c] border-[#b91c1c20]' :
                        item.user.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f610] text-[#1d4ed8] border-[#1d4ed820]' :
                        'bg-[#06b6d410] text-[#0891b2] border-[#0891b220]'
                      }`}>
                        {item.user.wing || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-ink-4">
                        <Calendar size={12} className="opacity-40" />
                        <span className="font-medium">{item.user.batch || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{item.exam.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink-3 flex items-center gap-1.5">
                        <Clock size={12} className="opacity-40" />
                        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-crimson hover:bg-crimson-wash transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={() => handleDelete(item.id)}
                          title="Revoke Authorization"
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
        <Pagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalItems={totalItems}
          onPageChange={setPage} 
          loading={loading} 
        />
      </div>
    </div>
  );
}
