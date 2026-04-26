import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Building2, 
  Settings2,
  ShieldCheck,
  School
} from 'lucide-react';
import { PageHeader } from '../components/Shared';
import UserManagement from './UserManagement';
import StaffManagement from './StaffManagement';
import CollegeManagement from './CollegeManagement';
import { useAdminAuth } from '../../contexts/AdminAuth';

export default function Management() {
  const { user } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'cadets';

  const isAdmin = user?.role === 'ADMIN';

  const tabs = [
    { id: 'cadets', label: 'Cadet Registry', icon: Users, component: UserManagement },
    ...(isAdmin ? [
      { id: 'instructors', label: 'Instructor Registry', icon: UserCheck, component: StaffManagement },
      { id: 'colleges', label: 'College Master', icon: Building2, component: CollegeManagement }
    ] : [])
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || UserManagement;

  return (
    <div className="max-w-[1200px]">
      <PageHeader 
        title="Institutional *Management*" 
        subtitle="Consolidated hub for registry control and institutional configuration." 
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-stone-mid/30 p-1 rounded-xl mb-8 w-fit border border-stone-deep shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2.5 px-6 py-2.5 rounded-lg font-ui text-[14px] font-medium transition-all
                ${isActive 
                  ? 'bg-white text-navy shadow-sm border border-stone-deep' 
                  : 'text-ink-4 hover:text-ink hover:bg-stone-mid/50'
                }
              `}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ActiveComponent />
      </div>

      {/* System Note (Optional) */}
      <div className="mt-12 pt-6 border-t border-stone-deep">
        <div className="flex items-center gap-3 text-ink-4">
          <Settings2 size={16} />
          <span className="font-mono text-[11px] tracking-wide uppercase">
            {isAdmin ? 'Full Administrative Access Enabled' : 'Restricted Unit HQ View'}
          </span>
        </div>
      </div>
    </div>
  );
}
