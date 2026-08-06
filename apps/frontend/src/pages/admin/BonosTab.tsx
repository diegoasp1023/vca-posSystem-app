import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  createBonus,
  deleteBonus,
  fetchBonuses,
  fetchNomina,
  fetchTips,
  updateTips,
  type Bonus,
  type NominaItem,
  type TipPool,
} from '../../lib/adminApi'
import {
  MonthYearPicker,
  PeriodBanner,
  TableFooterPagination,
  usePagedList,
  usePayrollPeriod,
} from './PayrollShared'

const EMPTY_BONUS_FORM = { employeeId: '', montoCop: '', concepto: '' }

export function BonosTab({
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
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [tips, setTips] = useState<TipPool | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const [bonusForm, setBonusForm] = useState(EMPTY_BONUS_FORM)
  const [bonusError, setBonusError] = useState<string | null>(null)

  const [tipAmount, setTipAmount] = useState('')
  const [tipParticipants, setTipParticipants] = useState<Set<number>>(new Set())
  const [tipError, setTipError] = useState<string | null>(null)

  const { period, close } = usePayrollPeriod(year, month)
  const isOpen = period?.estado === 'abierto'

  const {
    page: bonusesPage,
    setPage: setBonusesPage,
    pageSize: bonusesPageSize,
    setPageSize: setBonusesPageSize,
    totalPages: bonusesTotalPages,
    pageItems: pagedBonuses,
  } = usePagedList(bonuses)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then(async (token) => {
        const [nomina, bonusList, tipPool] = await Promise.all([
          fetchNomina(token, year, month),
          fetchBonuses(token, year, month),
          fetchTips(token, year, month),
        ])
        setEmployees(nomina)
        setBonuses(bonusList)
        setTips(tipPool)
        setTipAmount(String(tipPool.monto_total_cop))
        setTipParticipants(new Set(tipPool.participant_ids))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [year, month, getToken])

  useEffect(reload, [reload])

  const submitBonus = async (e: FormEvent) => {
    e.preventDefault()
    setBonusError(null)
    try {
      const token = await getToken()
      await createBonus(token, {
        employee_id: Number(bonusForm.employeeId),
        year,
        month,
        monto_cop: Number(bonusForm.montoCop),
        concepto: bonusForm.concepto,
      })
      setBonusForm(EMPTY_BONUS_FORM)
      reload()
    } catch {
      setBonusError(t('admin.saveError'))
    }
  }

  const removeBonus = async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    await deleteBonus(token, id)
    reload()
  }

  const handleParticipantsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => Number(option.value))
    setTipParticipants(new Set(selected))
  }

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
        <>
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

              <label className="mt-4 block max-w-xs text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.tipParticipants')}
                </span>
                <select
                  multiple
                  disabled={!isOpen}
                  value={[...tipParticipants].map(String)}
                  onChange={handleParticipantsChange}
                  className="h-40 w-full rounded-lg border border-cream px-3 py-2 disabled:bg-cream"
                >
                  {employees.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.nombre} {employee.apellido}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-sm text-gray-600">
                {t('admin.selectedCount', { count: tipParticipants.size })}
              </p>

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

          <section className="mt-10">
            <h2 className="font-serif text-xl text-lavender-dark">
              {t('admin.bonuses')}
            </h2>

            {!isOpen && (
              <p className="mt-2 text-sm font-semibold text-amber-700">
                {t('admin.periodLockedNotice')}
              </p>
            )}

            {isOpen && (
              <form
                onSubmit={submitBonus}
                className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-cream bg-white p-6"
              >
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-lavender-dark">
                    {t('admin.employee')} *
                  </span>
                  <select
                    required
                    value={bonusForm.employeeId}
                    onChange={(e) =>
                      setBonusForm({ ...bonusForm, employeeId: e.target.value })
                    }
                    className="rounded-lg border border-cream px-3 py-2"
                  >
                    <option value="" disabled>
                      --
                    </option>
                    {employees.map((employee) => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.nombre} {employee.apellido}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-lavender-dark">
                    {t('admin.bonusAmount')} *
                  </span>
                  <input
                    required
                    type="number"
                    min={1}
                    value={bonusForm.montoCop}
                    onChange={(e) =>
                      setBonusForm({ ...bonusForm, montoCop: e.target.value })
                    }
                    className="w-40 rounded-lg border border-cream px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-lavender-dark">
                    {t('admin.concept')} *
                  </span>
                  <input
                    required
                    value={bonusForm.concepto}
                    onChange={(e) =>
                      setBonusForm({ ...bonusForm, concepto: e.target.value })
                    }
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
                >
                  {t('admin.addBonus')}
                </button>
                {bonusError && (
                  <p className="w-full text-sm font-semibold text-coral-dark">
                    {bonusError}
                  </p>
                )}
              </form>
            )}

            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream text-lavender">
                  <th className="py-2">{t('admin.employee')}</th>
                  <th className="py-2">{t('admin.concept')}</th>
                  <th className="py-2">{t('admin.amount')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {pagedBonuses.map((bonus) => {
                  const employee = employees.find(
                    (e) => e.employee_id === bonus.employee_id,
                  )
                  return (
                    <tr key={bonus.id} className="border-b border-cream">
                      <td className="py-3">
                        {employee ? `${employee.nombre} ${employee.apellido}` : '—'}
                      </td>
                      <td className="py-3">{bonus.concepto}</td>
                      <td className="py-3">
                        ${bonus.monto_cop.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 text-right">
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => removeBonus(bonus.id)}
                            className="text-coral-dark hover:underline"
                          >
                            {t('admin.delete')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {bonuses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      {t('admin.noBonuses')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {bonuses.length > 0 && (
              <TableFooterPagination
                page={bonusesPage}
                totalPages={bonusesTotalPages}
                pageSize={bonusesPageSize}
                onPageChange={setBonusesPage}
                onPageSizeChange={setBonusesPageSize}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
