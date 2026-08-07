export interface LocalizedText {
  es: string
  en: string
}

export interface Page<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface Product {
  id: number
  name: LocalizedText
  description: LocalizedText
  weight_grams: number
  price_cop: number
  image_url: string | null
  presentations: LocalizedText[]
}

export interface CourseSummary {
  id: number
  slug: string
  title: LocalizedText
  tagline: LocalizedText
  image_url: string | null
}

export interface CourseDetail extends CourseSummary {
  objectives: LocalizedText[]
  content: { module: LocalizedText; duration: string }[]
  duration: LocalizedText
  cost: LocalizedText[]
  methods: LocalizedText[]
}

export interface MenuCategory {
  id: number
  name: LocalizedText
  sort_order: number
}

export interface MenuItem {
  id: number
  category_id: number
  category: LocalizedText
  name: LocalizedText
  description: LocalizedText | null
  price_cop: number | null
  image_url: string | null
  is_active: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export const DEFAULT_COURSE_IMAGE_URL = '/images/logo-cafe.svg'

export function getCourseImageUrl(course: Pick<CourseSummary, 'image_url'>): string {
  const url = course.image_url
  if (!url) return DEFAULT_COURSE_IMAGE_URL
  // Uploaded images are served by the backend (see apps/backend/app/api/uploads.py),
  // so a relative /uploads/... path must resolve against the API origin, not the frontend's.
  return url.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url
}

export function getMenuItemImageUrl(item: Pick<MenuItem, 'image_url'>): string {
  const url = item.image_url
  if (!url) return DEFAULT_COURSE_IMAGE_URL
  return url.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`API request to ${path} failed with ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function fetchProducts(page: number): Promise<Page<Product>> {
  return apiGet(`/api/products?page=${page}`)
}

export function fetchCourses(page: number): Promise<Page<CourseSummary>> {
  return apiGet(`/api/courses?page=${page}`)
}

export function fetchCourseBySlug(slug: string): Promise<CourseDetail> {
  return apiGet(`/api/courses/${slug}`)
}
