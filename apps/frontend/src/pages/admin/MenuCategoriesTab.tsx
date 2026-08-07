import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  createMenuCategory,
  deleteMenuCategory,
  updateMenuCategory,
  type MenuCategoryWrite,
} from '../../lib/adminApi'
import type { MenuCategory } from '../../lib/api'
import { Modal } from './Modal'

const EMPTY_FORM: MenuCategoryWrite = { name_es: '', name_en: '', sort_order: 0 }

export function MenuCategoriesTab({
  categories,
  onCategoriesChange,
}: {
  categories: MenuCategory[]
  onCategoriesChange: () => void
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<MenuCategoryWrite>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (category: MenuCategory) => {
    setForm({
      name_es: category.name.es,
      name_en: category.name.en,
      sort_order: category.sort_order,
    })
    setFormError(null)
    setEditingId(category.id)
  }

  const submit = async () => {
    setFormError(null)
    try {
      const token = await getToken()
      if (editingId === 'new') {
        await createMenuCategory(token, form)
      } else if (editingId !== null) {
        await updateMenuCategory(token, editingId, form)
      }
      setEditingId(null)
      onCategoriesChange()
    } catch {
      setFormError(t('admin.saveError'))
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    try {
      await deleteMenuCategory(token, id)
      onCategoriesChange()
    } catch (error) {
      const message =
        error instanceof AdminApiError && error.status === 400
          ? t('adminMenu.categoryHasItemsError')
          : t('admin.saveError')
      window.alert(message)
    }
  }

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('adminMenu.newCategory')}
        </button>
      </div>

      {editingId !== null && (
        <Modal
          title={editingId === 'new' ? t('adminMenu.newCategory') : t('adminMenu.editCategory')}
          onClose={() => setEditingId(null)}
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
            <label className="block text-sm sm:max-w-[10rem]">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminMenu.fields.sortOrder')}
              </span>
              <input
                required
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>

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
                onClick={() => setEditingId(null)}
                className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cream text-lavender">
            <th className="py-2">{t('admin.fields.name')}</th>
            <th className="py-2">{t('adminMenu.fields.sortOrder')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((category) => (
            <tr key={category.id} className="border-b border-cream">
              <td className="py-3">{category.name.es}</td>
              <td className="py-3">{category.sort_order}</td>
              <td className="py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => startEdit(category)}
                  aria-label={t('admin.edit')}
                  title={t('admin.edit')}
                  className="mr-3 text-lavender-dark hover:text-lavender"
                >
                  <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(category.id)}
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
    </div>
  )
}
