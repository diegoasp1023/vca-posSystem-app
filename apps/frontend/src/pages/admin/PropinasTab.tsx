import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  fetchNomina,
  fetchTips,
  updateTips,
  type NominaItem,
  type TipPool,
} from '../../lib/adminApi'
import {
  MonthYearPicker,
  MultiSelectDropdown,
  PeriodBanner,
  usePayrollPeriod,
} from './PayrollShared'

export function PropinasTab({
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

  const [employees, setEmployees] = useState<NominaItem[]>([])
  const [tips, setTips] = useState<TipPool | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const [tipAmount, setTipAmount] = useState('')
  const [tipParticipants, setTipParticipants] = useState<Set<number>>(new Set())
  const [tipError, setTipError] = useState<string | null>(null)

  const { period, close } = usePayrollPeriod(year, month)
  const isOpen = period?.estado === 'abierto'

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then(async (token) => {
        const [nomina, tipPool] = await Promise.all([
          fetchNomina(token, year, month),
          fetchTips(token, year, month),
        ])
        setEmployees(nomina)
        setTips(tipPool)
        setTipAmount(String(tipPool.monto_total_cop))
        setTipParticipants(new Set(tipPool.participant_ids))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [year, month, getToken])

  useEffect(reload, [reload])

  const submitTips = async (e: FormEvent) => {
    e.preventDefault()
    setTipError(null)
    try {
      const token = await getToken()
      const updated = await updateTips(
        token,
        year,
        month,
        Number(tipAmount) || 0,
        [...tipParticipants],
      )
      setTips(updated)
    } catch {
      setTipError(t('admin.saveError'))
    }
  }

  const previewPerPerson =
    tipParticipants.size > 0
      ? Math.floor((Number(tipAmount) || 0) / tipParticipants.size)
      : 0

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

      {status === 'ready' && (
        <section className="mt-10">
          <h2 className="font-serif text-xl text-lavender-dark">{t('admin.tips')}</h2>

          <form
            onSubmit={submitTips}
            className="mt-4 rounded-2xl border border-cream bg-white p-6"
          >
            <label className="block max-w-xs text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('admin.totalTipAmount')}
              </span>
              <input
                type="number"
                min={0}
                disabled={!isOpen}
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="w-full rounded-lg border border-cream px-3 py-2 disabled:bg-cream"
              />
            </label>

            <div className="mt-4">
              <span className="mb-1 block text-sm font-semibold text-lavender-dark">
                {t('admin.tipParticipants')}
              </span>
              <MultiSelectDropdown
                options={employees.map((employee) => ({
                  id: employee.employee_id,
                  label: `${employee.nombre} ${employee.apellido}`,
                }))}
                selected={tipParticipants}
                onChange={setTipParticipants}
                disabled={!isOpen}
                placeholder={t('admin.tipParticipants')}
              />
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {t('admin.perPersonPreview')}:{' '}
              <span className="font-semibold text-lavender-dark">
                ${previewPerPerson.toLocaleString('es-CO')}
              </span>
            </p>

            {isOpen && (
              <button
                type="submit"
                className="mt-4 rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('admin.save')}
              </button>
            )}
            {!isOpen && (
              <p className="mt-4 text-sm font-semibold text-amber-700">
                {t('admin.periodLockedNotice')}
              </p>
            )}
            {tipError && (
              <p className="mt-2 text-sm font-semibold text-coral-dark">{tipError}</p>
            )}
          </form>

          {tips && tips.participant_ids.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {t('admin.currentPerPerson')}: $
              {tips.monto_por_persona.toLocaleString('es-CO')}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
