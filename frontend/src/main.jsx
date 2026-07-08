import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the Service Worker for offline support
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.')
  },
  onOfflineReady() {
    console.log('Tuning to work offline.')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary level="ROOT">
        <ConfirmProvider>
          <AdminAuthProvider>
            <App />
          </AdminAuthProvider>
        </ConfirmProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
