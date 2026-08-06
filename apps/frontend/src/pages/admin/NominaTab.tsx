import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  createShift,
  deleteShift,
  fetchMonthlyShifts,
  fetchNomina,
  type MonthlyShiftSummary,
  type NominaItem,
} from '../../lib/adminApi'
import { formatDate } from '../../lib/format'
import { MonthYearPicker, PeriodBanner, usePayrollPeriod } from './PayrollShared'
import { ShiftsCalendar } from './ShiftsCalendar'

const EMPTY_SHIFT_FORM = { fecha: '', hora_inicio: '', hora_fin: '' }
const HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, '0')
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours}:${minutes}`
})

export function NominaTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const [employeeId, setEmployeeId] = useState<number | null>(null)

  const [items, setItems] = useState<NominaItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const { period, approve } = usePayrollPeriod(year, month)

  const reloadNomina = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchNomina(token, year, month))
      .then((result) => {
        setItems(result)
        const hourly = result.filter((i) => i.tipo_contrato === 'por_horas')
        setEmployeeId((current) =>
          hourly.some((e) => e.employee_id === current)
            ? current
            : (hourly[0]?.employee_id ?? null),
        )
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [year, month, getToken])

  useEffect(reloadNomina, [reloadNomina])

  const hourlyEmployees = items
    .filter((i) => i.tipo_contrato === 'por_horas')
    .map((i) => ({ id: i.employee_id, nombre: i.nombre, apellido: i.apellido }))

  const isOpen = period?.estado === 'abierto'

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
      {status === 'ready' && (
        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cream text-lavender">
              <th className="py-2">{t('admin.fields.firstName')}</th>
              <th className="py-2">{t('admin.fields.lastName')}</th>
              <th className="py-2">{t('admin.fields.contractType')}</th>
              <th className="py-2">{t('admin.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.employee_id} className="border-b border-cream">
                <td className="py-3">{item.nombre}</td>
                <td className="py-3">{item.apellido}</td>
                <td className="py-3">
                  {t(`admin.contractTypes.${item.tipo_contrato}`)}
                </td>
                <td className="py-3">${item.monto_cop.toLocaleString('es-CO')}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  {t('admin.noEligibleEmployees')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {hourlyEmployees.length > 0 && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-xl text-lavender-dark">
              {t('admin.manageShifts')}
            </h2>
            <div className="flex gap-2 rounded-full border border-cream p-1">
              <ViewButton active={view === 'lista'} onClick={() => setView('lista')}>
                {t('admin.listView')}
              </ViewButton>
              <ViewButton
                active={view === 'calendario'}
                onClick={() => setView('calendario')}
              >
                {t('admin.calendarView')}
              </ViewButton>
            </div>
          </div>

          {view === 'lista' ? (
            <ShiftsListView
              hourlyEmployees={hourlyEmployees}
              employeeId={employeeId}
              setEmployeeId={setEmployeeId}
              year={year}
              month={month}
              isOpen={isOpen}
              onShiftsChanged={reloadNomina}
            />
          ) : (
            <ShiftsCalendar hourlyEmployees={hourlyEmployees} year={year} month={month} />
          )}
        </div>
      )}
    </div>
  )
}

function ViewButton({
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
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-coral text-white' : 'text-lavender-dark hover:bg-cream'
      }`}
    >
      {children}
    </button>
  )
}

function ShiftsListView({
  hourlyEmployees,
  employeeId,
  setEmployeeId,
  year,
  month,
  isOpen,
  onShiftsChanged,
}: {
  hourlyEmployees: { id: number; nombre: string; apellido: string }[]
  employeeId: number | null
  setEmployeeId: (id: number) => void
  year: number
  month: number
  isOpen: boolean
  onShiftsChanged: () => void
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [summary, setSummary] = useState<MonthlyShiftSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [shiftForm, setShiftForm] = useState(EMPTY_SHIFT_FORM)
  const [formError, setFormError] = useState<string | null>(null)

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
      onShiftsChanged()
    } catch {
      setFormError(t('admin.saveError'))
    }
  }

  const removeShift = async (id: number) => {
    if (!window.confirm(t('admin.confirmDeleteShift'))) return
    const token = await getToken()
    await deleteShift(token, id)
    reload()
    onShiftsChanged()
  }

  return (
    <div>
      <label className="mt-6 block max-w-xs text-sm">
        <span className="mb-1 block font-semibold text-lavender-dark">
          {t('admin.employee')}
        </span>
        <select
          value={employeeId ?? ''}
          onChange={(e) => setEmployeeId(Number(e.target.value))}
          className="w-full rounded-lg border border-cream px-3 py-2"
        >
          {hourlyEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.nombre} {employee.apellido}
            </option>
          ))}
        </select>
      </label>

      {!isOpen && (
        <p className="mt-4 text-sm font-semibold text-amber-700">
          {t('admin.periodLockedNotice')}
        </p>
      )}

      {employeeId !== null && isOpen && (
        <form
          onSubmit={submitShift}
          className="mt-6 rounded-2xl border border-cream bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
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
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('admin.fields.startTime')} *
              </span>
              <select
                required
                value={shiftForm.hora_inicio}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, hora_inicio: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="" disabled>
                  --:--
                </option>
                {HALF_HOUR_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('admin.fields.endTime')} *
              </span>
              <select
                required
                value={shiftForm.hora_fin}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, hora_fin: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="" disabled>
                  --:--
                </option>
                {HALF_HOUR_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
            >
              {t('admin.addShift')}
            </button>
            {formError && (
              <p className="text-sm font-semibold text-coral-dark">{formError}</p>
            )}
          </div>
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
                  <td className="py-3">{formatDate(shift.fecha)}</td>
                  <td className="py-3">{shift.hora_inicio.slice(0, 5)}</td>
                  <td className="py-3">{shift.hora_fin.slice(0, 5)}</td>
                  <td className="py-3">{shift.horas}</td>
                  <td className="py-3">
                    ${shift.monto_cop.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 text-right">
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => removeShift(shift.id)}
                        className="text-coral-dark hover:underline"
                      >
                        {t('admin.delete')}
                      </button>
                    )}
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
