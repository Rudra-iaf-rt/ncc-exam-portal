import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the Service Worker for offline support
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.')
  },
  onOfflineReady() {
    console.log('App is ready to work offline.')
  },
})

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
