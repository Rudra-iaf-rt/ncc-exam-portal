import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAdmin } from './admin/guards/RequireAdmin'
import { RequireStaff } from './admin/guards/RequireStaff'
import { AdminLayout } from './admin/AdminLayout'
import AdminLogin from './admin/pages/AdminLogin'
import CadetLogin from './cadet/pages/Login'
import CadetDashboard from './cadet/pages/Dashboard'
import ExamAttempt from './cadet/pages/ExamAttempt'
import CadetResults from './cadet/pages/Results'
import CadetMaterials from './cadet/pages/Materials'
import { RequireCadet } from './cadet/guards/RequireCadet'
import { CadetLayout } from './cadet/components/CadetLayout'
import Dashboard from './admin/pages/Dashboard'
import ExamList from './admin/pages/ExamList'
import ExamCreate from './admin/pages/ExamCreate'
import ResultsBoard from './admin/pages/ResultsBoard'
import UserManagement from './admin/pages/UserManagement'

import Assignments from './admin/pages/Assignments'
import AuditLogs from './admin/pages/AuditLogs'
import { Toaster } from 'sonner'
import { ShieldCheck, ShieldAlert, Info } from 'lucide-react'


function App() {
  return (
    <>
      <Toaster 
        position="top-right" 
        richColors 
        expand={true}
        icons={{
          success: <ShieldCheck size={18} />,
          error: <ShieldAlert size={18} />,
          info: <Info size={18} />,
        }}
        toastOptions={{
          style: {
            background: 'var(--color-white)',
            border: '1px solid var(--color-stone-deep)',
            borderRadius: '12px',
            fontFamily: 'var(--font-ui)',
          },
          className: 'ncc-toast-official',
        }}
      />
      <Routes>
        {/* Public / Landing */}
        <Route path="/" element={<CadetLogin />} />
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Cadet Portal */}
        <Route element={<RequireCadet />}>
          <Route element={<CadetLayout />}>
            <Route path="/dashboard" element={<CadetDashboard />} />
            <Route path="/results" element={<CadetResults />} />
            <Route path="/materials" element={<CadetMaterials />} />
          </Route>
          {/* ExamAttempt is outside CadetLayout so it can be full screen without navigation */}
          <Route path="/exam/:id" element={<ExamAttempt />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="exams" element={<ExamList />} />
            <Route path="exams/create" element={<ExamCreate />} />
            <Route path="results" element={<ResultsBoard />} />
            <Route path="assignments" element={<Assignments />} />
            
            {/* Admin-only sections */}
            <Route element={<RequireAdmin />}>
              <Route path="users" element={<UserManagement />} />

              <Route path="logs" element={<AuditLogs />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
