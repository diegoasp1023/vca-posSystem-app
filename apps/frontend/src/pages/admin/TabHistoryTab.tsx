import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '../../components/Pagination'
import { useAuth } from '../../context/AuthContext'
import { fetchTabHistory, type Tab } from '../../lib/adminApi'
import { formatDuration, PaymentsSummary, tabTitle } from './TabCard'

export function TabHistoryTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(
    (start: string, end: string, targetPage: number, targetPageSize: number) => {
      setStatus('loading')
      getToken()
        .then((token) =>
          fetchTabHistory(token, {
            start_date: start || undefined,
            end_date: end || undefined,
            page: targetPage,
            page_size: targetPageSize,
          }),
        )
        .then((result) => {
          setTabs(result.items)
          setTotalPages(result.total_pages)
          setStatus('ready')
        })
        .catch(() => setStatus('error'))
    },
    [getToken],
  )

  useEffect(() => {
    load(startDate, endDate, page, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const applyManualFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(startDate, endDate, 1, pageSize)
  }

  const pagination = (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPage(1)
      }}
    />
  )

  return (
    <div className="mt-6">
      <form onSubmit={applyManualFilter} className="flex flex-wrap items-end gap-3">
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

      {status === 'ready' && pagination}

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
                  <p className="font-semibold text-lavender-dark">{tabTitle(tab, t)}</p>
                  {tab.paid_at && (
                    <p className="text-xs text-gray-500">
                      {t('adminTabs.paidOn', {
                        date: new Date(tab.paid_at).toLocaleString('es-CO'),
                      })}
                    </p>
                  )}
                  {tab.paid_at && (
                    <p className="text-xs text-gray-500">
                      {t('adminTabs.wasOpenForDuration', {
                        duration: formatDuration(tab.opened_at, new Date(tab.paid_at)),
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

              <PaymentsSummary tab={tab} />
            </div>
          ))}
        </div>
      )}

      {status === 'ready' && pagination}
    </div>
  )
}
