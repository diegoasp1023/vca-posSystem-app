import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  createShift,
  deleteShift,
  fetchAdminEmployees,
  fetchMonthlyShifts,
  type Employee,
  type MonthlyShiftSummary,
} from '../../lib/adminApi'

const EMPTY_SHIFT_FORM = { fecha: '', hora_inicio: '', hora_fin: '' }

export function ShiftsTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [hourlyEmployees, setHourlyEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<MonthlyShiftSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    getToken()
      .then(async (token) => {
        const first = await fetchAdminEmployees(token, 1)
        const rest = await Promise.all(
          Array.from({ length: first.total_pages - 1 }, (_, i) =>
            fetchAdminEmployees(token, i + 2),
          ),
        )
        return [first, ...rest].flatMap((page) => page.items)
      })
      .then((allEmployees) => {
        const active = allEmployees.filter(
          (e) => e.tipo_contrato === 'por_horas' && e.is_active,
        )
        setHourlyEmployees(active)
        if (active.length > 0) setEmployeeId(active[0].id)
      })
      .catch(() => setStatus('error'))
  }, [getToken])

  const reload = useCallback(() => {
    if (employeeId === null) return
    setStatus('loading')
    getToken()
      .then((token) => fetchMonthlyShifts(token, employeeId, year, month))
      .then((result) => {
        setSummary(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [employeeId, year, month, getToken])

  useEffect(reload, [reload])

  const submitShift = async (e: FormEvent) => {
    e.preventDefault()
    if (employeeId === null) return
    setFormError(null)
    try {
      const token = await getToken()
      await createShift(token, {
        employee_id: employeeId,
        fecha: shiftForm.fecha,
        hora_inicio: shiftForm.hora_inicio,
        hora_fin: shiftForm.hora_fin,
      })
      setShiftForm(EMPTY_SHIFT_FORM)
      reload()
    } catch {
      setFormError(t('admin.saveError'))
    }
  }

  const removeShift = async (id: number) => {
    if (!window.confirm(t('admin.confirmDeleteShift'))) return
    const token = await getToken()
    await deleteShift(token, id)
    reload()
  }

  if (hourlyEmployees.length === 0 && status !== 'loading') {
    return <p className="mt-10 text-gray-500">{t('admin.noHourlyEmployees')}</p>
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-lavender-dark">
            {t('admin.employee')}
          </span>
          <select
            value={employeeId ?? ''}
            onChange={(e) => setEmployeeId(Number(e.target.value))}
            className="rounded-lg border border-cream px-3 py-2"
          >
            {hourlyEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.nombre} {employee.apellido}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-lavender-dark">
            {t('admin.month')}
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-cream px-3 py-2"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-lavender-dark">
            {t('admin.year')}
          </span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-lg border border-cream px-3 py-2"
          />
        </label>
      </div>

      {employeeId !== null && (
        <form
          onSubmit={submitShift}
          className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-cream bg-white p-6"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.fields.shiftDate')} *
            </span>
            <input
              required
              type="date"
              value={shiftForm.fecha}
              onChange={(e) =>
                setShiftForm({ ...shiftForm, fecha: e.target.value })
              }
              className="rounded-lg border border-cream px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.fields.startTime')} *
            </span>
            <input
              required
              type="time"
              value={shiftForm.hora_inicio}
              onChange={(e) =>
                setShiftForm({ ...shiftForm, hora_inicio: e.target.value })
              }
              className="rounded-lg border border-cream px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('admin.fields.endTime')} *
            </span>
            <input
              required
              type="time"
              value={shiftForm.hora_fin}
              onChange={(e) =>
                setShiftForm({ ...shiftForm, hora_fin: e.target.value })
              }
              className="rounded-lg border border-cream px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('admin.addShift')}
          </button>
          {formError && (
            <p className="w-full text-sm font-semibold text-coral-dark">
              {formError}
            </p>
          )}
        </form>
      )}

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
                <th className="py-2">{t('admin.fields.shiftDate')}</th>
                <th className="py-2">{t('admin.fields.startTime')}</th>
                <th className="py-2">{t('admin.fields.endTime')}</th>
                <th className="py-2">{t('admin.hours')}</th>
                <th className="py-2">{t('admin.amount')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {summary.shifts.map((shift) => (
                <tr key={shift.id} className="border-b border-cream">
                  <td className="py-3">{shift.fecha}</td>
                  <td className="py-3">{shift.hora_inicio}</td>
                  <td className="py-3">{shift.hora_fin}</td>
                  <td className="py-3">{shift.horas}</td>
                  <td className="py-3">
                    ${shift.monto_cop.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeShift(shift.id)}
                      className="text-coral-dark hover:underline"
                    >
                      {t('admin.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {summary.shifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    {t('admin.noShiftsThisMonth')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end gap-8 rounded-2xl border border-cream bg-white p-4 text-sm">
            <p>
              <span className="font-semibold text-lavender-dark">
                {t('admin.totalHours')}:
              </span>{' '}
              {summary.total_horas}
            </p>
            <p>
              <span className="font-semibold text-lavender-dark">
                {t('admin.totalAmount')}:
              </span>{' '}
              ${summary.total_cop.toLocaleString('es-CO')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
