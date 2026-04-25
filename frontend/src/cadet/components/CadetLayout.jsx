import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export const CadetLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Session terminated securely.');
    } catch (err) {
      console.log(err);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/materials', label: 'Materials', icon: BookOpen },
    { path: '/results', label: 'Results', icon: Award },
  ];

  return (
    <div className="flex min-h-screen bg-stone">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[220px] flex-col bg-navy pb-8 lg:flex border-r border-stone-deep shadow-[4px_0_16px_rgba(26,39,68,0.1)]">
        <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-gold text-navy shadow-md shadow-gold/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="font-display text-lg leading-tight text-white italic">Cadet Portal</div>
            <div className="font-mono text-[9px] tracking-[0.12em] text-navy-pale uppercase mt-0.5">Tirupati Unit</div>
          </div>
        </div>

        <div className="mt-6 flex-1 px-4">
          <div className="mb-2 px-2 font-mono text-[9px] tracking-[0.14em] text-navy-pale uppercase opacity-60">Main Menu</div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-medium transition-all ${
                    isActive 
                      ? 'bg-white/10 text-white border-l-2 border-gold shadow-sm' 
                      : 'text-navy-pale hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-gold' : ''} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-4 border-t border-white/10 pt-4">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-medium text-navy-pale transition-all hover:bg-crimson/10 hover:text-crimson">
            <LogOut size={18} />
            End Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 w-full lg:ml-[220px] pb-[72px] lg:pb-0 transition-all">
        {/* Mobile Header (Shows only on small screens) */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-navy px-4 lg:hidden border-b border-navy-mid shadow-md">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-gold text-navy">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="font-display text-base leading-tight text-white italic">Cadet Portal</div>
              <div className="font-mono text-[8px] tracking-[0.12em] text-navy-pale uppercase">Tirupati Unit</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex h-8 w-8 items-center justify-center rounded-sm bg-white/10 text-navy-pale transition-colors hover:bg-crimson/20 hover:text-crimson">
            <LogOut size={16} />
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 z-50 flex h-[72px] w-full items-center justify-around bg-white border-t border-stone-deep shadow-[0_-4px_16px_rgba(26,39,68,0.06)] lg:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex flex-col items-center gap-1.5 px-4 py-2 transition-all ${
                isActive ? 'text-navy' : 'text-ink-4 hover:text-ink-3'
              }`}
            >
              <div className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${isActive ? 'bg-navy-wash' : 'bg-transparent'}`}>
                <Icon size={20} className={isActive ? 'text-navy' : ''} />
              </div>
              <span className={`font-mono text-[9px] tracking-[0.08em] uppercase ${isActive ? 'font-medium' : 'font-normal'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
