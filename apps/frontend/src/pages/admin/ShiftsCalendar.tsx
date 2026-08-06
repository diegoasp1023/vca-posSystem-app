import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchMonthlyShifts, type Employee, type Shift } from '../../lib/adminApi'
import { employeeColor, employeeLegendColor, employeeTextColor } from '../../lib/format'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function ShiftsCalendar({
  hourlyEmployees,
  year,
  month,
}: {
  hourlyEmployees: Employee[]
  year: number
  month: number
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [shiftsByDay, setShiftsByDay] = useState<Map<string, (Shift & { employee: Employee })[]>>(
    new Map(),
  )
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    setStatus('loading')
    getToken()
      .then(async (token) => {
        const summaries = await Promise.all(
          hourlyEmployees.map((employee) =>
            fetchMonthlyShifts(token, employee.id, year, month).then((summary) =>
              summary.shifts.map((shift) => ({ ...shift, employee })),
            ),
          ),
        )
        const byDay = new Map<string, (Shift & { employee: Employee })[]>()
        for (const shift of summaries.flat()) {
          const existing = byDay.get(shift.fecha) ?? []
          existing.push(shift)
          byDay.set(shift.fecha, existing)
        }
        setShiftsByDay(byDay)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [hourlyEmployees, year, month, getToken])

  if (status === 'loading') {
    return <p className="mt-10 text-gray-500">{t('common.loading')}</p>
  }
  if (status === 'error') {
    return <p className="mt-10 text-gray-500">{t('common.error')}</p>
  }

  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7 // Monday-first grid

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="mt-6">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-lavender">
        {WEEKDAYS.map((day) => (
          <div key={day}>{t(`admin.weekdaysShort.${day}`)}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayShifts = shiftsByDay.get(key) ?? []
          return (
            <div
              key={key}
              className="min-h-[5.5rem] rounded-lg border border-cream p-1.5 text-left"
            >
              <p className="text-xs font-semibold text-gray-500">{day}</p>
              <div className="mt-1 space-y-1">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    title={`${shift.employee.nombre} ${shift.employee.apellido}: ${shift.hora_inicio.slice(0, 5)}-${shift.hora_fin.slice(0, 5)}`}
                    className="truncate rounded px-1 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: employeeColor(shift.employee.id),
                      color: employeeTextColor(shift.employee.id),
                    }}
                  >
                    {shift.hora_inicio.slice(0, 5)}-{shift.hora_fin.slice(0, 5)}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-lavender uppercase">
          {t('admin.legend')}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {hourlyEmployees.map((employee) => (
            <div key={employee.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: employeeLegendColor(employee.id) }}
              />
              {employee.nombre} {employee.apellido}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
