import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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

export function AdminEmployeesPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EmployeeWrite>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchAdminEmployees(token, page))
      .then((result) => {
        setEmployees(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, getToken])

  useEffect(reload, [reload])

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
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/admin"
          className="text-sm font-semibold text-lavender-dark hover:underline"
        >
          {t('admin.backToPanel')}
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-serif text-3xl text-lavender-dark">
            {t('admin.manageEmployees')}
          </h1>
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
                  <th className="py-2">{t('admin.fields.firstName')}</th>
                  <th className="py-2">{t('admin.fields.documentNumber')}</th>
                  <th className="py-2">{t('admin.fields.position')}</th>
                  <th className="py-2">{t('admin.fields.status')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-cream">
                    <td className="py-3">
                      {employee.nombre} {employee.apellido}
                    </td>
                    <td className="py-3">{employee.numero_documento}</td>
                    <td className="py-3">{employee.cargo}</td>
                    <td className="py-3">
                      {employee.is_active
                        ? t('admin.statusActive')
                        : t('admin.statusInactive')}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(employee)}
                        className="mr-4 text-lavender-dark hover:underline"
                      >
                        {t('admin.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(employee)}
                        className="text-coral-dark hover:underline"
                      >
                        {employee.is_active
                          ? t('admin.deactivate')
                          : t('admin.reactivate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
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
