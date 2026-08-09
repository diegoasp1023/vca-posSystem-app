import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function RequireGerente() {
  const { roles } = useAuth()

  if (!roles.includes('Gerente') && !roles.includes('Administrador')) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
