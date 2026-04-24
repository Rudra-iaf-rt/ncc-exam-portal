import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { PageHeader, StatCard } from '../components/Shared';
import { 
  Users, 
  Clock, 
  Trophy, 
  TrendingUp, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeExams: 0,
    totalExams: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await adminApi.getStats();
        if (data) setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="text-ink-4 p-10 font-mono text-[13px]">Loading...</div>;

  return (
    <div>
      <PageHeader 
        title="Admin *Dashboard*" 
        subtitle="Snapshot of exam performance and cadet enrollment statistics."
        action={
          <div className="flex gap-3 items-center">
            <span className="font-mono text-[10px] tracking-[0.06em] py-1.5 px-3 rounded-full font-medium inline-flex bg-[#EAF3DE] text-[#3B6D11]">
              <div className="w-1.5 h-1.5 rounded-full bg-current mr-2 inline-block self-center" />
              System Online
            </span>
          </div>
        }
      />

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Cadets" 
          value={stats.totalStudents || 0} 
          subtext="Unit-wide Enrollment"
          icon={<Users size={18} strokeWidth={1.5} />}
          colorClass="text-navy"
        />
        <StatCard 
          label="Live Exams" 
          value={stats.activeExams || 0} 
          subtext="Currently Active"
          icon={<Clock size={18} strokeWidth={1.5} />}
          colorClass="text-olive"
        />
        <StatCard 
          label="Unit Pass Rate" 
          value={stats.averageScore || "0%"} 
          subtext="Average Performance"
          icon={<TrendingUp size={18} strokeWidth={1.5} />}
          colorClass="text-gold-3"
        />
        <StatCard 
          label="Total Exams" 
          value={stats.totalExams || 0} 
          subtext="Exam Database"
          icon={<Trophy size={18} strokeWidth={1.5} />}
          colorClass="text-navy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Recent Activity */}
        <div className="bg-white border border-stone-deep rounded-md p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="m-0 font-ui text-[18px] font-semibold text-navy">Recent Results</h3>
            <Link to="/admin/results" className="h-9 px-3 rounded-md font-ui text-[12px] font-medium flex items-center bg-transparent text-ink-2 border border-stone-deep transition-all hover:bg-stone">
              View All Results <ArrowRight size={12} className="ml-1.5" />
            </Link>
          </div>
          
          <div className="flex flex-col gap-px bg-stone-mid">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, idx) => (
                <div key={idx} className="bg-stone-wash py-4 px-2 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-mid flex items-center justify-center text-navy shrink-0">
                    <Trophy size={18} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="font-ui text-[14px] font-medium text-ink">{activity.studentName} completed {activity.examTitle}</div>
                    <div className="font-ui text-[12px] text-ink-4 mt-0.5">
                      {new Date(activity.date).toLocaleDateString()} · Score: {activity.score}%
                    </div>
                  </div>
                  <div className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex ${activity.score >= 40 ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-crimson-wash text-crimson'}`}>
                    {activity.score >= 40 ? 'Qualified' : 'Failed'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-ink-4 bg-stone-wash">
                <div className="font-ui text-[14px] mb-4">No recent activity records found.</div>
                <Link to="/admin/exams/create" className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium inline-flex items-center justify-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid">
                  Create First Exam
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* System Alerts / Quick Actions */}
        <div className="flex flex-col gap-6">
          <div className="bg-navy border border-navy-pale rounded-md p-6 text-white shadow-sm">
            <h4 className="m-0 mb-3 font-mono text-[11px] tracking-[0.05em] uppercase opacity-70">Quick Actions</h4>
            <div className="flex flex-col gap-3">
              <Link to="/admin/exams/create" className="h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 transition-all bg-white/10 text-white border border-white/20 hover:bg-white/20">
                Create New Exam
              </Link>
              <Link to="/admin/results" className="h-[36px] rounded-md font-ui text-[13px] font-medium flex items-center justify-center gap-2 transition-all bg-gold-2 text-navy border-none hover:bg-gold-3">
                View Result Reports
              </Link>
            </div>
          </div>

          <div className={`bg-white border border-stone-deep border-l-[4px] border-l-gold-2 rounded-md p-6 shadow-sm ${stats.totalStudents === 0 ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-gold-3 shrink-0" />
              <div>
                <div className="font-ui text-[14px] font-semibold text-navy">System Status</div>
                <p className="font-ui text-[13px] text-ink-4 m-0 mt-1 leading-[1.5]">
                  {stats.totalStudents === 0 
                    ? "Initial setup required. Register cadets or create an exam to begin."
                    : "System fully operational. All modules reporting status normal."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
