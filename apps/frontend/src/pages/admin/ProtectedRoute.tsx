import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute() {
  const { t } = useTranslation()
  const { initialized, authenticated, login } = useAuth()

  useEffect(() => {
    if (initialized && !authenticated) {
      login()
    }
  }, [initialized, authenticated, login])

  if (!initialized || !authenticated) {
    return (
      <section className="px-6 py-24 text-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </section>
    )
  }

  return <Outlet />
}
