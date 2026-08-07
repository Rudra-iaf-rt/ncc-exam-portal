import React from 'react';
import { adminApi, leaderboardApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { PageHeader, StatCard } from '../components/Shared';
import { 
  Users, 
  Clock, 
  Trophy, 
  TrendingUp,
  ArrowRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import PageLoader from '../../components/PageLoader';

import QuickActions from '../components/dashboard/QuickActions';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget';
import LiveProctoringFeed from '../components/dashboard/LiveProctoringFeed';

export default function Dashboard() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const userKey = user?.id || user?.email || user?.name || user?.role || 'current';
  const cacheKey = user ? `admin-dashboard:${userKey}` : null;

  const { data, loading } = useCachedFetch(
    cacheKey,
    async () => {
      const [statsRes, lbRes] = await Promise.allSettled([
        adminApi.getStats(),
        user?.collegeCode ? leaderboardApi.getUnitLeaderboard(user.collegeCode) : Promise.resolve({ data: [] })
      ]);

      const response = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const leaderboard = lbRes.status === 'fulfilled' ? (lbRes.value?.data || []) : [];

      return {
        ...(response?.data || {
          totalStudents: 0, activeExams: 0, totalExams: 0, activeConnections: 0, pendingActions: 0,
          averageScore: '0%', recentActivity: [], recentViolations: [],
        }),
        leaderboard
      };
    },
    { staleTimeMs: 2 * 60 * 1000, enabled: !!user }
  );

  const stats = data || {
    totalStudents: 0, activeExams: 0, totalExams: 0, activeConnections: 0, pendingActions: 0, upcomingExams: 0,
    averageScore: '0%', recentActivity: [], recentViolations: [], leaderboard: []
  };

  const isInitialLoading = loading && stats.totalExams === 0 && stats.totalStudents === 0;

  return (
    <div>
      <PageHeader 
        title={isAdmin ? "Command *Dashboard*" : "Institutional *Dashboard*"}
        subtitle={isAdmin ? "Snapshot of exam performance and cadet enrollment statistics." : `Performance overview for ${user?.college || 'your college'}.`}
        action={
          <div className="flex gap-3 items-center">
            <span className="font-mono text-[10px] tracking-[0.06em] py-1.5 px-3 rounded-full font-medium inline-flex bg-[#EAF3DE] text-[#3B6D11]">
              <div className="w-1.5 h-1.5 rounded-full bg-current mr-2 inline-block self-center" />
              Operational State: Active
            </span>
          </div>
        }
      />

      {isInitialLoading ? (
        <PageLoader text="Syncing Command Dashboard..." />
      ) : (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
          
          {/* Quick Actions - Horizontal Bar */}
          <div className="animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '50ms' }}>
            <QuickActions isAdmin={isAdmin} />
          </div>

          {/* Pending Actions Banner */}
          {stats.pendingActions > 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '75ms' }}>
              <div className="bg-gold-1 border border-gold-3 rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-2 flex items-center justify-center text-ink shrink-0">
                    <AlertCircle size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="m-0 font-display text-[14px] font-bold text-ink">Action Required</h3>
                    <p className="m-0 font-ui text-[13px] text-ink-3 mt-0.5">
                      You have {stats.pendingActions} completed {stats.pendingActions === 1 ? 'exam' : 'exams'} awaiting result publication.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/admin/exams" 
                  className="h-[36px] px-[16px] rounded-lg font-ui text-[13px] font-bold inline-flex items-center justify-center transition-all bg-navy text-white hover:bg-navy-soft active:scale-[0.98] shadow-sm whitespace-nowrap"
                >
                  Publish Results
                </Link>
              </div>
            </div>
          )}

          {/* Primary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
            <div className="transition-transform duration-200 hover:scale-[1.02]">
              <StatCard 
                label="Total Cadets" 
                value={stats.totalStudents || 0} 
                subtext="Unit-wide Enrollment"
                icon={<Users size={18} strokeWidth={1.5} />}
                colorClass="text-navy"
              />
            </div>
            <div className="transition-transform duration-200 hover:scale-[1.02]">
              <StatCard 
                label="Live Exams" 
                value={stats.activeExams || 0} 
                subtext="Currently Active"
                icon={<Clock size={18} strokeWidth={1.5} />}
                colorClass="text-olive"
              />
            </div>
            <div className="transition-transform duration-200 hover:scale-[1.02]">
              <StatCard 
                label="Scheduled Exams" 
                value={stats.upcomingExams || 0} 
                subtext="Upcoming"
                icon={<Clock size={18} strokeWidth={1.5} />}
                colorClass="text-gold-3"
              />
            </div>
            <div className="transition-transform duration-200 hover:scale-[1.02] relative group">
              {stats.activeConnections > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-olive-mid rounded-full animate-ping z-10" />
              )}
              {stats.activeConnections > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-olive-mid rounded-full z-10" />
              )}
              <StatCard 
                label="Active Cadets" 
                value={stats.activeConnections || 0} 
                subtext="Live Pulse"
                icon={<Activity size={18} strokeWidth={1.5} />}
                colorClass={stats.activeConnections > 0 ? "text-olive-mid" : "text-navy"}
              />
            </div>
          </div>

          {/* Dense 3-Column Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Live Proctoring Feed */}
            <div className="h-full animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '150ms' }}>
              <LiveProctoringFeed violations={stats.recentViolations} />
            </div>

            {/* Leaderboard */}
            <div className="h-full animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '200ms' }}>
              <LeaderboardWidget leaderboard={stats.leaderboard} />
            </div>
            
            {/* Recent Activity Logs */}
            <div className="flex flex-col h-full border border-stone-deep bg-white rounded-md shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '250ms' }}>
              <div className="flex justify-between items-center p-3 border-b border-stone-deep bg-stone-wash">
                <h3 className="m-0 font-mono text-[11px] font-bold uppercase tracking-wider text-navy flex items-center gap-2">
                  <Activity size={14} className="text-navy" />
                  Recent Activity
                </h3>
                <Link to="/admin/results" className="font-mono text-[9px] uppercase tracking-wider font-bold text-ink-3 hover:text-navy transition-colors">
                  View All &rarr;
                </Link>
              </div>
              
              <div className="flex flex-col flex-1 overflow-y-auto">
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.slice(0, 5).map((activity, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 flex justify-between items-center hover:bg-stone-wash transition-colors ${idx !== Math.min(stats.recentActivity.length, 5) - 1 ? 'border-b border-stone-deep' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activity.score >= 40 ? 'bg-olive-mid' : 'bg-crimson'}`} />
                        <div className="flex flex-col min-w-0">
                          <div className="font-ui text-[12px] font-bold text-navy uppercase tracking-wide truncate">
                            {activity.studentName}
                          </div>
                          <div className="font-mono text-[10px] text-ink-4 truncate mt-0.5">
                            {activity.examTitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-4">
                        <div className={`font-mono text-[12px] font-bold ${activity.score >= 40 ? 'text-olive-mid' : 'text-crimson'}`}>
                          {activity.score}%
                        </div>
                        <div className={`font-mono text-[9px] tracking-wider uppercase mt-0.5 ${activity.score >= 40 ? 'text-olive-mid' : 'text-crimson'}`}>
                          {activity.score >= 40 ? 'PASS' : 'FAIL'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-ink-4 h-full">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider">No Activity</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
