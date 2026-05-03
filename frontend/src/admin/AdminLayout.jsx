import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuth';
import { 
  LayoutDashboard, 
  FileText, 
  Trophy, 
  Users, 
  BookOpen,
  LogOut,
  ShieldCheck,
  UserCheck,
  Building2,
  Menu,
  X,
  ChevronDown,
  Settings2,
  GraduationCap,
  Lock,
} from 'lucide-react';

function SidebarSection({ title, children, icon: SidebarIcon, defaultExpanded = false }) {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  
  // Detect if any child link matches current path or its sub-paths
  const isPathActive = React.useMemo(() => {
    const checkChildren = (nodes) => {
      return React.Children.toArray(nodes).some(child => {
        if (child.props?.to && (location.pathname === child.props.to || location.pathname.startsWith(child.props.to + '/'))) {
          return true;
        }
        if (child.props?.children) {
          return checkChildren(child.props.children);
        }
        return false;
      });
    };
    return checkChildren(children);
  }, [location.pathname, children]);

  const [isManuallyToggled, setIsManuallyToggled] = useState(defaultExpanded || isPathActive);

  // Sync manual toggle state if route changes
  useEffect(() => {
    if (isPathActive) {
      setIsManuallyToggled(prev => prev || true);
    }
  }, [isPathActive]);

  const isExpanded = isHovered || isManuallyToggled;

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    setIsManuallyToggled(!isManuallyToggled);
  };

  return (
    <div 
      className="mb-1 px-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-5 py-3 rounded-xl transition-all duration-500 group ${isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.06]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`transition-all duration-500 ${isHovered ? 'scale-110 rotate-[5deg]' : ''}`}>
            <SidebarIcon 
              size={18} 
              className={`transition-colors duration-500 ${isExpanded || isPathActive ? 'text-gold' : 'text-white/30'}`} 
              strokeWidth={1.5} 
            />
          </div>
          <span className={`font-ui text-[13px] font-medium tracking-wide transition-all duration-500 ${isExpanded || isPathActive ? 'text-[#E8E4D4]' : 'text-white/40'}`}>
            {title}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-white/10 transition-all duration-500 ease-in-out ${isExpanded ? 'rotate-0 opacity-100 text-gold/40' : '-rotate-90 opacity-40'}`} 
        />
      </button>
      
      <div 
        className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <nav className="flex flex-col gap-1 pl-4 pr-1 py-1 ml-4 border-l border-white/5">
            {children}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('bg-stone', 'text-ink');
    return () => document.body.classList.remove('bg-stone', 'text-ink');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  const navLinkClass = ({ isActive }) => `
    flex items-center gap-3 px-4 py-2.5 rounded-lg font-ui text-[14px] transition-all duration-300 relative group/link
    ${isActive 
      ? 'bg-white/10 text-[#E8E4D4] font-semibold' 
      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
    }
  `;

  return (
    <div className="flex min-h-screen bg-stone">
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-navy text-[#E8E4D4] border border-white/10 shadow-2xl z-[200] flex items-center justify-center transition-transform active:scale-95"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[95]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-[280px] shrink-0 bg-navy flex flex-col z-[100] transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 pb-6 border-b border-white/5 mb-2 bg-navy-deep/10 flex flex-col items-center text-center gap-4">
          <div className="relative group/logo">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-6 bg-gold/5 blur-[40px] rounded-full group-hover/logo:bg-gold/10 transition-all duration-1000" />
            
            {/* Seal Container */}
            <div className="w-24 h-24 rounded-full bg-white p-2 shadow-[0_0_40px_rgba(0,0,0,0.3),0_0_20px_rgba(212,175,55,0.1)] border-[3px] border-gold/20 relative z-10 overflow-hidden flex items-center justify-center transition-transform duration-500 group-hover/logo:scale-105">
              <img 
                src="/assets/ncc-logo.png" 
                alt="NCC Logo" 
                className="w-full h-full object-contain scale-110" 
              />
            </div>

            {/* Decorative Outer Ring */}
            <div className="absolute -inset-2 border border-gold/10 rounded-full scale-100 group-hover/logo:scale-110 transition-transform duration-1000 opacity-30 pointer-events-none" />
          </div>

          <div className="space-y-2">
            <div className="font-display text-[22px] text-[#E8E4D4] leading-none italic tracking-tighter font-black">NCC TIRUPATI</div>
            <div className="font-ui text-[10px] text-gold/30 tracking-[0.3em] uppercase font-black flex items-center justify-center gap-2">
              <span className="w-3 h-px bg-gold/20" />
               
              <span className="w-3 h-px bg-gold/20" />
            </div>  
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <SidebarSection title="Examinations" icon={GraduationCap}>
            <NavLink to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
              <LayoutDashboard size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/exams" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
              <FileText size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Manage Exams</span>
            </NavLink>
            <NavLink to="/admin/results" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
              <Trophy size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Exam Results</span>
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/assignments" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
                  <UserCheck size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                  <span>Authorization</span>
                </NavLink>
                <NavLink to="/admin/materials" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
                  <BookOpen size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                  <span>Syllabus</span>
                </NavLink>
              </>
            )}
          </SidebarSection>

          <SidebarSection title="Management" icon={Building2}>
            <NavLink to="/admin/users" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
              <Users size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Cadets</span>
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/staff" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
                  <UserCheck size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                  <span>Instructors</span>
                </NavLink>
                <NavLink to="/admin/colleges" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
                  <Building2 size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                  <span>Colleges</span>
                </NavLink>
              </>
            )}
          </SidebarSection>

          {isAdmin && (
            <SidebarSection title="System" icon={Settings2} defaultExpanded={false}>
              <NavLink to="/admin/logs" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
                <ShieldCheck size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                <span>Audit Logs</span>
              </NavLink>
            </SidebarSection>
          )}

          <SidebarSection title="Security" icon={Lock} defaultExpanded={false}>
            <NavLink to="/admin/settings/password" onClick={() => setSidebarOpen(false)} className={navLinkClass}>
              <Lock size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Change Password</span>
            </NavLink>
          </SidebarSection>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone relative">
        {/* Top Header - Sticky Utility Bar */}
        <header className="sticky top-0 z-[90] flex items-center justify-between px-4 py-2 bg-stone/80 backdrop-blur-xl border-b border-navy/[0.03]">
          {/* Mobile-only Branding */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-2 bg-gold/10 blur-lg rounded-full" />
              <img 
                src="/assets/ncc-logo.png" 
                alt="NCC Logo" 
                className="w-8 h-8 relative z-10 object-contain" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-[14px] text-navy leading-none italic font-black">NCC </span>
              <span className="font-ui text-[8px] text-navy/40 font-bold uppercase tracking-wider mt-0.5">TIRUPATI</span>
            </div>
          </div>

          <div className="hidden lg:block" />

          {/* Account Cluster */}
          <div className="flex items-center gap-2">
            {/* User Utility */}
            <div className="flex items-center gap-2.5 pl-3 pr-1.5 py-1 rounded-xl hover:bg-navy/5 transition-all duration-300 group cursor-default border border-transparent hover:border-navy/5">
              <div className="text-right hidden sm:block">
                <div className="font-ui text-[12px] font-bold text-navy/80 leading-none">{user?.name || 'Admin'}</div>
                <div className="font-ui text-[9px] text-navy/30 font-bold uppercase tracking-tighter mt-0.5">
                  {user?.role?.charAt(0)}{user?.role?.slice(1).toLowerCase()} {user?.college ? `· ${user.college}` : ''}
                </div>
              </div>
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-navy text-white shadow-md flex items-center justify-center font-display text-[13px] italic group-hover:scale-105 transition-transform">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone" />
              </div>
            </div>

            <div className="h-4 w-px bg-navy/10 mx-1" />

            {/* Session Action */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg text-navy/20 hover:text-red-500 hover:bg-red-500/5 transition-all duration-300 group"
              title="Terminate Session"
            >
              <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full px-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
