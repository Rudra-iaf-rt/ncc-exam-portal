import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  LogOut,
  ChevronDown,
  GraduationCap,
  Lock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

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

export const CadetLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('bg-stone', 'text-ink');
    return () => document.body.classList.remove('bg-stone', 'text-ink');
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Session terminated securely.');
    } catch (err) {
      console.log(err);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const navLinkClass = ({ isActive }) => `
    flex items-center gap-3 px-4 py-2.5 rounded-lg font-ui text-[14px] transition-all duration-300 relative group/link
    ${isActive 
      ? 'bg-white/10 text-[#E8E4D4] font-semibold' 
      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
    }
  `;

  const navItems = [
    { path: '/cadet/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/cadet/materials', label: 'Materials', icon: BookOpen },
    { path: '/cadet/results', label: 'Results', icon: Award },
  ];

  return (
    <div className="flex min-h-screen bg-stone">
      {/* Sidebar - Desktop Only */}
      <aside className={`hidden lg:flex sticky top-0 left-0 h-screen w-[280px] shrink-0 bg-navy flex-col z-[100]`}>
        <div className="p-6 pb-6 border-b border-white/5 mb-2 bg-navy-deep/10 flex flex-col items-center text-center gap-4">
          <div className="relative group/logo">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-6 bg-gold/5 blur-[40px] rounded-full group-hover/logo:bg-gold/10 transition-all duration-1000" />
            
            {/* Seal Container */}
            <div className="w-20 h-20 rounded-full p-2 shadow-[0_0_40px_rgba(0,0,0,0.3),0_0_20px_rgba(212,175,55,0.1)] border border-gold/20 relative z-10 overflow-hidden flex items-center justify-center transition-transform duration-500 group-hover/logo:scale-105 bg-[#E8E4D4]/5">
              <img 
                src="/assets/ncc-logo.png" 
                alt="NCC Logo" 
                className="w-full h-full object-contain scale-110 drop-shadow-md" 
              />
            </div>

            {/* Decorative Outer Ring */}
            <div className="absolute -inset-2 border border-gold/10 rounded-full scale-100 group-hover/logo:scale-110 transition-transform duration-1000 opacity-30 pointer-events-none" />
          </div>

          <div className="space-y-2">
            <div className="font-display text-[22px] text-[#E8E4D4] leading-none italic tracking-tighter font-black">NCC TIRUPATI</div>
            <div className="font-ui text-[9px] text-gold/30 tracking-[0.3em] uppercase font-black flex items-center justify-center gap-2">
              <span className="w-3 h-px bg-gold/20" />
              29 Andhra Bn
              <span className="w-3 h-px bg-gold/20" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <SidebarSection title="Academics" icon={GraduationCap} defaultExpanded={true}>
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={navLinkClass}>
                <item.icon size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </SidebarSection>

          <SidebarSection title="Security" icon={Lock} defaultExpanded={false}>
            <NavLink to="/cadet/settings/password" className={navLinkClass}>
              <Lock size={16} strokeWidth={1.5} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span>Change Password</span>
            </NavLink>
          </SidebarSection>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone relative">
        {/* Top Header - Sticky Utility Bar */}
        <header className="sticky top-0 z-[90] flex items-center justify-between px-6 sm:px-8 py-2.5 bg-stone/80 backdrop-blur-xl border-b border-navy/[0.03]">
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
              <span className="font-display text-[14px] text-navy leading-none italic font-black">NCC TIRUPATI</span>
              <span className="font-ui text-[8px] text-navy/40 font-bold uppercase tracking-wider mt-0.5">29 Andhra Bn</span>
            </div>
          </div>

          <div className="hidden lg:block" />

          {/* Account Cluster */}
          <div className="flex items-center gap-2">
            {/* User Utility */}
            <div className="flex items-center gap-2.5 pl-3 pr-1.5 py-1 rounded-xl hover:bg-navy/5 transition-all duration-300 group cursor-default border border-transparent hover:border-navy/5">
              <div className="text-right hidden sm:block">
                <div className="font-ui text-[12px] font-bold text-navy/80 leading-none">{user?.name || 'Cadet'}</div>
                <div className="font-ui text-[9px] text-navy/30 font-bold uppercase tracking-tighter mt-0.5">
                  {user?.regimentalNumber ? `REG: ${user.regimentalNumber}` : 'CADET'}
                </div>
              </div>
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-navy text-white shadow-md flex items-center justify-center font-display text-[13px] italic group-hover:scale-105 transition-transform">
                  {user?.name?.charAt(0) || 'C'}
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

        {/* Added pb-[88px] to accommodate the mobile dock */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-6 pt-6 pb-[88px] lg:px-12 lg:py-8 lg:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Dock Navigation */}
      <nav className="fixed bottom-0 left-0 z-[100] flex h-[72px] w-full items-center justify-around bg-stone/90 backdrop-blur-xl border-t border-navy/[0.05] shadow-[0_-4px_24px_rgba(10,15,29,0.06)] lg:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <NavLink 
              key={item.path}
              to={item.path} 
              className={`flex flex-col items-center gap-1.5 px-4 py-2 transition-all ${
                isActive ? 'text-navy scale-105' : 'text-navy/40 hover:text-navy/60'
              }`}
            >
              <div className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-gold/20 shadow-inner' : 'bg-transparent'}`}>
                <Icon size={20} className={isActive ? 'text-navy' : ''} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={`font-ui text-[10px] tracking-wide transition-all ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};


