import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuth';
import { 
  LayoutDashboard, 
  FileText, 
  Trophy, 
  Users, 
  LogOut,
  ShieldCheck,
  UserCheck,
  Menu,
  X
} from 'lucide-react';

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
        <div className="p-7 pb-5 border-b border-white/10 mb-2">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-11 bg-gold shrink-0 flex items-center justify-center" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
              <span className="font-mono text-[12px] font-bold text-navy mt-[-2px]">NCC</span>
            </div>
            <div>
              <div className="font-display text-[20px] text-[#E8E4D4] leading-tight italic">Admin Portal</div>
              <div className="font-mono text-[10px] text-white/40 tracking-[0.1em] uppercase mt-1">Exam Portal · Unit HQ</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/30 px-7 pt-4 pb-2">Examinations</div>
          <nav className="flex flex-col gap-1 px-4">
            <NavLink to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <LayoutDashboard size={18} strokeWidth={1.5} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/exams" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <FileText size={18} strokeWidth={1.5} />
              <span>Manage Exams</span>
            </NavLink>
            <NavLink to="/admin/results" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <Trophy size={18} strokeWidth={1.5} />
              <span>Exam Results</span>
            </NavLink>
            <NavLink to="/admin/assignments" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <ShieldCheck size={18} strokeWidth={1.5} />
              <span>Eligibility</span>
            </NavLink>
          </nav>

          <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/30 px-7 pt-6 pb-2">Management</div>
          <nav className="flex flex-col gap-1 px-4">
            <NavLink to="/admin/users" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <Users size={18} strokeWidth={1.5} />
              <span>Cadet Registry</span>
            </NavLink>

          </nav>

          <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-white/30 px-7 pt-6 pb-2">System</div>
          <nav className="flex flex-col gap-1 px-4">
            <NavLink to="/admin/logs" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-r font-ui text-[14px] transition-all ${isActive ? 'bg-white/10 text-[#E8E4D4] font-medium' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
              <ShieldCheck size={18} strokeWidth={1.5} />
              <span>Audit Logs</span>
            </NavLink>
          </nav>
        </div>

        <div className="p-6 border-t border-white/10 mt-auto">
          <div className="mb-4 px-2">
            <div className="font-ui text-[13px] font-bold text-[#E8E4D4]">{user?.name || 'Admin Officer'}</div>
            <div className="font-mono text-[11px] text-white/30 break-all mt-0.5">{user?.email}</div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-colors font-ui text-[13px] font-medium"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 lg:px-12 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
