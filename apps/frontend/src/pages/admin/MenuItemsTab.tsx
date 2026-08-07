import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  createMenuItem,
  deleteMenuItem,
  fetchAdminMenuItems,
  updateMenuItem,
  uploadMenuItemImage,
  type MenuItemWrite,
} from '../../lib/adminApi'
import { getMenuItemImageUrl, type MenuCategory, type MenuItem } from '../../lib/api'
import { Pagination } from '../../components/Pagination'
import { Modal } from './Modal'

type MenuItemFormState = {
  category_id: number | ''
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  price_cop: number | ''
  image_url: string | null
  is_active: boolean
}

const EMPTY_FORM: MenuItemFormState = {
  category_id: '',
  name_es: '',
  name_en: '',
  description_es: '',
  description_en: '',
  price_cop: '',
  image_url: null,
  is_active: true,
}

export function MenuItemsTab({ categories }: { categories: MenuCategory[] }) {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<MenuItemFormState>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) =>
        fetchAdminMenuItems(token, page, categoryFilter === '' ? undefined : categoryFilter),
      )
      .then((result) => {
        setItems(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, categoryFilter, getToken])

  useEffect(reload, [reload])

  const startCreate = () => {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' })
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (item: MenuItem) => {
    setForm({
      category_id: item.category_id,
      name_es: item.name.es,
      name_en: item.name.en,
      description_es: item.description?.es ?? '',
      description_en: item.description?.en ?? '',
      price_cop: item.price_cop ?? '',
      image_url: item.image_url,
      is_active: item.is_active,
    })
    setFormError(null)
    setEditingId(item.id)
  }

  const handleImageSelected = async (file: File | undefined) => {
    if (!file) return
    setFormError(null)
    setUploadingImage(true)
    try {
      const token = await getToken()
      const { url } = await uploadMenuItemImage(token, file)
      setForm((current) => ({ ...current, image_url: url }))
    } catch (error) {
      setFormError(
        error instanceof AdminApiError ? (error.detail ?? error.message) : String(error),
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const submit = async () => {
    setFormError(null)
    if (form.category_id === '') {
      setFormError(t('adminMenu.categoryRequired'))
      return
    }

    const body: MenuItemWrite = {
      category_id: form.category_id,
      name_es: form.name_es,
      name_en: form.name_en,
      description_es: form.description_es.trim() === '' ? null : form.description_es,
      description_en: form.description_en.trim() === '' ? null : form.description_en,
      price_cop: form.price_cop === '' ? null : Number(form.price_cop),
      image_url: form.image_url,
      is_active: form.is_active,
    }

    try {
      const token = await getToken()
      if (editingId === 'new') {
        await createMenuItem(token, body)
      } else if (editingId !== null) {
        await updateMenuItem(token, editingId, body)
      }
      setEditingId(null)
      reload()
    } catch {
      setFormError(t('admin.saveError'))
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    await deleteMenuItem(token, id)
    if (items.length === 1 && page > 1) {
      setPage(page - 1)
    } else {
      reload()
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('adminMenu.filterByCategory')}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))
              setPage(1)
            }}
            className="rounded-lg border border-cream px-2 py-1"
          >
            <option value="">{t('adminMenu.allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name.es}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={startCreate}
          disabled={categories.length === 0}
          className="shrink-0 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50"
        >
          {t('adminMenu.newItem')}
        </button>
      </div>
      {categories.length === 0 && (
        <p className="mt-2 text-sm text-gray-600">{t('adminMenu.noCategoriesHint')}</p>
      )}

      {editingId !== null && (
        <Modal
          title={editingId === 'new' ? t('adminMenu.newItem') : t('adminMenu.editItem')}
          onClose={() => setEditingId(null)}
          maxWidthClassName="max-w-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminMenu.fields.category')} *
              </span>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="" disabled>
                  {t('adminMenu.fields.category')}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name.es}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.nameEs')} *
                </span>
                <input
                  required
                  value={form.name_es}
                  onChange={(e) => setForm({ ...form, name_es: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.nameEn')} *
                </span>
                <input
                  required
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.descriptionEs')}
                </span>
                <textarea
                  value={form.description_es}
                  onChange={(e) => setForm({ ...form, description_es: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.descriptionEn')}
                </span>
                <textarea
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:max-w-[10rem]">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('adminMenu.fields.price')}
                </span>
                <input
                  type="number"
                  min={1}
                  value={form.price_cop}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_cop: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
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
                  src={getMenuItemImageUrl({ image_url: form.image_url })}
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

      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}
      {status === 'ready' && (
        <>
          <table className="mt-6 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream text-lavender">
                <th className="py-2">{t('admin.fields.name')}</th>
                <th className="py-2">{t('adminMenu.fields.category')}</th>
                <th className="py-2">{t('adminMenu.fields.price')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-cream">
                  <td className="py-3">{item.name.es}</td>
                  <td className="py-3 text-gray-600">{item.category.es}</td>
                  <td className="py-3">
                    {item.price_cop !== null
                      ? `$${item.price_cop.toLocaleString('es-CO')}`
                      : t('adminMenu.noPrice')}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label={t('admin.edit')}
                      title={t('admin.edit')}
                      className="mr-3 text-lavender-dark hover:text-lavender"
                    >
                      <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
