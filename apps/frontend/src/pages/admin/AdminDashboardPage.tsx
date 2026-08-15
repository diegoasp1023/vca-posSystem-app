import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackToPanelLink } from './BackToPanelLink'
import { BusyHoursChart, PaymentMethodsChart, SalesChart, TopProductsChart } from './DashboardCharts'
import { useAuth } from '../../context/AuthContext'
import {
  fetchDashboardMetrics,
  fetchTabPaymentMethods,
  type DashboardMetrics,
  type TabAccountType,
  type TabPaymentMethod,
} from '../../lib/adminApi'

type Preset = 'today' | 'week' | 'month' | 'custom'

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function rangeForPreset(preset: Preset): { start: string; end: string } {
  const now = new Date()
  const end = toIsoDate(now)
  if (preset === 'today') return { start: end, end }
  if (preset === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { start: toIsoDate(start), end }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start: toIsoDate(start), end }
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-lavender-dark">{value}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [preset, setPreset] = useState<Preset>('month')
  const initial = rangeForPreset('month')
  const [startDate, setStartDate] = useState(initial.start)
  const [endDate, setEndDate] = useState(initial.end)
  const [accountType, setAccountType] = useState<TabAccountType | ''>('')
  const [paymentMethodId, setPaymentMethodId] = useState<number | ''>('')
  const [paymentMethods, setPaymentMethods] = useState<TabPaymentMethod[]>([])

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    getToken().then((token) => fetchTabPaymentMethods(token).then(setPaymentMethods))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) =>
        fetchDashboardMetrics(token, {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          account_type: accountType || undefined,
          payment_method_id: paymentMethodId === '' ? undefined : paymentMethodId,
        }),
      )
      .then((result) => {
        setMetrics(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [getToken, startDate, endDate, accountType, paymentMethodId])

  useEffect(load, [load])

  const applyPreset = (next: Preset) => {
    setPreset(next)
    if (next !== 'custom') {
      const { start, end } = rangeForPreset(next)
      setStartDate(start)
      setEndDate(end)
    }
  }

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <BackToPanelLink />

        <h1 className="mt-4 font-serif text-3xl text-lavender-dark">
          {t('admin.dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.dashboard.description')}</p>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-cream bg-white p-4">
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'custom'] as Preset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  preset === p
                    ? 'bg-coral text-white'
                    : 'border border-lavender text-lavender-dark hover:bg-cream'
                }`}
              >
                {t(`admin.dashboard.preset.${p}`)}
              </button>
            ))}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.dashboard.startDate')}
            </span>
            <input
              type="date"
              value={startDate}
              disabled={preset !== 'custom'}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-cream px-3 py-2 disabled:bg-cream disabled:text-gray-400"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.dashboard.endDate')}
            </span>
            <input
              type="date"
              value={endDate}
              disabled={preset !== 'custom'}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-cream px-3 py-2 disabled:bg-cream disabled:text-gray-400"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.dashboard.accountType')}
            </span>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as TabAccountType | '')}
              className="rounded-lg border border-cream px-3 py-2"
            >
              <option value="">{t('admin.dashboard.allAccountTypes')}</option>
              <option value="dine_in">{t('admin.dashboard.accountTypeDineIn')}</option>
              <option value="takeaway">{t('adminTabs.accountTypeTakeaway')}</option>
              <option value="custom">{t('adminTabs.accountTypeCustom')}</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.dashboard.paymentMethod')}
            </span>
            <select
              value={paymentMethodId}
              onChange={(e) =>
                setPaymentMethodId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="rounded-lg border border-cream px-3 py-2"
            >
              <option value="">{t('admin.dashboard.allPaymentMethods')}</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {status === 'loading' && (
          <p className="mt-10 text-gray-500">{t('common.loading')}</p>
        )}
        {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}

        {status === 'ready' && metrics && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label={t('admin.dashboard.totalRevenue')}
                value={`$${metrics.sales.total_revenue_cop.toLocaleString('es-CO')}`}
              />
              <KpiCard
                label={t('admin.dashboard.averageTicket')}
                value={`$${metrics.sales.average_ticket_cop.toLocaleString('es-CO')}`}
              />
              <KpiCard
                label={t('admin.dashboard.closedTabs')}
                value={metrics.sales.closed_tabs_count.toLocaleString('es-CO')}
              />
              <KpiCard
                label={t('admin.dashboard.averageDuration')}
                value={t('admin.dashboard.minutes', {
                  count: metrics.average_tab_duration_minutes,
                })}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label={t('admin.dashboard.calculatedTips')}
                value={`$${metrics.tips.calculated_total_cop.toLocaleString('es-CO')}`}
              />
              <KpiCard
                label={t('admin.dashboard.declaredTips')}
                value={
                  metrics.tips.declared_total_cop === null
                    ? t('admin.dashboard.notAvailable')
                    : `$${metrics.tips.declared_total_cop.toLocaleString('es-CO')}`
                }
              />
              <KpiCard
                label={t('admin.dashboard.laborCost')}
                value={`$${metrics.labor_cost.total_cost_cop.toLocaleString('es-CO')} (${metrics.labor_cost.total_hours}h)`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <SalesChart sales={metrics.sales} />
              <TopProductsChart products={metrics.top_products} />
              <PaymentMethodsChart methods={metrics.payment_methods} />
              <BusyHoursChart hours={metrics.busy_hours} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
