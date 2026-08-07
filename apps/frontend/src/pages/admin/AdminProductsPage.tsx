import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  createProduct,
  deleteProduct,
  fetchAdminProducts,
  fetchPresentations,
  updateProduct,
  type Lookup,
  type ProductWrite,
} from '../../lib/adminApi'
import type { Product } from '../../lib/api'
import { Pagination } from '../../components/Pagination'
import { BackToPanelLink } from './BackToPanelLink'
import { Modal } from './Modal'

const EMPTY_FORM: ProductWrite = {
  name_es: '',
  name_en: '',
  description_es: '',
  description_en: '',
  weight_grams: 340,
  price_cop: 0,
  image_url: null,
  is_active: true,
  presentation_ids: [],
}

export function AdminProductsPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [products, setProducts] = useState<Product[]>([])
  const [presentations, setPresentations] = useState<Lookup[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<ProductWrite>(EMPTY_FORM)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => fetchAdminProducts(token, page))
      .then((result) => {
        setProducts(result.items)
        setTotalPages(result.total_pages)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [page, getToken])

  useEffect(reload, [reload])
  useEffect(() => {
    fetchPresentations().then(setPresentations)
  }, [])

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (product: Product) => {
    const presentationIds = presentations
      .filter((presentation) =>
        product.presentations.some((p) => p.es === presentation.name.es),
      )
      .map((presentation) => presentation.id)
    setForm({
      name_es: product.name.es,
      name_en: product.name.en,
      description_es: product.description.es,
      description_en: product.description.en,
      weight_grams: product.weight_grams,
      price_cop: product.price_cop,
      image_url: product.image_url,
      is_active: true,
      presentation_ids: presentationIds,
    })
    setFormError(null)
    setEditingId(product.id)
  }

  const submit = async () => {
    setFormError(null)
    if (form.presentation_ids.length === 0) {
      setFormError(t('admin.presentationRequired'))
      return
    }
    try {
      const token = await getToken()
      if (editingId === 'new') {
        await createProduct(token, form)
      } else if (editingId !== null) {
        await updateProduct(token, editingId, form)
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
    await deleteProduct(token, id)
    reload()
  }

  const togglePresentation = (id: number) => {
    setForm((f) => ({
      ...f,
      presentation_ids: f.presentation_ids.includes(id)
        ? f.presentation_ids.filter((p) => p !== id)
        : [...f.presentation_ids, id],
    }))
  }

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <BackToPanelLink />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-lavender-dark">
              {t('admin.manageProducts')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{t('admin.manageProductsDesc')}</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="shrink-0 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('admin.newProduct')}
          </button>
        </div>

        {editingId !== null && (
          <Modal
            title={
              editingId === 'new' ? t('admin.newProduct') : t('admin.editProduct')
            }
            onClose={() => {
              setFormError(null)
              setEditingId(null)
            }}
            maxWidthClassName="max-w-2xl"
          >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.nameEs')} *
                </span>
                <input
                  required
                  placeholder={t('admin.fields.nameEs')}
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
                  placeholder={t('admin.fields.nameEn')}
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.descriptionEs')} *
                </span>
                <textarea
                  required
                  placeholder={t('admin.fields.descriptionEs')}
                  value={form.description_es}
                  onChange={(e) =>
                    setForm({ ...form, description_es: e.target.value })
                  }
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.descriptionEn')} *
                </span>
                <textarea
                  required
                  placeholder={t('admin.fields.descriptionEn')}
                  value={form.description_en}
                  onChange={(e) =>
                    setForm({ ...form, description_en: e.target.value })
                  }
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.weight')} *
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  placeholder={t('admin.fields.weight')}
                  value={form.weight_grams}
                  onChange={(e) =>
                    setForm({ ...form, weight_grams: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('admin.fields.price')} *
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  placeholder={t('admin.fields.price')}
                  value={form.price_cop}
                  onChange={(e) =>
                    setForm({ ...form, price_cop: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-lavender-dark">
                {t('menu.presentations')} *
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {presentations.map((presentation) => (
                  <label
                    key={presentation.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.presentation_ids.includes(presentation.id)}
                      onChange={() => togglePresentation(presentation.id)}
                    />
                    {presentation.name.es}
                  </label>
                ))}
              </div>
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
                  <th className="py-2">{t('admin.fields.nameEs')}</th>
                  <th className="py-2">{t('admin.fields.descriptionEs')}</th>
                  <th className="py-2">{t('admin.fields.weight')}</th>
                  <th className="py-2">{t('admin.fields.price')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-cream">
                    <td className="py-3">{product.name.es}</td>
                    <td className="max-w-xs truncate py-3 text-gray-600">
                      {product.description.es}
                    </td>
                    <td className="py-3">{product.weight_grams}gr</td>
                    <td className="py-3">${product.price_cop.toLocaleString('es-CO')}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        aria-label={t('admin.edit')}
                        title={t('admin.edit')}
                        className="mr-3 text-lavender-dark hover:text-lavender"
                      >
                        <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
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
    </section>
  )
}
