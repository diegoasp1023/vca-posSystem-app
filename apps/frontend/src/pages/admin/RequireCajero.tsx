import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function RequireCajero() {
  const { roles } = useAuth()

  if (!roles.includes('Cajero') && !roles.includes('Administrador')) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
