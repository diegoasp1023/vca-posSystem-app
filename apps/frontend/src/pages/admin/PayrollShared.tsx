import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  approvePayrollPeriod,
  fetchPayrollPeriod,
  type PayrollPeriod,
} from '../../lib/adminApi'

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

  const approve = useCallback(async () => {
    const token = await getToken()
    const updated = await approvePayrollPeriod(token, year, month)
    setPeriod(updated)
  }, [year, month, getToken])

  return { period, reloadPeriod: reload, approve }
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
  onApprove,
}: {
  period: PayrollPeriod | null
  onApprove: () => void
}) {
  const { t } = useTranslation()
  if (!period) return null

  const styles: Record<string, string> = {
    abierto: 'bg-green-100 text-green-700',
    cerrado: 'bg-amber-100 text-amber-700',
    aprobado: 'bg-gray-200 text-gray-600',
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[period.estado]}`}>
        {t(`admin.periodState.${period.estado}`)}
      </span>
      {period.estado === 'cerrado' && (
        <button
          type="button"
          onClick={onApprove}
          className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('admin.approvePeriod')}
        </button>
      )}
    </div>
  )
}
