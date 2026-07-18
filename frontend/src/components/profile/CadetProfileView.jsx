import React from 'react';
import { 
  Shield, Award, GraduationCap, Mail, Lock, 
  ChevronRight, MapPin, Trophy, Target, Activity, 
  FileText, Plane, Ship, Building 
} from 'lucide-react';

const BentoTile = ({ children, className = '', ...props }) => (
  <div 
    className={`bg-white border border-stone-deep rounded-xl p-5 shadow-sm relative ${className}`}
    {...props}
  >
    {children}
  </div>
);

const StatBox = ({ icon: Icon, label, value, subtext, iconColorClass, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className={iconColorClass}>
      <Icon size={18} />
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-ink-4 leading-none mb-1">{label}</span>
      <span className="text-lg font-bold leading-none text-ink">{value}</span>
      {subtext && <span className="text-[10px] text-ink-4/70 mt-1 leading-none">{subtext}</span>}
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value, onClick, actionElement }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between py-4 ${onClick ? 'cursor-pointer hover:bg-stone-wash/50 transition-colors' : ''} border-b border-stone-deep/40 last:border-0`}
  >
    <div className="flex items-center gap-3.5">
      <div className="text-ink-4">
        <Icon size={18} />
      </div>
      <span className="text-[15px] font-medium text-ink">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-[15px] text-ink-4">{value}</span>}
      {actionElement && actionElement}
      {onClick && !actionElement && <ChevronRight size={18} className="text-ink-4" />}
    </div>
  </div>
);

const CadetProfileView = ({ user, stats, loadingStats, actions = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
      
      {/* Row 1: Compact Identity Header */}
      <BentoTile className="md:col-span-3 flex flex-col justify-center min-h-[120px]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-stone-wash border border-stone-deep flex items-center justify-center shrink-0">
            <span className="font-display italic font-bold text-2xl text-navy/40 uppercase">
              {user?.name?.charAt(0) || 'C'}
            </span>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-ink-4 uppercase tracking-widest mb-1">
              {user?.regimentalNumber || 'NOT ASSIGNED'}
            </div>
            <h2 className="text-xl font-display font-semibold text-ink tracking-tight mb-2">
              {user?.name || 'Cadet Name'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-navy/5 text-navy text-[10px] font-bold tracking-wider uppercase rounded-md border border-navy/10 flex items-center gap-1.5">
                {user?.wing?.toUpperCase().includes('AIR') ? <Plane size={12} /> : user?.wing?.toUpperCase().includes('NAVY') ? <Ship size={12} /> : <Shield size={12} />}
                {user?.wing ? `${user.wing} WING` : 'NO WING'}
              </span>
              <span className="px-2.5 py-1 bg-stone-wash/80 text-ink-4 text-[10px] font-bold tracking-wider uppercase rounded-md border border-stone-deep/40 flex items-center gap-1.5">
                <Building size={12} />
                {user?.collegeCode || 'NO COLLEGE'}
              </span>
            </div>
          </div>
        </div>
      </BentoTile>

      {/* Row 2: Performance Snapshot */}
      <BentoTile className="md:col-span-3 flex flex-col justify-center">
        <div className="flex items-center gap-2.5 mb-5 text-ink-4">
          <Activity size={16} />
          <h3 className="font-display font-medium text-[14px] text-ink">Performance Snapshot</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
          <StatBox 
            icon={FileText} 
            label="Exams Completed" 
            value={loadingStats ? '-' : (stats?.examsTaken ?? 0)}
            iconColorClass="text-navy-soft"
            className="border-r border-stone-mid pr-4"
          />
          <StatBox 
            icon={Target} 
            label="Average Score" 
            value={loadingStats ? '-' : `${stats?.avgScore ?? 0}%`}
            iconColorClass="text-emerald-600"
            className="md:border-r md:border-stone-mid pr-4"
          />
          <StatBox 
            icon={Trophy} 
            label="Rank" 
            value={loadingStats ? '-' : (stats?.globalRank ?? 'Unranked')}
            iconColorClass="text-amber-600"
            className="border-r border-stone-mid pr-4"
          />
          <StatBox 
            icon={Award} 
            label="Highest Score" 
            value={loadingStats ? '-' : (stats?.bestScore ?? 0)}
            iconColorClass="text-purple-600"
          />
        </div>
      </BentoTile>

      {/* Row 3: Settings & Contact List */}
      <div className="md:col-span-3 mt-2">
        <div className="bg-white border border-stone-deep rounded-xl overflow-hidden shadow-sm">
          
          <div className="px-5">
            <InfoRow icon={Mail} label="Email Address" value={user?.email || '—'} />
            <InfoRow icon={MapPin} label="Mobile Number" value={user?.mobile || '—'} />
            <InfoRow icon={GraduationCap} label="Training Batch" value={user?.batch || '—'} />
            <InfoRow icon={FileText} label="Year of Study" value={user?.yearOfStudy ? `Year ${user.yearOfStudy}` : '—'} />
          </div>

          {actions && actions.length > 0 && (
            <>
              <div className="w-full h-3 bg-stone-wash border-y border-stone-deep/40"></div>
              <div className="px-5">
                {actions.map((action, idx) => (
                  <InfoRow 
                    key={idx}
                    icon={action.icon} 
                    label={action.label} 
                    onClick={action.onClick}
                    actionElement={action.actionElement}
                  />
                ))}
              </div>
            </>
          )}
          
        </div>
      </div>

    </div>
  );
};

export default CadetProfileView;
