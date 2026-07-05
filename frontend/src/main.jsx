import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </ConfirmProvider>
    </BrowserRouter>
  </StrictMode>,
)
