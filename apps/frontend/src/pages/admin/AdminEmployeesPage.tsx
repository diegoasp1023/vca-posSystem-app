import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BonosTab } from './BonosTab'
import { EmployeesTab } from './EmployeesTab'
import { TurnosTab } from './TurnosTab'
import { ResumenTab } from './ResumenTab'

type Tab = 'empleados' | 'turnos' | 'bonos' | 'resumen'

export function AdminEmployeesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('empleados')

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/admin"
          className="text-sm font-semibold text-lavender-dark hover:underline"
        >
          {t('admin.backToPanel')}
        </Link>

        <h1 className="mt-4 font-serif text-3xl text-lavender-dark">
          {t('admin.manageEmployees')}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.manageEmployeesDesc')}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-cream">
          <TabButton active={tab === 'empleados'} onClick={() => setTab('empleados')}>
            {t('admin.employeesTab')}
          </TabButton>
          <TabButton active={tab === 'turnos'} onClick={() => setTab('turnos')}>
            {t('admin.nominaTab')}
          </TabButton>
          <TabButton active={tab === 'bonos'} onClick={() => setTab('bonos')}>
            {t('admin.bonosTab')}
          </TabButton>
          <TabButton active={tab === 'resumen'} onClick={() => setTab('resumen')}>
            {t('admin.resumenTab')}
          </TabButton>
        </div>

        {tab === 'empleados' && <EmployeesTab />}
        {tab === 'turnos' && (
          <TurnosTab year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />
        )}
        {tab === 'bonos' && (
          <BonosTab year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />
        )}
        {tab === 'resumen' && (
          <ResumenTab year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />
        )}
      </div>
    </section>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-coral text-coral-dark'
          : 'border-transparent text-gray-500 hover:text-lavender-dark'
      }`}
    >
      {children}
    </button>
  )
}
