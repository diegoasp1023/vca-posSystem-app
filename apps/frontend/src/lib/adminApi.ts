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
