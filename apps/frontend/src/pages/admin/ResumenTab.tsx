import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchPayrollSummary, type PayrollSummary } from '../../lib/adminApi'
import { MonthYearPicker, PeriodBanner, usePayrollPeriod } from './PayrollShared'

export function ResumenTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const { period, approve } = usePayrollPeriod(year, month)

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
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
        <PeriodBanner period={period} onApprove={approve} />
      </div>

      {status === 'loading' && (
        <p className="mt-10 text-gray-500">{t('common.loading')}</p>
      )}
      {status === 'error' && (
        <p className="mt-10 text-gray-500">{t('common.error')}</p>
      )}
      {status === 'ready' && summary && (
        <>
          <table className="mt-8 w-full text-left text-sm">
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
              {summary.items.map((item) => (
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
