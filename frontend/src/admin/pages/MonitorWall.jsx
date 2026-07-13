import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppNavigation } from '../../contexts/NavigationContext';
import { toast } from 'sonner';
import { adminApi, examApi } from '../../api';
import { PageHeader, StatCard } from '../components/Shared';
import { 
  MonitorPlay,
  ShieldAlert,
  Clock,
  ArrowLeft,
  UserCheck,
  RefreshCw,
  PlusCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '../../cadet/hooks/useAuth';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function MonitorWall() {
  const confirm = useConfirm();
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useAppNavigation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exam, setExam] = useState(null);
  const [extendingTimeFor, setExtendingTimeFor] = useState(null); // studentId

  useEffect(() => {
    // Fetch exam details once
    examApi.getExamDetails(id)
      .then(res => setExam(res.data.exam))
      .catch(err => {
        toast.error("Failed to fetch exam details");
        console.warn(err.message)
        navigate('/admin/dashboard');
      });
  }, [id, navigate]);

  const fetchLiveMonitorData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);
    try {
      const { data } = await adminApi.getLiveMonitor(id);
      setSessions(data.activeSessions || []);
    } catch (err) {
      console.error(err);
      if (!isBackground) toast.error("Failed to load live monitor data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!exam) return;
    
    fetchLiveMonitorData(false);
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchLiveMonitorData(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [exam, fetchLiveMonitorData]);

  const handleExtendTime = async (studentId, minutes) => {
    try {
      setExtendingTimeFor(studentId);
      await examApi.extendTime({ examId: Number(id), studentId, extraMinutes: minutes });
      toast.success(`Extended time by ${minutes} minutes`);
      await fetchLiveMonitorData(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to extend time");
    } finally {
      setExtendingTimeFor(null);
    }
  };

  const handleTerminate = async (studentId, reason) => {
    const confirmed = await confirm({
      title: 'Terminate Session',
      message: "Are you sure you want to terminate this cadet's exam? This action cannot be undone.",
      confirmText: 'Terminate',
      isDanger: true
    });
    if (!confirmed) return;
    try {
      await examApi.terminateSession({ examId: Number(id), studentId, reason });
      toast.success("Exam session terminated");
      await fetchLiveMonitorData(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to terminate session");
    }
  };

  const handleResetAttempt = async (studentId) => {
    const confirmed = await confirm({
      title: 'Reset Attempt',
      message: "Are you sure you want to completely reset this cadet's attempt? This will delete all their answers and allow them to start over.",
      confirmText: 'Reset',
      isDanger: true
    });
    if (!confirmed) return;
    try {
      await examApi.resetAttempt({ examId: Number(id), studentId });
      toast.success("Exam attempt reset successfully");
      await fetchLiveMonitorData(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset attempt");
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'IN_PROGRESS');
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'TIMED_OUT');
  
  const totalWarnings = sessions.reduce((acc, curr) => acc + (curr.warnings || 0), 0);
  const studentsAtRisk = sessions.filter(s => s.warnings >= 2).length;

  return (
    <div>
      <PageHeader 
        title={exam ? `Live Monitor: ${exam.title}` : "Live Monitor"}
        subtitle="Real-time oversight of active exam sessions and security events."
        action={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => goBack('/admin/exams')}
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-white border border-stone-deep text-ink-3 hover:text-navy hover:border-navy"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Back</span>
            </button>
            <button 
              onClick={() => fetchLiveMonitorData(false)}
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid" 
            >
              <RefreshCw size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Active Sessions" 
          value={activeSessions.length} 
          icon={<MonitorPlay size={18} strokeWidth={1.5} />}
          colorClass="text-navy"
        />
        
        <StatCard 
          label="Completed" 
          value={completedSessions.length} 
          icon={<UserCheck size={18} strokeWidth={1.5} />}
          colorClass="text-olive"
        />

        <StatCard 
          label="Total Warnings" 
          value={totalWarnings} 
          icon={<ShieldAlert size={18} strokeWidth={1.5} />}
          colorClass="text-[#D97757]"
        />

        <StatCard 
          label="At Risk ( >=2 Warns)" 
          value={studentsAtRisk} 
          icon={<Eye size={18} strokeWidth={1.5} />}
          colorClass="text-red-600"
        />
      </div>

      <div className="bg-white rounded-md border border-stone-deep shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-deep bg-stone/30 flex justify-between items-center">
          <h2 className="font-display font-medium text-navy">Live Student Activity</h2>
          <span className="text-[12px] font-ui text-ink-4">Polling every 10s</span>
        </div>
        
        {loading && !refreshing ? (
          <div className="p-12 text-center text-ink-4 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-navy/40" size={32} />
            <p className="font-ui text-[14px]">Connecting to Monitor Wall...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-ink-4 flex flex-col items-center justify-center">
            <MonitorPlay size={48} className="text-stone-deep mb-4" strokeWidth={1} />
            <p className="font-ui text-[14px]">No attempts recorded yet for this exam.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                  <th className="font-normal px-4 py-3">Cadet</th>
                  <th className="font-normal px-4 py-3">Status</th>
                  <th className="font-normal px-4 py-3">Active Question</th>
                  <th className="font-normal px-4 py-3">Violations</th>
                  <th className="font-normal px-4 py-3">Last Ping</th>
                  <th className="font-normal px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-ui text-[13.5px] text-ink-2">
                {sessions.sort((a, b) => b.warnings - a.warnings).map((session) => {
                  const isActive = session.status === 'IN_PROGRESS';
                  const isStale = isActive && session.lastSeenAt && (new Date() - new Date(session.lastSeenAt)) > 60000;
                  
                  return (
                    <tr key={session.studentId} className={`border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0 ${session.warnings >= 2 ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy">{session.name}</div>
                        <div className="text-[11px] text-ink-4 font-mono">{session.regimentalNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide ${
                          isActive 
                            ? 'bg-blue-100 text-blue-700'
                            : session.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {isActive && isStale ? 'DISCONNECTED' : session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {session.activeQuestionIndex != null ? (
                          <span className="text-ink-3">#{session.activeQuestionIndex + 1}</span>
                        ) : (
                          <span className="text-ink-4 font-normal italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {session.warnings > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-red-600 font-medium text-[12px]">
                            <ShieldAlert size={14} />
                            {session.warnings} {session.warnings === 1 ? 'Warning' : 'Warnings'}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1 text-[12px]">
                            <UserCheck size={14} /> Safe
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-3">
                        {session.lastSeenAt ? (
                          <span className={isStale ? 'text-red-500 font-medium' : ''}>
                            {new Date(session.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        ) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isActive && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                const mins = window.prompt("Enter minutes to extend (e.g. 5, 10, 30):", "5");
                                if (mins && !isNaN(mins) && Number(mins) > 0) {
                                  handleExtendTime(session.studentId, Number(mins));
                                }
                              }}
                              disabled={extendingTimeFor === session.studentId}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone border border-stone-deep rounded hover:bg-white text-navy font-medium text-[11px] transition-all disabled:opacity-50"
                            >
                              <PlusCircle size={12} />
                              Extend Time
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt("Reason for kicking this cadet?", "Violated exam rules.");
                                if (reason !== null) {
                                  handleTerminate(session.studentId, reason);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-700 font-medium text-[11px] transition-all"
                            >
                              <ShieldAlert size={12} />
                              Kick
                            </button>
                            <button
                              onClick={() => handleResetAttempt(session.studentId)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 text-amber-700 font-medium text-[11px] transition-all"
                            >
                              <RefreshCw size={12} />
                              Reset
                            </button>
                          </div>
                        )}
                        {!isActive && (
                          <div className="flex justify-end gap-2">
                            {session.score !== null && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone/50 border border-transparent rounded text-ink-4 font-medium text-[11px]">
                                Score: {session.score}
                              </span>
                            )}
                            <button
                              onClick={() => handleResetAttempt(session.studentId)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 text-amber-700 font-medium text-[11px] transition-all"
                            >
                              <RefreshCw size={12} />
                              Reset
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
