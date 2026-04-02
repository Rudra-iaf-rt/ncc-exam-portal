import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardHomePage } from './pages/DashboardHomePage'
import { CreateExamPage } from './pages/CreateExamPage'
import { ExamAttemptPage } from './pages/ExamAttemptPage'
import { LoginPage } from './pages/LoginPage'
import { ResultsPage } from './pages/ResultsPage'
import { UploadMaterialsPage } from './pages/UploadMaterialsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />
        <Route path="create-exam" element={<CreateExamPage />} />
        <Route path="exam-attempt" element={<ExamAttemptPage />} />
        <Route path="upload-materials" element={<UploadMaterialsPage />} />
        <Route path="results" element={<ResultsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
