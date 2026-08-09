import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  createBonus,
  deleteBonus,
  fetchBonuses,
  fetchNomina,
  type Bonus,
  type NominaItem,
} from '../../lib/adminApi'
import { Modal } from './Modal'
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
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const [bonusForm, setBonusForm] = useState(EMPTY_BONUS_FORM)
  const [bonusError, setBonusError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

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
        const [nomina, bonusList] = await Promise.all([
          fetchNomina(token, year, month),
          fetchBonuses(token, year, month),
        ])
        setEmployees(nomina)
        setBonuses(bonusList)
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
      setShowAddModal(false)
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
          <h2 className="font-serif text-xl text-lavender-dark">
            {t('admin.bonuses')}
          </h2>

          {!isOpen && (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              {t('admin.periodLockedNotice')}
            </p>
          )}

          {isOpen && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('admin.addBonus')}
              </button>
            </div>
          )}

          {showAddModal && (
            <Modal
              title={t('admin.addBonusModalTitle')}
              onClose={() => {
                setBonusError(null)
                setShowAddModal(false)
              }}
            >
              <form onSubmit={submitBonus} className="flex flex-wrap items-end gap-4">
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
            </Modal>
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
                          aria-label={t('admin.delete')}
                          title={t('admin.delete')}
                          className="text-coral-dark hover:text-coral"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
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
      )}
    </div>
  )
}
