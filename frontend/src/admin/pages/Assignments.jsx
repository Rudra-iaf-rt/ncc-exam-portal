import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { PageHeader } from '../components/Shared';
import { 
  ShieldCheck, 
  Trash2, 
  Users as UsersIcon,
  UserCheck,
  Building2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function Assignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
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
      toast.error("Failed to load exam assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Revoke this examination authorization? The cadet will no longer be able to attempt this exam.")) return;
    try {
      await adminApi.deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
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

  return (
    <div>
      <PageHeader 
        title="Assigned *Cadets*"
        subtitle="Manage and track scheduled exams for cadets."
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
        <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm border-l-[4px] border-l-navy">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-4 font-bold">Total Authorized</span>
            <UsersIcon size={16} className="text-navy opacity-30" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-3xl font-medium text-navy">{assignments.length}</div>
            <span className="text-[11px] text-ink-4 font-ui">Active Records</span>
          </div>
        </div>
        
        <div className="bg-white border border-stone-deep p-5 rounded-md shadow-sm border-l-[4px] border-l-olive">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-4 font-bold">Scheduled Exams</span>
            <ShieldCheck size={16} className="text-olive opacity-30" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-3xl font-medium text-olive">{exams.filter(e => e.status === 'LIVE').length}</div>
            <span className="text-[11px] text-ink-4 font-ui">Active Exams</span>
          </div>
        </div>

        <div className="bg-stone-wash/50 border border-stone-deep border-dashed p-5 rounded-md flex flex-col justify-center">
          <div className="text-[11px] text-ink-4 italic font-ui">
            Need to deploy a new exam? 
          </div>
          <button 
            onClick={() => navigate('/admin/exams/schedule')}
            className="text-navy font-bold text-[12px] hover:underline mt-0.5 flex items-center gap-1"
          >
            Access Scheduling Wizard →
          </button>
        </div>
      </div>

      {/* Assignments Registry Table */}
      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone/50 border-b border-stone-deep font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3">
                <th className="font-bold px-5 py-3.5">Cadet</th>
                <th className="font-bold px-5 py-3.5">Wing</th>
                <th className="font-bold px-5 py-3.5">Batch</th>
                <th className="font-bold px-5 py-3.5">Authorized Exam</th>
                <th className="font-bold px-5 py-3.5">Deployment Date</th>
                <th className="font-bold px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13px] text-ink-2">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-16"><div className="animate-pulse text-ink-4 font-mono text-[12px]">Retrieving assignment records...</div></td></tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={32} />
                      <div className="text-ink-3 font-medium">No exam assignments found.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map(item => (
                  <tr key={item.id} className="border-b border-stone-mid hover:bg-stone-wash transition-all last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-bold text-navy">{item.user.name}</div>
                      <div className="font-mono text-[10px] text-ink-4 mt-0.5 uppercase tracking-wide">{item.user.regimentalNumber}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[8px] px-2 py-0.5 rounded-sm font-black tracking-widest border uppercase ${
                        item.user.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444410] text-[#b91c1c] border-[#b91c1c20]' :
                        item.user.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f610] text-[#1d4ed8] border-[#1d4ed820]' :
                        'bg-[#06b6d410] text-[#0891b2] border-[#0891b220]'
                      }`}>
                        {item.user.wing || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-ink-4">
                        <Calendar size={12} className="opacity-40" />
                        <span className="font-medium">{item.user.batch || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse"></div>
                        <div className="font-bold text-navy">{item.exam.title}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[11px] text-ink-4 font-mono flex items-center gap-1.5">
                        <Clock size={11} className="opacity-30" />
                        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        className="w-8 h-8 rounded-md flex items-center justify-center text-ink-4 hover:text-crimson hover:bg-crimson-wash transition-all border border-transparent hover:border-crimson/10" 
                        onClick={() => handleDelete(item.id)}
                        title="Revoke Authorization"
                      >
                        <Trash2 size={14} />
                      </button>
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
