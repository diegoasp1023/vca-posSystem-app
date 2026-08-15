import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchPayrollSummary, type PayrollSummary } from '../../lib/adminApi'
import { downloadCsv } from '../../lib/csv'
import {
  MonthYearPicker,
  PeriodBanner,
  TableFooterPagination,
  usePagedList,
  usePayrollPeriod,
} from './PayrollShared'

function exportSummaryToCsv(summary: PayrollSummary) {
  const headers = ['Nombre', 'Apellido', 'Pago base', 'Bonos', 'Propina', 'Total']
  const rows = summary.items.map((item) => [
    item.nombre,
    item.apellido,
    item.pago_base_cop,
    item.bonos_cop,
    item.propina_cop,
    item.total_cop,
  ])
  downloadCsv(`nomina-${summary.year}-${String(summary.month).padStart(2, '0')}.csv`, headers, rows)
}

export function ResumenTab({
  year,
  month,
  onYearChange,
  onMonthChange,
}: {
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const { period, close } = usePayrollPeriod(year, month)
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pageItems,
  } = usePagedList(summary?.items ?? [])

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchPayrollSummary(token, year, month))
      .then((result) => {
        setSummary(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [year, month, getToken])

  useEffect(reload, [reload])

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <MonthYearPicker
          year={year}
          month={month}
          onYearChange={onYearChange}
          onMonthChange={onMonthChange}
        />
        <PeriodBanner period={period} onClose={close} />
      </div>

      {status === 'loading' && (
        <p className="mt-10 text-gray-500">{t('common.loading')}</p>
      )}
      {status === 'error' && (
        <p className="mt-10 text-gray-500">{t('common.error')}</p>
      )}
      {status === 'ready' && summary && (
        <>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => exportSummaryToCsv(summary)}
              disabled={summary.items.length === 0}
              className="rounded-full border border-lavender px-5 py-2 text-sm font-semibold text-lavender-dark transition hover:bg-cream disabled:opacity-50"
            >
              {t('admin.exportCsv')}
            </button>
          </div>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream text-lavender">
                <th className="py-2">{t('admin.fields.firstName')}</th>
                <th className="py-2">{t('admin.fields.lastName')}</th>
                <th className="py-2">{t('admin.baseAmount')}</th>
                <th className="py-2">{t('admin.bonuses')}</th>
                <th className="py-2">{t('admin.tips')}</th>
                <th className="py-2">{t('admin.total')}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.employee_id} className="border-b border-cream">
                  <td className="py-3">{item.nombre}</td>
                  <td className="py-3">{item.apellido}</td>
                  <td className="py-3">
                    ${item.pago_base_cop.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3">${item.bonos_cop.toLocaleString('es-CO')}</td>
                  <td className="py-3">
                    ${item.propina_cop.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 font-semibold text-lavender-dark">
                    ${item.total_cop.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
              {summary.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    {t('admin.noEligibleEmployees')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {summary.items.length > 0 && (
            <TableFooterPagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}

          <div className="mt-4 flex justify-end rounded-2xl border border-cream bg-white p-4 text-sm">
            <p>
              <span className="font-semibold text-lavender-dark">
                {t('admin.grandTotal')}:
              </span>{' '}
              ${summary.total_general_cop.toLocaleString('es-CO')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
