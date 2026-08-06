import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  createCourse,
  deleteCourse,
  fetchAdminCourse,
  fetchAdminCourses,
  fetchPaymentMethods,
  updateCourse,
  type CourseWrite,
  type Lookup,
} from '../../lib/adminApi'
import type { CourseSummary } from '../../lib/api'
import { Pagination } from '../../components/Pagination'

const EMPTY_FORM: CourseWrite = {
  slug: '',
  title_es: '',
  title_en: '',
  tagline_es: '',
  tagline_en: '',
  duration_text_es: '',
  duration_text_en: '',
  image_url: '',
  is_active: true,
  objectives: [],
  content: [],
  cost: [],
  payment_method_ids: [],
}

export function AdminCoursesPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Lookup[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<CourseWrite>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchAdminCourses(token, page))
      .then((result) => {
        setCourses(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, getToken])

  useEffect(reload, [reload])
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods)
  }, [])

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId('new')
  }

  const startEdit = async (course: CourseSummary) => {
    const token = await getToken()
    const detail = await fetchAdminCourse(token, course.id)
    setForm({
      slug: detail.slug,
      title_es: detail.title.es,
      title_en: detail.title.en,
      tagline_es: detail.tagline.es,
      tagline_en: detail.tagline.en,
      duration_text_es: detail.duration.es,
      duration_text_en: detail.duration.en,
      image_url: detail.image_url,
      is_active: true,
      objectives: detail.objectives.map((o) => ({ es: o.es, en: o.en })),
      content: detail.content.map((c) => ({
        module_es: c.module.es,
        module_en: c.module.en,
        duration_label: c.duration,
      })),
      cost: detail.cost.map((c) => ({ es: c.es, en: c.en })),
      payment_method_ids: [],
    })
    setEditingId(course.id)
  }

  const submit = async () => {
    const token = await getToken()
    if (editingId === 'new') {
      await createCourse(token, form)
    } else if (editingId !== null) {
      await updateCourse(token, editingId, form)
    }
    setEditingId(null)
    reload()
  }

  const remove = async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    await deleteCourse(token, id)
    reload()
  }

  const togglePaymentMethod = (id: number) => {
    setForm((f) => ({
      ...f,
      payment_method_ids: f.payment_method_ids.includes(id)
        ? f.payment_method_ids.filter((p) => p !== id)
        : [...f.payment_method_ids, id],
    }))
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
            {t('admin.manageCourses')}
          </h1>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('admin.newCourse')}
          </button>
        </div>

        {editingId !== null && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="mt-6 space-y-6 rounded-2xl border border-cream bg-white p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder={t('admin.fields.slug')}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <input
                required
                placeholder={t('admin.fields.imageUrl')}
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <input
                required
                placeholder={t('admin.fields.titleEs')}
                value={form.title_es}
                onChange={(e) => setForm({ ...form, title_es: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <input
                required
                placeholder={t('admin.fields.titleEn')}
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <input
                required
                placeholder={t('admin.fields.taglineEs')}
                value={form.tagline_es}
                onChange={(e) => setForm({ ...form, tagline_es: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <input
                required
                placeholder={t('admin.fields.taglineEn')}
                value={form.tagline_en}
                onChange={(e) => setForm({ ...form, tagline_en: e.target.value })}
                className="rounded-lg border border-cream px-3 py-2"
              />
              <textarea
                required
                placeholder={t('admin.fields.durationEs')}
                value={form.duration_text_es}
                onChange={(e) =>
                  setForm({ ...form, duration_text_es: e.target.value })
                }
                className="rounded-lg border border-cream px-3 py-2 sm:col-span-2"
              />
              <textarea
                required
                placeholder={t('admin.fields.durationEn')}
                value={form.duration_text_en}
                onChange={(e) =>
                  setForm({ ...form, duration_text_en: e.target.value })
                }
                className="rounded-lg border border-cream px-3 py-2 sm:col-span-2"
              />
            </div>

            <ListEditor
              label={t('coursePage.objectives')}
              rows={form.objectives}
              onChange={(objectives) => setForm({ ...form, objectives })}
              renderRow={(row, onChange) => (
                <>
                  <input
                    placeholder="ES"
                    value={row.es}
                    onChange={(e) => onChange({ ...row, es: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                  <input
                    placeholder="EN"
                    value={row.en}
                    onChange={(e) => onChange({ ...row, en: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                </>
              )}
              emptyRow={{ es: '', en: '' }}
            />

            <ListEditor
              label={t('coursePage.content')}
              rows={form.content}
              onChange={(content) => setForm({ ...form, content })}
              renderRow={(row, onChange) => (
                <>
                  <input
                    placeholder="Módulo (ES)"
                    value={row.module_es}
                    onChange={(e) => onChange({ ...row, module_es: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                  <input
                    placeholder="Module (EN)"
                    value={row.module_en}
                    onChange={(e) => onChange({ ...row, module_en: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                  <input
                    placeholder="2h"
                    value={row.duration_label}
                    onChange={(e) =>
                      onChange({ ...row, duration_label: e.target.value })
                    }
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                </>
              )}
              emptyRow={{ module_es: '', module_en: '', duration_label: '' }}
            />

            <ListEditor
              label={t('coursePage.cost')}
              rows={form.cost}
              onChange={(cost) => setForm({ ...form, cost })}
              renderRow={(row, onChange) => (
                <>
                  <input
                    placeholder="ES"
                    value={row.es}
                    onChange={(e) => onChange({ ...row, es: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                  <input
                    placeholder="EN"
                    value={row.en}
                    onChange={(e) => onChange({ ...row, en: e.target.value })}
                    className="rounded-lg border border-cream px-3 py-2"
                  />
                </>
              )}
              emptyRow={{ es: '', en: '' }}
            />

            <div>
              <p className="text-sm font-semibold text-lavender-dark">
                {t('coursePage.methods')}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.payment_method_ids.includes(method.id)}
                      onChange={() => togglePaymentMethod(method.id)}
                    />
                    {method.name.es}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('admin.save')}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
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
                  <th className="py-2">{t('admin.fields.titleEs')}</th>
                  <th className="py-2">{t('admin.fields.slug')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-cream">
                    <td className="py-3">{course.title.es}</td>
                    <td className="py-3">{course.slug}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(course)}
                        className="mr-4 text-lavender-dark hover:underline"
                      >
                        {t('admin.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(course.id)}
                        className="text-coral-dark hover:underline"
                      >
                        {t('admin.delete')}
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

function ListEditor<T>({
  label,
  rows,
  onChange,
  renderRow,
  emptyRow,
}: {
  label: string
  rows: T[]
  onChange: (rows: T[]) => void
  renderRow: (row: T, onChange: (row: T) => void) => ReactNode
  emptyRow: T
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-lavender-dark">{label}</p>
      <div className="mt-2 space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {renderRow(row, (updated) => {
                const next = [...rows]
                next[index] = updated
                onChange(next)
              })}
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="text-coral-dark"
              aria-label="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow])}
        className="mt-2 text-sm text-lavender-dark hover:underline"
      >
        + Agregar
      </button>
    </div>
  )
}
