import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Trophy, 
  Users, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import './admin.css';
import { useEffect } from 'react';

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('adm-body');
    return () => document.body.classList.remove('adm-body');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="adm-layout">
      {/* Sidebar — Overhauled per Style Guide */}
      <aside className="adm-sidebar">
        <div className="adm-sb-brand">
          <div className="adm-sb-emblem">
            <div className="adm-sb-shield">
              <span className="adm-sb-shield-txt">NCC</span>
            </div>
            <div>
              <div className="adm-sb-name">Admin Portal</div>
              <div className="adm-sb-sub">Exam Portal · Unit HQ</div>
            </div>
          </div>
        </div>

        <div className="adm-sb-section">Examinations</div>
        <nav style={{ flex: 1 }}>
          <NavLink to="/admin/dashboard" className={({ isActive }) => `adm-nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} strokeWidth={1.5} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/exams" className={({ isActive }) => `adm-nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={18} strokeWidth={1.5} />
            <span>Manage Exams</span>
          </NavLink>
          <NavLink to="/admin/results" className={({ isActive }) => `adm-nav-link ${isActive ? 'active' : ''}`}>
            <Trophy size={18} strokeWidth={1.5} />
            <span>Exam Results</span>
          </NavLink>
          
          <div className="adm-sb-section">Management</div>
          <NavLink to="/admin/users" className={({ isActive }) => `adm-nav-link ${isActive ? 'active' : ''}`}>
            <Users size={18} strokeWidth={1.5} />
            <span>Cadet Registry</span>
            <span className="adm-badge adm-badge-neutral" style={{ marginLeft: 'auto', fontSize: '0.6rem', opacity: 0.6 }}>Soon</span>
          </NavLink>
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: '16px', padding: '0 8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#E8E4D4' }}>{user?.name || 'Admin Officer'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', wordBreak: 'break-all' }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="adm-btn adm-btn-ghost" style={{ width: '100%', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <LogOut size={16} strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  );
}
