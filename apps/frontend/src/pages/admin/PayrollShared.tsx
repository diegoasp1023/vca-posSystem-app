import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  closePayrollPeriod,
  fetchPayrollPeriod,
  type PayrollPeriod,
} from '../../lib/adminApi'
import { Pagination } from '../../components/Pagination'

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function usePayrollPeriod(year: number, month: number) {
  const { getToken } = useAuth()
  const [period, setPeriod] = useState<PayrollPeriod | null>(null)

  const reload = useCallback(() => {
    getToken()
      .then((token) => fetchPayrollPeriod(token, year, month))
      .then(setPeriod)
  }, [year, month, getToken])

  useEffect(reload, [reload])

  const close = useCallback(async () => {
    const token = await getToken()
    const updated = await closePayrollPeriod(token, year, month)
    setPeriod(updated)
  }, [year, month, getToken])

  return { period, reloadPeriod: reload, close }
}

export function MonthYearPicker({
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
  const now = new Date()
  const years = Array.from({ length: 30 }, (_, i) => now.getFullYear() - 5 + i)

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-lavender-dark">
          {t('admin.month')}
        </span>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="rounded-lg border border-cream px-3 py-2"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {t(`admin.months.${m}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-lavender-dark">
          {t('admin.year')}
        </span>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-cream px-3 py-2"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function PeriodBanner({
  period,
  onClose,
}: {
  period: PayrollPeriod | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  if (!period) return null

  const styles: Record<string, string> = {
    abierto: 'bg-green-100 text-green-700',
    cerrado: 'bg-gray-200 text-gray-600',
  }

  const handleClose = () => {
    if (
      window.confirm(
        t('admin.confirmClosePeriod', {
          month: t(`admin.months.${period.month}`),
          year: period.year,
        }),
      )
    ) {
      onClose()
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[period.estado]}`}>
        {t(`admin.periodState.${period.estado}`)}
      </span>
      {period.estado === 'abierto' && (
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('admin.closePeriod')}
        </button>
      )}
    </div>
  )
}

export function usePagedList<T>(items: T[], initialPageSize: 10 | 20 | 50 = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState<10 | 20 | 50>(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  const setPageSize = (size: 10 | 20 | 50) => {
    setPageSizeState(size)
    setPage(1)
  }

  return { page: safePage, setPage, pageSize, setPageSize, totalPages, pageItems }
}

export function PageSizeSelect({
  pageSize,
  onChange,
}: {
  pageSize: 10 | 20 | 50
  onChange: (size: 10 | 20 | 50) => void
}) {
  const { t } = useTranslation()
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      {t('admin.pageSize')}
      <select
        value={pageSize}
        onChange={(e) => onChange(Number(e.target.value) as 10 | 20 | 50)}
        className="rounded-lg border border-cream px-2 py-1"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </label>
  )
}

export function TableFooterPagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: 10 | 20 | 50
  onPageChange: (page: number) => void
  onPageSizeChange: (size: 10 | 20 | 50) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <PageSizeSelect pageSize={pageSize} onChange={onPageSizeChange} />
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
