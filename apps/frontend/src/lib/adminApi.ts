import type { CourseDetail, CourseSummary, Page, Product } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

async function adminFetch<T>(
  path: string,
  token: string | undefined,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Admin API request to ${path} failed with ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface Lookup {
  id: number
  name: { es: string; en: string }
}

export function fetchPresentations(): Promise<Lookup[]> {
  return adminFetch('/api/presentations', undefined)
}

export function fetchPaymentMethods(): Promise<Lookup[]> {
  return adminFetch('/api/payment-methods', undefined)
}

export interface ProductWrite {
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  weight_grams: number
  price_cop: number
  image_url: string | null
  is_active: boolean
  presentation_ids: number[]
}

export function fetchAdminProducts(token: string | undefined, page: number) {
  return adminFetch<Page<Product>>(`/api/products/admin?page=${page}`, token)
}

export function createProduct(token: string | undefined, body: ProductWrite) {
  return adminFetch<Product>('/api/products', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateProduct(
  token: string | undefined,
  id: number,
  body: ProductWrite,
) {
  return adminFetch<Product>(`/api/products/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteProduct(token: string | undefined, id: number) {
  return adminFetch<void>(`/api/products/${id}`, token, { method: 'DELETE' })
}

export interface CourseWrite {
  slug: string
  title_es: string
  title_en: string
  tagline_es: string
  tagline_en: string
  duration_text_es: string
  duration_text_en: string
  image_url: string
  is_active: boolean
  objectives: { es: string; en: string }[]
  content: { module_es: string; module_en: string; duration_label: string }[]
  cost: { es: string; en: string }[]
  payment_method_ids: number[]
}

export function fetchAdminCourses(token: string | undefined, page: number) {
  return adminFetch<Page<CourseSummary>>(`/api/courses/admin?page=${page}`, token)
}

export function fetchAdminCourse(token: string | undefined, id: number) {
  return adminFetch<CourseDetail>(`/api/courses/admin/${id}`, token)
}

export function createCourse(token: string | undefined, body: CourseWrite) {
  return adminFetch<CourseDetail>('/api/courses', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCourse(
  token: string | undefined,
  id: number,
  body: CourseWrite,
) {
  return adminFetch<CourseDetail>(`/api/courses/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteCourse(token: string | undefined, id: number) {
  return adminFetch<void>(`/api/courses/${id}`, token, { method: 'DELETE' })
}

export type TipoDocumento = 'CC' | 'TI' | 'RC' | 'CE' | 'PA'
export type TipoContrato = 'indefinido' | 'por_horas'
export type TipoCuenta = 'ahorros' | 'corriente'

export interface EmployeeWrite {
  nombre: string
  apellido: string
  tipo_documento: TipoDocumento
  numero_documento: string
  fecha_nacimiento: string
  correo_electronico: string
  direccion: string
  cargo: string
  eps: string
  tipo_contrato: TipoContrato
  salario_mensual: number | null
  salario_por_hora: number | null
  arl: string | null
  fondo_pension: string | null
  banco: string
  tipo_cuenta: TipoCuenta
  numero_cuenta: string
  fecha_ingreso: string
}

export interface Employee extends EmployeeWrite {
  id: number
  fecha_registro: string
  is_active: boolean
  fecha_baja: string | null
}

export interface EmployeeListParams {
  page: number
  pageSize?: 10 | 20 | 50
  search?: string
  sortBy?: 'nombre' | 'apellido' | 'is_active'
  sortDir?: 'asc' | 'desc'
}

export function fetchAdminEmployees(
  token: string | undefined,
  params: EmployeeListParams,
) {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize ?? 10),
    sort_by: params.sortBy ?? 'nombre',
    sort_dir: params.sortDir ?? 'asc',
  })
  if (params.search) query.set('search', params.search)
  return adminFetch<Page<Employee>>(`/api/employees/admin?${query}`, token)
}

export function createEmployee(token: string | undefined, body: EmployeeWrite) {
  return adminFetch<Employee>('/api/employees', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateEmployee(
  token: string | undefined,
  id: number,
  body: EmployeeWrite,
) {
  return adminFetch<Employee>(`/api/employees/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deactivateEmployee(token: string | undefined, id: number) {
  return adminFetch<Employee>(`/api/employees/${id}/deactivate`, token, {
    method: 'POST',
  })
}

export function reactivateEmployee(token: string | undefined, id: number) {
  return adminFetch<Employee>(`/api/employees/${id}/reactivate`, token, {
    method: 'POST',
  })
}

export interface ShiftWrite {
  employee_id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
}

export interface Shift extends ShiftWrite {
  id: number
  tarifa_hora_cop: number
  horas: number
  monto_cop: number
}

export interface MonthlyShiftSummary {
  employee_id: number
  year: number
  month: number
  shifts: Shift[]
  total_horas: number
  total_cop: number
}

export function fetchMonthlyShifts(
  token: string | undefined,
  employeeId: number,
  year: number,
  month: number,
) {
  return adminFetch<MonthlyShiftSummary>(
    `/api/shifts?employee_id=${employeeId}&year=${year}&month=${month}`,
    token,
  )
}

export function createShift(token: string | undefined, body: ShiftWrite) {
  return adminFetch<Shift>('/api/shifts', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteShift(token: string | undefined, id: number) {
  return adminFetch<void>(`/api/shifts/${id}`, token, { method: 'DELETE' })
}

export type PeriodState = 'abierto' | 'cerrado'

export interface PayrollPeriod {
  year: number
  month: number
  estado: PeriodState
  cerrado_en: string | null
}

export interface NominaItem {
  employee_id: number
  nombre: string
  apellido: string
  tipo_contrato: TipoContrato
  monto_cop: number
}

export interface BonusWrite {
  employee_id: number
  year: number
  month: number
  monto_cop: number
  concepto: string
}

export interface Bonus extends BonusWrite {
  id: number
  created_at: string
}

export interface TipPool {
  year: number
  month: number
  monto_total_cop: number
  participant_ids: number[]
  monto_por_persona: number
}

export interface PayrollSummaryItem {
  employee_id: number
  nombre: string
  apellido: string
  pago_base_cop: number
  bonos_cop: number
  propina_cop: number
  total_cop: number
}

export interface PayrollSummary {
  year: number
  month: number
  items: PayrollSummaryItem[]
  total_general_cop: number
}

export function fetchPayrollPeriod(
  token: string | undefined,
  year: number,
  month: number,
) {
  return adminFetch<PayrollPeriod>(
    `/api/payroll/period?year=${year}&month=${month}`,
    token,
  )
}

export function closePayrollPeriod(
  token: string | undefined,
  year: number,
  month: number,
) {
  return adminFetch<PayrollPeriod>(
    `/api/payroll/period/close?year=${year}&month=${month}`,
    token,
    { method: 'POST' },
  )
}

export function fetchNomina(token: string | undefined, year: number, month: number) {
  return adminFetch<NominaItem[]>(
    `/api/payroll/nomina?year=${year}&month=${month}`,
    token,
  )
}

export function fetchBonuses(token: string | undefined, year: number, month: number) {
  return adminFetch<Bonus[]>(`/api/payroll/bonuses?year=${year}&month=${month}`, token)
}

export function createBonus(token: string | undefined, body: BonusWrite) {
  return adminFetch<Bonus>('/api/payroll/bonuses', token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteBonus(token: string | undefined, id: number) {
  return adminFetch<void>(`/api/payroll/bonuses/${id}`, token, { method: 'DELETE' })
}

export function fetchTips(token: string | undefined, year: number, month: number) {
  return adminFetch<TipPool>(`/api/payroll/tips?year=${year}&month=${month}`, token)
}

export function updateTips(
  token: string | undefined,
  year: number,
  month: number,
  montoTotalCop: number,
  employeeIds: number[],
) {
  return adminFetch<TipPool>(`/api/payroll/tips?year=${year}&month=${month}`, token, {
    method: 'PUT',
    body: JSON.stringify({ monto_total_cop: montoTotalCop, employee_ids: employeeIds }),
  })
}

export function fetchPayrollSummary(
  token: string | undefined,
  year: number,
  month: number,
) {
  return adminFetch<PayrollSummary>(
    `/api/payroll/summary?year=${year}&month=${month}`,
    token,
  )
}
