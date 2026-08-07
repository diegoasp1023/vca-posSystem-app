import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmployeesTab } from './EmployeesTab'
import { ShiftsTab } from './ShiftsTab'

type Tab = 'empleados' | 'turnos'

export function AdminEmployeesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('empleados')

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

        <div className="mt-6 flex gap-2 border-b border-cream">
          <TabButton active={tab === 'empleados'} onClick={() => setTab('empleados')}>
            {t('admin.employeesTab')}
          </TabButton>
          <TabButton active={tab === 'turnos'} onClick={() => setTab('turnos')}>
            {t('admin.shiftsTab')}
          </TabButton>
        </div>

        {tab === 'empleados' ? <EmployeesTab /> : <ShiftsTab />}
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
