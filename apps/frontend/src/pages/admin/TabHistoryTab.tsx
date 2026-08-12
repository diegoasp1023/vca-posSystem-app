import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchTabHistory, type Tab } from '../../lib/adminApi'

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function TabHistoryTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const load = useCallback(
    (start: string, end: string) => {
      setStatus('loading')
      getToken()
        .then((token) =>
          fetchTabHistory(token, {
            start_date: start || undefined,
            end_date: end || undefined,
          }),
        )
        .then((result) => {
          setTabs(result)
          setStatus('ready')
        })
        .catch(() => setStatus('error'))
    },
    [getToken],
  )

  useEffect(() => {
    load('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPreset = (preset: 'today' | 'month' | 'year') => {
    const now = new Date()
    let start: Date
    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      start = new Date(now.getFullYear(), 0, 1)
    }
    const startIso = toIsoDate(start)
    const endIso = toIsoDate(now)
    setStartDate(startIso)
    setEndDate(endIso)
    load(startIso, endIso)
  }

  const applyManualFilter = (e: React.FormEvent) => {
    e.preventDefault()
    load(startDate, endDate)
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyPreset('today')}
          className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
        >
          {t('adminTabs.historyFilterToday')}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('month')}
          className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
        >
          {t('adminTabs.historyFilterThisMonth')}
        </button>
        <button
          type="button"
          onClick={() => applyPreset('year')}
          className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
        >
          {t('adminTabs.historyFilterThisYear')}
        </button>
      </div>

      <form onSubmit={applyManualFilter} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-lavender-dark">
            {t('adminTabs.historyStartDate')}
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-cream px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-lavender-dark">
            {t('adminTabs.historyEndDate')}
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-cream px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('adminTabs.historyApplyFilter')}
        </button>
      </form>

      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}
      {status === 'ready' && tabs.length === 0 && (
        <p className="mt-10 text-gray-500">{t('adminTabs.noHistory')}</p>
      )}

      {status === 'ready' && tabs.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tabs.map((tab) => (
            <div key={tab.id} className="rounded-2xl border border-cream bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-lavender-dark">
                    {tab.table_number ?? tab.reference_note ?? t('adminTabs.untitledTab')}
                  </p>
                  {tab.paid_at && (
                    <p className="text-xs text-gray-500">
                      {t('adminTabs.paidOn', {
                        date: new Date(tab.paid_at).toLocaleString('es-CO'),
                      })}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {t('adminTabs.statusPaid')}
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {tab.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="flex-1">{item.name.es}</span>
                    <span className="text-gray-500">×{item.quantity}</span>
                    <span className="w-20 text-right">
                      ${item.subtotal_cop.toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-cream pt-3 font-semibold text-lavender-dark">
                <span>{t('adminTabs.total')}</span>
                <span>${tab.total_cop.toLocaleString('es-CO')}</span>
              </div>

              {tab.payment_method && (
                <p className="mt-2 text-xs text-gray-500">
                  {t('adminTabs.fields.paymentMethod')}: {tab.payment_method.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
