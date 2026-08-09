import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import foxLogo from '../../assets/fox-logo.svg'
import { useAuth } from '../../context/AuthContext'

export function AdminLayout() {
  const { t } = useTranslation()
  const { username, logout } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-cream px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={foxLogo} alt="Valiente Café" className="h-9 w-9" />
            <span className="font-serif text-lg text-lavender-dark">
              {t('admin.panelTitle')}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {username && <span className="text-sm text-gray-500">{username}</span>}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-lavender px-4 py-1.5 text-sm font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white"
            >
              {t('admin.logout')}
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
