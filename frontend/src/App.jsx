import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAdmin } from './admin/guards/RequireAdmin'
import { AdminLayout } from './admin/AdminLayout'
import AdminLogin from './admin/pages/AdminLogin'
import Dashboard from './admin/pages/Dashboard'
import ExamList from './admin/pages/ExamList'
import ExamCreate from './admin/pages/ExamCreate'
import ResultsBoard from './admin/pages/ResultsBoard'
import UserManagement from './admin/pages/UserManagement'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>NCC Exam Portal</h1>
          <p>Student view coming soon. Go to <a href="/admin">Admin Portal</a></p>
        </div>
      } />

      {/* Admin Portal */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="exams" element={<ExamList />} />
          <Route path="exams/create" element={<ExamCreate />} />
          <Route path="results" element={<ResultsBoard />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
