import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
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
import '../admin.css';

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
      const { data } = await apiFetch('/admin/stats');
      if (data) setStats(data);
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) return <div style={{ color: 'var(--ink-4)', padding: '40px', fontFamily: 'var(--f-mono)', fontSize: '13px' }}>Loading...</div>;

  return (
    <div>
      <PageHeader 
        title="Admin *Dashboard*" 
        subtitle="Snapshot of exam performance and cadet enrollment statistics."
        action={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="adm-badge adm-badge-success" style={{ padding: '8px 12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '8px', display: 'inline-block' }} />
              System Online
            </span>
          </div>
        }
      />

      {/* Primary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard 
          label="Total Cadets" 
          value={stats.totalStudents || 0} 
          subtext="Registered Students"
          icon={<Users size={18} strokeWidth={1.5} />}
          color="var(--navy)"
        />
        <StatCard 
          label="Ongoing Exams" 
          value={stats.activeExams || 0} 
          subtext="Currently Live"
          icon={<Clock size={18} strokeWidth={1.5} />}
          color="var(--olive)"
        />
        <StatCard 
          label="Average Score" 
          value={stats.averageScore || "0%"} 
          subtext="Unit Performance"
          icon={<TrendingUp size={18} strokeWidth={1.5} />}
          color="var(--gold-3)"
        />
        <StatCard 
          label="Exams Created" 
          value={stats.totalExams || 0} 
          subtext="In System"
          icon={<Trophy size={18} strokeWidth={1.5} />}
          color="var(--navy)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Activity */}
        <div className="adm-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--navy)' }}>Recent Results</h3>
            <Link to="/admin/results" className="adm-btn adm-btn-ghost" style={{ fontSize: '11px', padding: '6px 12px' }}>
              View All Results <ArrowRight size={12} style={{ marginLeft: '6px' }} />
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--stone-3)' }}>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, idx) => (
                <div key={idx} style={{ 
                  background: 'var(--parchment)', 
                  padding: '16px 0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px' 
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--stone-2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--navy)'
                  }}>
                    <Trophy size={18} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{activity.studentName} completed {activity.examTitle}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-4)', marginTop: '2px' }}>
                      {new Date(activity.date).toLocaleDateString()} · Score: {activity.score}%
                    </div>
                  </div>
                  <div className={`adm-badge ${activity.score >= 40 ? 'adm-badge-success' : 'adm-badge-danger'}`} style={{ fontSize: '10px' }}>
                    {activity.score >= 40 ? 'Qualified' : 'Failed'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-4)', background: 'var(--parchment)' }}>
                <div style={{ fontSize: '14px', marginBottom: '16px' }}>No recent activity records found.</div>
                <Link to="/admin/exams/create" className="adm-btn adm-btn-primary">
                  Create First Exam
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* System Alerts / Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="adm-card" style={{ padding: '24px', background: 'var(--navy)', color: 'white' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/admin/exams/create" className="adm-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Create New Exam
              </Link>
              <Link to="/admin/results" className="adm-btn" style={{ background: 'var(--gold-2)', color: 'var(--navy)', border: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                View Result Reports
              </Link>
            </div>
          </div>

          <div className="adm-card" style={{ padding: '24px', borderLeft: '4px solid var(--gold-2)', opacity: stats.totalStudents === 0 ? 1 : 0.5 }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <AlertCircle size={20} style={{ color: 'var(--gold-3)' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>System Status</div>
                <p style={{ fontSize: '13px', color: 'var(--ink-4)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {stats.totalStudents === 0 
                    ? "Initial setup required. register cadets or create an exam to begin."
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
