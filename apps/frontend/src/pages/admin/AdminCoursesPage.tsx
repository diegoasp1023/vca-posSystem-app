import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  createCourse,
  deleteCourse,
  fetchAdminCourse,
  fetchAdminCourses,
  fetchPaymentMethods,
  updateCourse,
  uploadCourseImage,
  type CourseWrite,
  type Lookup,
} from '../../lib/adminApi'
import { getCourseImageUrl, type CourseSummary } from '../../lib/api'
import { Pagination } from '../../components/Pagination'
import { BackToPanelLink } from './BackToPanelLink'
import { Modal } from './Modal'
import { MultiSelectDropdown } from './PayrollShared'

const FORCED_PAYMENT_METHOD_NAME_ES = 'Pago 100% por adelantado al inscribirte'
const FIXED_COST_NOTE_ES = 'Incluyen materiales y certificado de asistencia'
const FIXED_COST_NOTE_EN = 'Both include materials and a completion certificate'

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseHours(durationLabel: string): number | '' {
  const match = durationLabel.match(/^(\d+(\.\d+)?)/)
  if (!match) return ''
  const value = Number(match[1])
  return durationLabel.toLowerCase().includes('min') ? value / 60 : value
}

const DEFAULT_RESCHEDULE_FEE = 50000

function parseRescheduleFee(durationText: string): number | '' {
  const match = durationText.match(/\$([\d.,]+)\s*COP/)
  if (!match) return ''
  const digits = match[1].replace(/[^\d]/g, '')
  return digits === '' ? '' : Number(digits)
}

function splitCost(text: string): { description: string; amount: number | '' } {
  const separatorIndex = text.indexOf(': ')
  const description = separatorIndex === -1 ? text : text.slice(0, separatorIndex)
  const amountPart = separatorIndex === -1 ? '' : text.slice(separatorIndex + 2)
  const digits = amountPart.replace(/[^\d]/g, '')
  return { description, amount: digits === '' ? '' : Number(digits) }
}

function formatMoney(amount: number | '', locale: string): string {
  const value = Number(amount) || 0
  return `$${value.toLocaleString(locale)} COP`
}

function formatCostAmount(amount: number | '', locale: string, suffix: string): string {
  return suffix ? `${formatMoney(amount, locale)} ${suffix}` : formatMoney(amount, locale)
}

type ObjectiveRow = { es: string; en: string }
type ContentRow = { module_es: string; module_en: string; hours: number | '' }
type CostRow =
  | {
      kind: 'individual'
      description_es: string
      description_en: string
      amount: number | ''
    }
  | {
      kind: 'grupal'
      description_es: string
      description_en: string
      groupSize: number | ''
      pricePerPerson: number | ''
    }

const EMPTY_COST_ROW: CostRow = {
  kind: 'grupal',
  description_es: '',
  description_en: '',
  groupSize: '',
  pricePerPerson: '',
}

function formatCostRow(row: CostRow, lang: 'es' | 'en'): string {
  const description = lang === 'es' ? row.description_es : row.description_en
  const locale = lang === 'es' ? 'es-CO' : 'en-US'

  if (row.kind === 'individual') {
    return `${description}: ${formatMoney(row.amount, locale)}`
  }

  const groupLabel =
    lang === 'es'
      ? `${description} (grupo de ${row.groupSize || 0} personas)`
      : `${description} (group of ${row.groupSize || 0} people)`
  const suffix = lang === 'es' ? 'por persona' : 'per person'
  return `${groupLabel}: ${formatCostAmount(row.pricePerPerson, locale, suffix)}`
}

function parseCostRow(esText: string, enText: string): CostRow {
  const es = splitCost(esText)
  const en = splitCost(enText)
  const groupMatchEs = es.description.match(/^(.*)\s\(grupo de (\d+) personas?\)$/)
  const groupMatchEn = en.description.match(/^(.*)\s\(group of (\d+) people?\)$/i)

  if (groupMatchEs || groupMatchEn) {
    return {
      kind: 'grupal',
      description_es: groupMatchEs ? groupMatchEs[1] : es.description,
      description_en: groupMatchEn ? groupMatchEn[1] : en.description,
      groupSize: groupMatchEs
        ? Number(groupMatchEs[2])
        : groupMatchEn
          ? Number(groupMatchEn[2])
          : '',
      pricePerPerson: es.amount !== '' ? es.amount : en.amount,
    }
  }

  return {
    kind: 'individual',
    description_es: es.description,
    description_en: en.description,
    amount: es.amount !== '' ? es.amount : en.amount,
  }
}

interface CourseFormState {
  title_es: string
  title_en: string
  tagline_es: string
  tagline_en: string
  image_url: string | null
  objectives: ObjectiveRow[]
  content: ContentRow[]
  costRows: CostRow[]
  rescheduleFeeAmount: number | ''
  payment_method_ids: number[]
}

const EMPTY_FORM: CourseFormState = {
  title_es: '',
  title_en: '',
  tagline_es: '',
  tagline_en: '',
  image_url: null,
  objectives: [],
  content: [],
  costRows: [],
  rescheduleFeeAmount: DEFAULT_RESCHEDULE_FEE,
  payment_method_ids: [],
}

export function AdminCoursesPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)
  const [totalPages, setTotalPages] = useState(1)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Lookup[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchAdminCourses(token, page, pageSize))
      .then((result) => {
        setCourses(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, pageSize, getToken])

  useEffect(reload, [reload])
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods)
  }, [])

  const forcedPaymentMethodId = paymentMethods.find(
    (method) => method.name.es === FORCED_PAYMENT_METHOD_NAME_ES,
  )?.id

  const selectablePaymentMethods = paymentMethods.filter(
    (method) => method.id !== forcedPaymentMethodId,
  )

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setEditingSlug(null)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = async (course: CourseSummary) => {
    const token = await getToken()
    const detail = await fetchAdminCourse(token, course.id)
    const selectedMethodIds = paymentMethods
      .filter(
        (method) =>
          method.id !== forcedPaymentMethodId &&
          detail.methods.some((m) => m.es === method.name.es),
      )
      .map((method) => method.id)

    setForm({
      title_es: detail.title.es,
      title_en: detail.title.en,
      tagline_es: detail.tagline.es,
      tagline_en: detail.tagline.en,
      image_url: detail.image_url,
      objectives: detail.objectives.map((o) => ({ es: o.es, en: o.en })),
      content: detail.content.map((c) => ({
        module_es: c.module.es,
        module_en: c.module.en,
        hours: parseHours(c.duration),
      })),
      costRows: detail.cost
        .filter((c) => c.es !== FIXED_COST_NOTE_ES && c.en !== FIXED_COST_NOTE_EN)
        .map((c) => parseCostRow(c.es, c.en)),
      rescheduleFeeAmount: (() => {
        const parsed = parseRescheduleFee(detail.duration.es)
        return parsed !== '' ? parsed : parseRescheduleFee(detail.duration.en)
      })(),
      payment_method_ids: selectedMethodIds,
    })
    setEditingSlug(detail.slug)
    setFormError(null)
    setEditingId(course.id)
  }

  const totalHours = form.content.reduce((sum, c) => sum + (Number(c.hours) || 0), 0)

  const handleImageSelected = async (file: File | undefined) => {
    if (!file) return
    setFormError(null)
    setUploadingImage(true)
    try {
      const token = await getToken()
      const { url } = await uploadCourseImage(token, file)
      setForm((current) => ({ ...current, image_url: url }))
    } catch (error) {
      setFormError(
        error instanceof AdminApiError ? error.detail ?? error.message : String(error),
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const submit = async () => {
    setFormError(null)

    if (form.costRows.filter((row) => row.kind === 'individual').length > 1) {
      setFormError(t('admin.costIndividualLimitError'))
      return
    }

    const baseBody: Omit<CourseWrite, 'slug'> = {
      title_es: form.title_es,
      title_en: form.title_en,
      tagline_es: form.tagline_es,
      tagline_en: form.tagline_en,
      duration_text_es: `${totalHours} horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de ${formatCostAmount(form.rescheduleFeeAmount, 'es-CO', 'por día')}.`,
      duration_text_en: `${totalHours} hours total. Personalized schedules by arrangement; rescheduling costs ${formatCostAmount(form.rescheduleFeeAmount, 'en-US', 'per day')}.`,
      image_url: form.image_url,
      is_active: true,
      objectives: form.objectives,
      content: form.content.map((c) => ({
        module_es: c.module_es,
        module_en: c.module_en,
        duration_label: `${Number(c.hours) || 0}h`,
      })),
      cost: [
        ...form.costRows.map((row) => ({
          es: formatCostRow(row, 'es'),
          en: formatCostRow(row, 'en'),
        })),
        { es: FIXED_COST_NOTE_ES, en: FIXED_COST_NOTE_EN },
      ],
      payment_method_ids: forcedPaymentMethodId
        ? [...form.payment_method_ids, forcedPaymentMethodId]
        : form.payment_method_ids,
    }

    const token = await getToken()
    const baseSlug = editingSlug ?? slugify(form.title_es)
    const MAX_SLUG_ATTEMPTS = 20

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
      try {
        if (editingId === 'new') {
          await createCourse(token, { ...baseBody, slug })
        } else if (editingId !== null) {
          await updateCourse(token, editingId, { ...baseBody, slug })
        }
        setEditingId(null)
        reload()
        return
      } catch (err) {
        const isSlugCollision =
          editingId === 'new' && err instanceof AdminApiError && err.status === 400
        if (!isSlugCollision) {
          setFormError(t('admin.saveError'))
          return
        }
        // slug taken (e.g. another course with a similar title) — retry with a numeric suffix
      }
    }
    setFormError(t('admin.saveError'))
  }

  const remove = async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    await deleteCourse(token, id)
    if (courses.length === 1 && page > 1) {
      setPage(page - 1)
    } else {
      reload()
    }
  }

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <BackToPanelLink />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-lavender-dark">
              {t('admin.manageCourses')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{t('admin.manageCoursesDesc')}</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="shrink-0 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('admin.newCourse')}
          </button>
        </div>

        {editingId !== null && (
          <Modal
            title={editingId === 'new' ? t('admin.newCourse') : t('admin.editCourse')}
            onClose={() => setEditingId(null)}
            maxWidthClassName="max-w-3xl"
          >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.titleEs')} *
                </span>
                <input
                  required
                  placeholder={t('admin.fields.titleEs')}
                  value={form.title_es}
                  onChange={(e) => setForm({ ...form, title_es: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.titleEn')} *
                </span>
                <input
                  required
                  placeholder={t('admin.fields.titleEn')}
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.taglineEs')} *
                </span>
                <input
                  required
                  placeholder={t('admin.fields.taglineEs')}
                  value={form.tagline_es}
                  onChange={(e) => setForm({ ...form, tagline_es: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.taglineEn')} *
                </span>
                <input
                  required
                  placeholder={t('admin.fields.taglineEn')}
                  value={form.tagline_en}
                  onChange={(e) => setForm({ ...form, tagline_en: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
            </div>

            <div className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('admin.fields.image')}
              </span>
              <div className="flex items-center gap-4">
                <img
                  src={getCourseImageUrl({ image_url: form.image_url })}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-cream object-cover"
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingImage}
                  onChange={(e) => handleImageSelected(e.target.files?.[0])}
                  className="text-sm text-lavender-dark file:mr-3 file:rounded-full file:border-0 file:bg-coral file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-coral-dark disabled:opacity-50"
                />
              </div>
              <p className="mt-1 text-xs text-lavender-dark/70">
                {uploadingImage ? t('admin.fields.imageUploading') : t('admin.fields.imageHint')}
              </p>
            </div>

            <ListEditor
              label={t('coursePage.objectives')}
              rows={form.objectives}
              onChange={(objectives) => setForm({ ...form, objectives })}
              columnsClassName="sm:grid-cols-2"
              renderRow={(row, onChange) => (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                      {t('admin.fields.objectiveEs')}
                    </span>
                    <textarea
                      required
                      rows={4}
                      value={row.es}
                      onChange={(e) => onChange({ ...row, es: e.target.value })}
                      className="w-full rounded-lg border border-cream px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                      {t('admin.fields.objectiveEn')}
                    </span>
                    <textarea
                      required
                      rows={4}
                      value={row.en}
                      onChange={(e) => onChange({ ...row, en: e.target.value })}
                      className="w-full rounded-lg border border-cream px-3 py-2"
                    />
                  </label>
                </>
              )}
              emptyRow={{ es: '', en: '' }}
            />

            <div>
              <ListEditor
                label={t('coursePage.content')}
                rows={form.content}
                onChange={(content) => setForm({ ...form, content })}
                columnsClassName="sm:grid-cols-2"
                renderRow={(row, onChange) => (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                        {t('admin.fields.moduleEs')}
                      </span>
                      <textarea
                        required
                        rows={3}
                        value={row.module_es}
                        onChange={(e) => onChange({ ...row, module_es: e.target.value })}
                        className="w-full rounded-lg border border-cream px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                        {t('admin.fields.moduleEn')}
                      </span>
                      <textarea
                        required
                        rows={3}
                        value={row.module_en}
                        onChange={(e) => onChange({ ...row, module_en: e.target.value })}
                        className="w-full rounded-lg border border-cream px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2 sm:max-w-[10rem]">
                      <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                        {t('admin.fields.hours')}
                      </span>
                      <input
                        required
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={row.hours}
                        onChange={(e) =>
                          onChange({
                            ...row,
                            hours: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-cream px-3 py-2"
                      />
                    </label>
                  </>
                )}
                emptyRow={{ module_es: '', module_en: '', hours: '' }}
              />
              {form.content.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {t('admin.durationTotal', { hours: totalHours })}
                </p>
              )}
            </div>

            <div>
              <ListEditor
                label={t('coursePage.cost')}
                rows={form.costRows}
                onChange={(costRows) => setForm({ ...form, costRows })}
                columnsClassName="sm:grid-cols-2"
                renderRow={(row, onChange) => {
                  const individualCount = form.costRows.filter(
                    (r) => r.kind === 'individual',
                  ).length
                  const individualDisabled = individualCount >= 1 && row.kind !== 'individual'

                  return (
                    <>
                      <label className="block text-sm sm:col-span-2 sm:max-w-[12rem]">
                        <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                          {t('admin.fields.costKind')}
                        </span>
                        <select
                          value={row.kind}
                          onChange={(e) => {
                            const kind = e.target.value as CostRow['kind']
                            if (kind === row.kind) return
                            onChange(
                              kind === 'individual'
                                ? {
                                    kind,
                                    description_es: row.description_es,
                                    description_en: row.description_en,
                                    amount: '',
                                  }
                                : {
                                    kind,
                                    description_es: row.description_es,
                                    description_en: row.description_en,
                                    groupSize: '',
                                    pricePerPerson: '',
                                  },
                            )
                          }}
                          className="w-full rounded-lg border border-cream px-3 py-2"
                        >
                          <option value="grupal">{t('admin.fields.costKindGrupal')}</option>
                          <option value="individual" disabled={individualDisabled}>
                            {t('admin.fields.costKindIndividual')}
                          </option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                          {t('admin.fields.costDescriptionEs')}
                        </span>
                        <textarea
                          required
                          rows={3}
                          value={row.description_es}
                          onChange={(e) =>
                            onChange({ ...row, description_es: e.target.value })
                          }
                          className="w-full rounded-lg border border-cream px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                          {t('admin.fields.costDescriptionEn')}
                        </span>
                        <textarea
                          required
                          rows={3}
                          value={row.description_en}
                          onChange={(e) =>
                            onChange({ ...row, description_en: e.target.value })
                          }
                          className="w-full rounded-lg border border-cream px-3 py-2"
                        />
                      </label>
                      {row.kind === 'individual' ? (
                        <label className="block text-sm sm:col-span-2 sm:max-w-[12rem]">
                          <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                            {t('admin.fields.costAmount')}
                          </span>
                          <input
                            required
                            type="number"
                            min={1}
                            value={row.amount}
                            onChange={(e) =>
                              onChange({
                                ...row,
                                amount: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-cream px-3 py-2"
                          />
                        </label>
                      ) : (
                        <>
                          <label className="block text-sm sm:max-w-[12rem]">
                            <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                              {t('admin.fields.groupSize')}
                            </span>
                            <input
                              required
                              type="number"
                              min={2}
                              value={row.groupSize}
                              onChange={(e) =>
                                onChange({
                                  ...row,
                                  groupSize: e.target.value === '' ? '' : Number(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-cream px-3 py-2"
                            />
                          </label>
                          <label className="block text-sm sm:max-w-[12rem]">
                            <span className="mb-1 block text-xs font-semibold text-lavender-dark">
                              {t('admin.fields.pricePerPerson')}
                            </span>
                            <input
                              required
                              type="number"
                              min={1}
                              value={row.pricePerPerson}
                              onChange={(e) =>
                                onChange({
                                  ...row,
                                  pricePerPerson:
                                    e.target.value === '' ? '' : Number(e.target.value),
                                })
                              }
                              className="w-full rounded-lg border border-cream px-3 py-2"
                            />
                          </label>
                        </>
                      )}
                    </>
                  )
                }}
                emptyRow={EMPTY_COST_ROW}
              />
              <p className="mt-2 text-sm text-gray-600">{t('admin.costAmountHint')}</p>
              <p className="mt-1 text-sm text-gray-600">{t('admin.costIncludesNote')}</p>
            </div>

            <label className="block text-sm sm:max-w-xs">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('admin.fields.rescheduleFee')}
              </span>
              <input
                required
                type="number"
                min={0}
                step={1000}
                value={form.rescheduleFeeAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rescheduleFeeAmount: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>

            <div>
              <p className="mb-1 text-sm font-semibold text-lavender-dark">
                {t('coursePage.methods')}
              </p>
              <MultiSelectDropdown
                options={selectablePaymentMethods.map((method) => ({
                  id: method.id,
                  label: method.name.es,
                }))}
                selected={new Set(form.payment_method_ids)}
                onChange={(selected) =>
                  setForm({ ...form, payment_method_ids: [...selected] })
                }
                placeholder={t('coursePage.methods')}
              />
              <p className="mt-2 text-sm text-gray-600">{t('admin.paymentIncludesNote')}</p>
            </div>

            {formError && (
              <p className="text-sm font-semibold text-coral-dark">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploadingImage}
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50"
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
          </Modal>
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
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-cream">
                    <td className="py-3">{course.title.es}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(course)}
                        aria-label={t('admin.edit')}
                        title={t('admin.edit')}
                        className="mr-3 text-lavender-dark hover:text-lavender"
                      >
                        <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(course.id)}
                        aria-label={t('admin.delete')}
                        title={t('admin.delete')}
                        className="text-coral-dark hover:text-coral"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
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
  columnsClassName = 'sm:grid-cols-2 lg:grid-cols-3',
}: {
  label: string
  rows: T[]
  onChange: (rows: T[]) => void
  renderRow: (row: T, onChange: (row: T) => void) => ReactNode
  emptyRow: T
  columnsClassName?: string
}) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="text-sm font-semibold text-lavender-dark">{label}</p>
      <div className="mt-2 space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className={`grid flex-1 gap-3 ${columnsClassName}`}>
              {renderRow(row, (updated) => {
                const next = [...rows]
                next[index] = updated
                onChange(next)
              })}
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="mt-6 text-coral-dark"
              aria-label={t('admin.delete')}
            >
              <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
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
