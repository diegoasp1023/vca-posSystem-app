import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  closeCashSession,
  fetchCurrentCashSession,
  openCashSession,
  type CashSession,
} from '../../lib/adminApi'
import { BackToPanelLink } from './BackToPanelLink'
import { CuentasTab } from './CuentasTab'
import { TabHistoryTab } from './TabHistoryTab'
import { TabPaymentMethodsTab } from './TabPaymentMethodsTab'

type PageTab = 'cuentas' | 'historico' | 'metodos'

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

  const handleOpen = async () => {
    const token = await getToken()
    await openCashSession(token)
    reloadCashSession()
  }

  const handleClose = async () => {
    if (!window.confirm(t('adminTabs.confirmCloseCashSession'))) return
    const token = await getToken()
    try {
      await closeCashSession(token)
      reloadCashSession()
    } catch (error) {
      const message =
        error instanceof AdminApiError && error.status === 400
          ? t('adminTabs.closeCashSessionUnpaidError')
          : t('admin.saveError')
      window.alert(message)
    }
  }

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <BackToPanelLink />

        <h1 className="mt-4 font-serif text-3xl text-lavender-dark">{t('adminTabs.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('adminTabs.description')}</p>

        {cashSessionStatus === 'ready' && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream bg-white p-4">
            <span className="text-sm font-semibold text-lavender-dark">
              {cashSession
                ? t('adminTabs.cashSessionOpenLabel', {
                    time: new Date(cashSession.opened_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    username: cashSession.opened_by,
                  })
                : t('adminTabs.cashSessionClosedLabel')}
            </span>
            {cashSession ? (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-coral px-5 py-2 text-sm font-semibold text-coral-dark hover:bg-coral/10"
              >
                {t('adminTabs.closeCashSession')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpen}
                className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('adminTabs.openCashSession')}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-cream">
          <TabButton active={tab === 'cuentas'} onClick={() => setTab('cuentas')}>
            {t('adminTabs.cuentasTab')}
          </TabButton>
          <TabButton active={tab === 'historico'} onClick={() => setTab('historico')}>
            {t('adminTabs.historyTab')}
          </TabButton>
          {isAdmin && (
            <TabButton active={tab === 'metodos'} onClick={() => setTab('metodos')}>
              {t('adminTabs.paymentMethodsTab')}
            </TabButton>
          )}
        </div>

        {tab === 'cuentas' && <CuentasTab cashSessionOpen={cashSession !== null} />}
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
