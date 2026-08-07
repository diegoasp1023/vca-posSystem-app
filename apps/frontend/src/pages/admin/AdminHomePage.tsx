import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

export function AdminHomePage() {
  const { t } = useTranslation()
  const { username, roles } = useAuth()
  const isAdmin = roles.includes('Administrador')

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-4xl text-lavender-dark">
          {t('admin.welcome', { username })}
        </h1>

        {isAdmin ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Link
              to="/admin/cafes"
              className="rounded-2xl border border-cream bg-white p-8 text-left shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-lavender-dark">
                {t('admin.manageProducts')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('admin.manageProductsDesc')}
              </p>
            </Link>
            <Link
              to="/admin/cursos"
              className="rounded-2xl border border-cream bg-white p-8 text-left shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-lavender-dark">
                {t('admin.manageCourses')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('admin.manageCoursesDesc')}
              </p>
            </Link>
            <Link
              to="/admin/menu"
              className="rounded-2xl border border-cream bg-white p-8 text-left shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-lavender-dark">
                {t('adminMenu.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t('adminMenu.description')}</p>
            </Link>
            <Link
              to="/admin/personal"
              className="rounded-2xl border border-cream bg-white p-8 text-left shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-lavender-dark">
                {t('admin.manageEmployees')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('admin.manageEmployeesDesc')}
              </p>
            </Link>
          </div>
        ) : (
          <p className="mt-6 text-gray-600">{t('admin.noAccess')}</p>
        )}
      </div>
    </section>
  )
}
