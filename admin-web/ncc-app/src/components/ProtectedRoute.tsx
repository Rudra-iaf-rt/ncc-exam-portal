import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { storage } from '../lib/storage'

type Props = {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const location = useLocation()
  const token = storage.getToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
