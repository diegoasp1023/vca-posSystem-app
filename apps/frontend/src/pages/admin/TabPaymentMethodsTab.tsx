import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  createTabPaymentMethod,
  deleteTabPaymentMethod,
  fetchTabPaymentMethods,
  updateTabPaymentMethod,
  type TabPaymentMethod,
  type TabPaymentMethodWrite,
} from '../../lib/adminApi'
import { Modal } from './Modal'

const EMPTY_FORM: TabPaymentMethodWrite = {
  name_es: '',
  name_en: '',
  is_active: true,
  sort_order: 0,
}

export function TabPaymentMethodsTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [methods, setMethods] = useState<TabPaymentMethod[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<TabPaymentMethodWrite>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then(fetchTabPaymentMethods)
      .then((result) => {
        setMethods(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [getToken])

  useEffect(reload, [reload])

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (method: TabPaymentMethod) => {
    setForm({
      name_es: method.name.es,
      name_en: method.name.en,
      is_active: method.is_active,
      sort_order: method.sort_order,
    })
    setFormError(null)
    setEditingId(method.id)
  }

  const submit = async () => {
    setFormError(null)
    try {
      const token = await getToken()
      if (editingId === 'new') {
        await createTabPaymentMethod(token, form)
      } else if (editingId !== null) {
        await updateTabPaymentMethod(token, editingId, form)
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
    try {
      await deleteTabPaymentMethod(token, id)
      reload()
    } catch (error) {
      const message =
        error instanceof AdminApiError && error.status === 400
          ? t('adminTabs.paymentMethodInUseError')
          : t('admin.saveError')
      window.alert(message)
    }
  }

  const sorted = [...methods].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('adminTabs.newPaymentMethod')}
        </button>
      </div>

      {editingId !== null && (
        <Modal
          title={
            editingId === 'new'
              ? t('adminTabs.newPaymentMethod')
              : t('adminTabs.editPaymentMethod')
          }
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              {t('adminTabs.fields.isActive')}
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

      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}
      {status === 'ready' && (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cream text-lavender">
              <th className="py-2">{t('admin.fields.name')}</th>
              <th className="py-2">{t('adminMenu.fields.sortOrder')}</th>
              <th className="py-2">{t('adminTabs.fields.isActive')}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((method) => (
              <tr key={method.id} className="border-b border-cream">
                <td className="py-3">{method.name.es}</td>
                <td className="py-3">{method.sort_order}</td>
                <td className="py-3">
                  {method.is_active ? t('admin.statusActive') : t('admin.statusInactive')}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(method)}
                    aria-label={t('admin.edit')}
                    title={t('admin.edit')}
                    className="mr-3 text-lavender-dark hover:text-lavender"
                  >
                    <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(method.id)}
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
      )}
    </div>
  )
}
