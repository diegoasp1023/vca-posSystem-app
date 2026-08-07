import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faPen,
  faSort,
  faSortDown,
  faSortUp,
  faUserCheck,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  createEmployee,
  deactivateEmployee,
  fetchAdminEmployees,
  reactivateEmployee,
  updateEmployee,
  type Employee,
  type EmployeeWrite,
  type TipoContrato,
  type TipoCuenta,
  type TipoDocumento,
} from '../../lib/adminApi'
import { formatDate } from '../../lib/format'
import { Pagination } from '../../components/Pagination'

const DOCUMENT_TYPES: TipoDocumento[] = ['CC', 'TI', 'RC', 'CE', 'PA']
const ACCOUNT_TYPES: TipoCuenta[] = ['ahorros', 'corriente']

const EMPTY_FORM: EmployeeWrite = {
  nombre: '',
  apellido: '',
  tipo_documento: 'CC',
  numero_documento: '',
  fecha_nacimiento: '',
  correo_electronico: '',
  direccion: '',
  cargo: '',
  eps: '',
  tipo_contrato: 'indefinido',
  salario_mensual: null,
  salario_por_hora: null,
  arl: '',
  fondo_pension: '',
  banco: '',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  fecha_ingreso: '',
}

export function EmployeesTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'nombre' | 'apellido' | 'is_active'>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [totalPages, setTotalPages] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EmployeeWrite>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [formError, setFormError] = useState<string | null>(null)
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) =>
        fetchAdminEmployees(token, { page, pageSize, search, sortBy, sortDir }),
      )
      .then((result) => {
        setEmployees(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, pageSize, search, sortBy, sortDir, getToken])

  useEffect(reload, [reload])

  const toggleSort = (column: 'nombre' | 'apellido' | 'is_active') => {
    if (sortBy === column) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(1)
  }

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (employee: Employee) => {
    setForm({
      nombre: employee.nombre,
      apellido: employee.apellido,
      tipo_documento: employee.tipo_documento,
      numero_documento: employee.numero_documento,
      fecha_nacimiento: employee.fecha_nacimiento,
      correo_electronico: employee.correo_electronico,
      direccion: employee.direccion,
      cargo: employee.cargo,
      eps: employee.eps,
      tipo_contrato: employee.tipo_contrato,
      salario_mensual: employee.salario_mensual,
      salario_por_hora: employee.salario_por_hora,
      arl: employee.arl,
      fondo_pension: employee.fondo_pension,
      banco: employee.banco,
      tipo_cuenta: employee.tipo_cuenta,
      numero_cuenta: employee.numero_cuenta,
      fecha_ingreso: employee.fecha_ingreso,
    })
    setFormError(null)
    setEditingId(employee.id)
  }

  const submit = async () => {
    setFormError(null)
    const body: EmployeeWrite =
      form.tipo_contrato === 'indefinido'
        ? { ...form, salario_por_hora: null }
        : { ...form, salario_mensual: null, arl: null, fondo_pension: null }

    try {
      const token = await getToken()
      if (editingId === 'new') {
        await createEmployee(token, body)
      } else if (editingId !== null) {
        await updateEmployee(token, editingId, body)
      }
      setEditingId(null)
      reload()
    } catch {
      setFormError(t('admin.saveError'))
    }
  }

  const toggleActive = async (employee: Employee) => {
    if (employee.is_active && !window.confirm(t('admin.confirmDeactivate'))) return
    const token = await getToken()
    if (employee.is_active) {
      await deactivateEmployee(token, employee.id)
    } else {
      await reactivateEmployee(token, employee.id)
    }
    reload()
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          className="w-full max-w-xs rounded-lg border border-cream px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('admin.newEmployee')}
        </button>
      </div>

      {editingId !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mt-6 space-y-4 rounded-2xl border border-cream bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.fields.firstName')}>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.lastName')}>
              <input
                required
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.documentType')}>
              <select
                required
                value={form.tipo_documento}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo_documento: e.target.value as TipoDocumento,
                  })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                {DOCUMENT_TYPES.map((docType) => (
                  <option key={docType} value={docType}>
                    {t(`admin.documentTypes.${docType}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.fields.documentNumber')}>
              <input
                required
                value={form.numero_documento}
                onChange={(e) =>
                  setForm({ ...form, numero_documento: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.birthDate')}>
              <input
                required
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) =>
                  setForm({ ...form, fecha_nacimiento: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.email')}>
              <input
                required
                type="email"
                value={form.correo_electronico}
                onChange={(e) =>
                  setForm({ ...form, correo_electronico: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.address')} className="sm:col-span-2">
              <input
                required
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.position')}>
              <input
                required
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.eps')}>
              <input
                required
                value={form.eps}
                onChange={(e) => setForm({ ...form, eps: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.hireDate')}>
              <input
                required
                type="date"
                value={form.fecha_ingreso}
                onChange={(e) =>
                  setForm({ ...form, fecha_ingreso: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.contractType')}>
              <select
                required
                value={form.tipo_contrato}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo_contrato: e.target.value as TipoContrato,
                  })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="indefinido">
                  {t('admin.contractTypes.indefinido')}
                </option>
                <option value="por_horas">
                  {t('admin.contractTypes.por_horas')}
                </option>
              </select>
            </Field>

            {form.tipo_contrato === 'indefinido' ? (
              <>
                <Field label={t('admin.fields.monthlySalary')}>
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.salario_mensual ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        salario_mensual: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-cream px-3 py-2"
                  />
                </Field>
                <Field label={t('admin.fields.arl')}>
                  <input
                    required
                    value={form.arl ?? ''}
                    onChange={(e) => setForm({ ...form, arl: e.target.value })}
                    className="w-full rounded-lg border border-cream px-3 py-2"
                  />
                </Field>
                <Field label={t('admin.fields.pensionFund')}>
                  <input
                    required
                    value={form.fondo_pension ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, fondo_pension: e.target.value })
                    }
                    className="w-full rounded-lg border border-cream px-3 py-2"
                  />
                </Field>
              </>
            ) : (
              <Field label={t('admin.fields.hourlySalary')}>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.salario_por_hora ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      salario_por_hora: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </Field>
            )}

            <Field label={t('admin.fields.bank')}>
              <input
                required
                value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
            <Field label={t('admin.fields.accountType')}>
              <select
                required
                value={form.tipo_cuenta}
                onChange={(e) =>
                  setForm({ ...form, tipo_cuenta: e.target.value as TipoCuenta })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                {ACCOUNT_TYPES.map((accountType) => (
                  <option key={accountType} value={accountType}>
                    {t(`admin.accountTypes.${accountType}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.fields.accountNumber')}>
              <input
                required
                value={form.numero_cuenta}
                onChange={(e) =>
                  setForm({ ...form, numero_cuenta: e.target.value })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </Field>
          </div>

          {formError && (
            <p className="text-sm font-semibold text-coral-dark">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
            >
              {t('admin.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setEditingId(null)
              }}
              className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
            >
              {t('admin.cancel')}
            </button>
          </div>
        </form>
      )}

      {status === 'loading' && (
        <p className="mt-10 text-gray-500">{t('common.loading')}</p>
      )}
      {status === 'error' && (
        <p className="mt-10 text-gray-500">{t('common.error')}</p>
      )}
      {status === 'ready' && (
        <>
          <table className="mt-8 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream text-lavender">
                <SortableHeader
                  label={t('admin.fields.firstName')}
                  column="nombre"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onClick={toggleSort}
                />
                <SortableHeader
                  label={t('admin.fields.lastName')}
                  column="apellido"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onClick={toggleSort}
                />
                <SortableHeader
                  label={t('admin.fields.status')}
                  column="is_active"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onClick={toggleSort}
                />
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-cream">
                  <td className="py-3">{employee.nombre}</td>
                  <td className="py-3">{employee.apellido}</td>
                  <td className="py-3">
                    {employee.is_active
                      ? t('admin.statusActive')
                      : t('admin.statusInactive')}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setDetailsEmployee(employee)}
                      aria-label={t('admin.viewDetails')}
                      title={t('admin.viewDetails')}
                      className="mr-3 text-lavender-dark hover:text-lavender"
                    >
                      <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(employee)}
                      aria-label={t('admin.edit')}
                      title={t('admin.edit')}
                      className="mr-3 text-lavender-dark hover:text-lavender"
                    >
                      <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(employee)}
                      aria-label={
                        employee.is_active
                          ? t('admin.deactivate')
                          : t('admin.reactivate')
                      }
                      title={
                        employee.is_active
                          ? t('admin.deactivate')
                          : t('admin.reactivate')
                      }
                      className="text-coral-dark hover:text-coral"
                    >
                      <FontAwesomeIcon
                        icon={employee.is_active ? faUserSlash : faUserCheck}
                        className="h-4 w-4"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              {t('admin.pageSize')}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as 10 | 20 | 50)
                  setPage(1)
                }}
                className="rounded-lg border border-cream px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {detailsEmployee && (
        <EmployeeDetailsModal
          employee={detailsEmployee}
          onClose={() => setDetailsEmployee(null)}
        />
      )}
    </div>
  )
}

function EmployeeDetailsModal({
  employee,
  onClose,
}: {
  employee: Employee
  onClose: () => void
}) {
  const { t } = useTranslation()

  const personalRows: [string, string][] = [
    [
      t('admin.fields.documentType'),
      t(`admin.documentTypes.${employee.tipo_documento}`),
    ],
    [t('admin.fields.documentNumber'), employee.numero_documento],
    [t('admin.fields.birthDate'), formatDate(employee.fecha_nacimiento)],
    [t('admin.fields.email'), employee.correo_electronico],
    [t('admin.fields.address'), employee.direccion],
    [t('admin.fields.position'), employee.cargo],
    [t('admin.fields.eps'), employee.eps],
  ]

  const contractRows: [string, string][] = [
    [
      t('admin.fields.contractType'),
      t(`admin.contractTypes.${employee.tipo_contrato}`),
    ],
    ...(employee.tipo_contrato === 'indefinido'
      ? ([
          [
            t('admin.fields.monthlySalary'),
            `$${employee.salario_mensual?.toLocaleString('es-CO')}`,
          ],
          [t('admin.fields.arl'), employee.arl ?? ''],
          [t('admin.fields.pensionFund'), employee.fondo_pension ?? ''],
        ] as [string, string][])
      : ([
          [
            t('admin.fields.hourlySalary'),
            `$${employee.salario_por_hora?.toLocaleString('es-CO')}`,
          ],
        ] as [string, string][])),
    [t('admin.fields.hireDate'), formatDate(employee.fecha_ingreso)],
    ...(employee.fecha_baja
      ? ([[t('admin.fechaBaja'), formatDate(employee.fecha_baja)]] as [
          string,
          string,
        ][])
      : []),
  ]

  const bankingRows: [string, string][] = [
    [t('admin.fields.bank'), employee.banco],
    [
      t('admin.fields.accountType'),
      t(`admin.accountTypes.${employee.tipo_cuenta}`),
    ],
    [t('admin.fields.accountNumber'), employee.numero_cuenta],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-cream px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-lavender-dark">
              {employee.nombre} {employee.apellido}
            </h2>
            <span
              className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                employee.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {employee.is_active
                ? t('admin.statusActive')
                : t('admin.statusInactive')}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <DetailSection title={t('admin.detailsPersonal')} rows={personalRows} />
          <DetailSection title={t('admin.detailsContract')} rows={contractRows} />
          <DetailSection title={t('admin.detailsBanking')} rows={bankingRows} />
        </div>

        <div className="border-t border-cream px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('admin.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onClick,
}: {
  label: string
  column: 'nombre' | 'apellido' | 'is_active'
  sortBy: 'nombre' | 'apellido' | 'is_active'
  sortDir: 'asc' | 'desc'
  onClick: (column: 'nombre' | 'apellido' | 'is_active') => void
}) {
  const active = sortBy === column
  const icon = active ? (sortDir === 'asc' ? faSortUp : faSortDown) : faSort

  return (
    <th className="py-2">
      <button
        type="button"
        onClick={() => onClick(column)}
        className={`flex items-center gap-1.5 font-semibold ${active ? 'text-lavender-dark' : 'text-lavender'}`}
      >
        {label}
        <FontAwesomeIcon icon={icon} className="h-3 w-3" />
      </button>
    </th>
  )
}

function DetailSection({
  title,
  rows,
}: {
  title: string
  rows: [string, string][]
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold tracking-wide text-lavender uppercase">
        {title}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-gray-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="mb-1 block font-semibold text-lavender-dark">
        {label} *
      </span>
      {children}
    </label>
  )
}
