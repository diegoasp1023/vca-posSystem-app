import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchCurrentCashSession, type CashSession } from '../../lib/adminApi'
import { BackToPanelLink } from './BackToPanelLink'
import { CuentasTab } from './CuentasTab'
import { FloorPlanEditorTab } from './FloorPlanEditorTab'
import { TabHistoryTab } from './TabHistoryTab'
import { TabPaymentMethodsTab } from './TabPaymentMethodsTab'

type PageTab = 'cuentas' | 'plano' | 'historico' | 'metodos'

export function AdminTabsPage() {
  const { t } = useTranslation()
  const { roles, getToken } = useAuth()
  const isAdmin = roles.includes('Administrador')
  const [tab, setTab] = useState<PageTab>('cuentas')

  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [cashSessionStatus, setCashSessionStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  )

  const reloadCashSession = useCallback(() => {
    setCashSessionStatus('loading')
    getToken()
      .then(fetchCurrentCashSession)
      .then((session) => {
        setCashSession(session)
        setCashSessionStatus('ready')
      })
      .catch(() => setCashSessionStatus('error'))
  }, [getToken])

  useEffect(reloadCashSession, [reloadCashSession])

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <BackToPanelLink />

        <h1 className="mt-4 font-serif text-3xl text-lavender-dark">{t('adminTabs.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('adminTabs.description')}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-cream">
          <TabButton active={tab === 'cuentas'} onClick={() => setTab('cuentas')}>
            {t('adminTabs.cuentasTab')}
          </TabButton>
          {isAdmin && (
            <TabButton active={tab === 'plano'} onClick={() => setTab('plano')}>
              {t('adminTabs.floorPlanTab')}
            </TabButton>
          )}
          <TabButton active={tab === 'historico'} onClick={() => setTab('historico')}>
            {t('adminTabs.historyTab')}
          </TabButton>
          {isAdmin && (
            <TabButton active={tab === 'metodos'} onClick={() => setTab('metodos')}>
              {t('adminTabs.paymentMethodsTab')}
            </TabButton>
          )}
        </div>

        {tab === 'cuentas' && (
          <CuentasTab
            cashSession={cashSessionStatus === 'ready' ? cashSession : undefined}
            onCashSessionChange={reloadCashSession}
          />
        )}
        {tab === 'plano' && isAdmin && <FloorPlanEditorTab />}
        {tab === 'historico' && <TabHistoryTab />}
        {tab === 'metodos' && isAdmin && <TabPaymentMethodsTab />}
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
