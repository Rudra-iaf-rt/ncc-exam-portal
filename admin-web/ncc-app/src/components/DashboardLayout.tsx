import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { storage } from '../lib/storage'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/create-exam', label: 'Create Exam' },
  { to: '/exam-attempt', label: 'Exam Attempt UI' },
  { to: '/upload-materials', label: 'Upload Materials' },
  { to: '/results', label: 'Results' },
]

export function DashboardLayout() {
  const navigate = useNavigate()
  const user = storage.getUser()

  function logout() {
    storage.clearAll()
    navigate('/login')
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <p className="brand-tag">NCC Exam Portal</p>
          <h1 className="brand-title">Admin Dashboard</h1>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className="btn btn-outline" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h2 className="page-title">Welcome, {user?.name ?? 'Admin'}</h2>
            <p className="page-subtitle">Manage exams and monitor student performance.</p>
          </div>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
