import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  addTabItem,
  createTab,
  deleteTab,
  fetchTabPaymentMethods,
  fetchTabs,
  payTab,
  removeTabItem,
  reopenTab,
  updateTabItem,
  type Tab,
  type TabPaymentMethod,
  type TabSourceType,
} from '../../lib/adminApi'
import { fetchMenuItems, fetchProducts, type MenuItem, type Product } from '../../lib/api'
import { Modal } from './Modal'

interface PickerEntry {
  source_type: TabSourceType
  source_id: number
  label: string
  price_cop: number
}

async function loadAllProducts(): Promise<Product[]> {
  const first = await fetchProducts(1)
  if (first.total_pages <= 1) return first.items

  const rest = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, i) => fetchProducts(i + 2)),
  )
  return [first, ...rest].flatMap((page) => page.items)
}

export function CuentasTab({ cashSessionOpen }: { cashSessionOpen: boolean }) {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [tabs, setTabs] = useState<Tab[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<TabPaymentMethod[]>([])

  const [newTabOpen, setNewTabOpen] = useState(false)
  const [newTabForm, setNewTabForm] = useState({ table_number: '', reference_note: '' })

  const [pickerTabId, setPickerTabId] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')

  const [payTabId, setPayTabId] = useState<number | null>(null)
  const [payMethodId, setPayMethodId] = useState<number | ''>('')

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then(fetchTabs)
      .then((result) => {
        setTabs(result)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [getToken])

  useEffect(reload, [reload])

  useEffect(() => {
    fetchMenuItems().then(setMenuItems)
    loadAllProducts().then(setProducts)
    fetchTabPaymentMethods(undefined).then((methods) =>
      setPaymentMethods(methods.filter((m) => m.is_active)),
    )
  }, [])

  const replaceTab = (updated: Tab) => {
    setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const pickerEntries = useMemo<PickerEntry[]>(() => {
    const search = pickerSearch.trim().toLowerCase()
    const fromMenu: PickerEntry[] = menuItems
      .filter((item) => item.price_cop !== null)
      .map((item) => ({
        source_type: 'menu_item',
        source_id: item.id,
        label: item.name.es,
        price_cop: item.price_cop as number,
      }))
    const fromProducts: PickerEntry[] = products.map((product) => ({
      source_type: 'product',
      source_id: product.id,
      label: product.name.es,
      price_cop: product.price_cop,
    }))
    return [...fromMenu, ...fromProducts].filter((entry) =>
      search === '' ? true : entry.label.toLowerCase().includes(search),
    )
  }, [menuItems, products, pickerSearch])

  const submitNewTab = async () => {
    const token = await getToken()
    await createTab(token, {
      table_number: newTabForm.table_number.trim() === '' ? null : newTabForm.table_number,
      reference_note: newTabForm.reference_note.trim() === '' ? null : newTabForm.reference_note,
    })
    setNewTabForm({ table_number: '', reference_note: '' })
    setNewTabOpen(false)
    reload()
  }

  const addItem = async (tabId: number, entry: PickerEntry) => {
    const token = await getToken()
    const updated = await addTabItem(token, tabId, {
      source_type: entry.source_type,
      source_id: entry.source_id,
      quantity: 1,
    })
    replaceTab(updated)
  }

  const changeQuantity = async (tabId: number, itemId: number, quantity: number) => {
    if (quantity < 1) return
    const token = await getToken()
    const updated = await updateTabItem(token, tabId, itemId, quantity)
    replaceTab(updated)
  }

  const removeItem = async (tabId: number, itemId: number) => {
    const token = await getToken()
    const updated = await removeTabItem(token, tabId, itemId)
    replaceTab(updated)
  }

  const submitPay = async () => {
    if (payTabId === null || payMethodId === '') return
    const token = await getToken()
    const updated = await payTab(token, payTabId, payMethodId)
    replaceTab(updated)
    setPayTabId(null)
    setPayMethodId('')
  }

  const reopen = async (tabId: number) => {
    const token = await getToken()
    const updated = await reopenTab(token, tabId)
    replaceTab(updated)
  }

  const remove = async (tabId: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    await deleteTab(token, tabId)
    setTabs((prev) => prev.filter((t) => t.id !== tabId))
  }

  if (!cashSessionOpen) {
    return (
      <p className="mt-10 text-center text-gray-500">{t('adminTabs.cashSessionClosedNotice')}</p>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setNewTabOpen(true)}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('adminTabs.newTab')}
        </button>
      </div>

      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}
      {status === 'ready' && tabs.length === 0 && (
        <p className="mt-10 text-gray-500">{t('adminTabs.noTabs')}</p>
      )}

      {status === 'ready' && tabs.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tabs.map((tab) => (
            <div key={tab.id} className="rounded-2xl border border-cream bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-lavender-dark">
                    {tab.table_number ?? tab.reference_note ?? t('adminTabs.untitledTab')}
                  </p>
                  {tab.table_number && tab.reference_note && (
                    <p className="text-xs text-gray-500">{tab.reference_note}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    tab.status === 'open'
                      ? 'bg-lavender/20 text-lavender-dark'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {tab.status === 'open' ? t('adminTabs.statusOpen') : t('adminTabs.statusPaid')}
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {tab.items.length === 0 && (
                  <li className="text-gray-500">{t('adminTabs.noItems')}</li>
                )}
                {tab.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="flex-1">{item.name.es}</span>
                    {tab.status === 'open' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(tab.id, item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded-full border border-cream text-lavender-dark"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(tab.id, item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded-full border border-cream text-lavender-dark"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500">×{item.quantity}</span>
                    )}
                    <span className="w-20 text-right">
                      ${item.subtotal_cop.toLocaleString('es-CO')}
                    </span>
                    {tab.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => removeItem(tab.id, item.id)}
                        aria-label={t('admin.delete')}
                        className="text-coral-dark hover:text-coral"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-cream pt-3 font-semibold text-lavender-dark">
                <span>{t('adminTabs.total')}</span>
                <span>${tab.total_cop.toLocaleString('es-CO')}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {tab.status === 'open' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPickerTabId(tab.id)
                        setPickerSearch('')
                      }}
                      className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-1 h-3 w-3" />
                      {t('adminTabs.addItems')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayTabId(tab.id)}
                      disabled={tab.items.length === 0}
                      className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
                    >
                      {t('adminTabs.markPaid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(tab.id)}
                      aria-label={t('admin.delete')}
                      className="rounded-full border border-cream px-3 py-1.5 text-xs text-coral-dark hover:bg-coral/10"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    </button>
                  </>
                )}
                {tab.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => reopen(tab.id)}
                    className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
                  >
                    {t('adminTabs.reopen')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {newTabOpen && (
        <Modal title={t('adminTabs.newTab')} onClose={() => setNewTabOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitNewTab()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.tableNumber')}
              </span>
              <input
                value={newTabForm.table_number}
                onChange={(e) => setNewTabForm({ ...newTabForm, table_number: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.referenceNote')}
              </span>
              <input
                value={newTabForm.reference_note}
                onChange={(e) => setNewTabForm({ ...newTabForm, reference_note: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('admin.save')}
              </button>
              <button
                type="button"
                onClick={() => setNewTabOpen(false)}
                className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pickerTabId !== null && (
        <Modal title={t('adminTabs.addItems')} onClose={() => setPickerTabId(null)}>
          <input
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={t('adminTabs.searchPlaceholder')}
            className="mb-4 w-full rounded-lg border border-cream px-3 py-2 text-sm"
          />
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {pickerEntries.map((entry) => (
              <li
                key={`${entry.source_type}-${entry.source_id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-cream/60"
              >
                <span className="flex-1">{entry.label}</span>
                <span className="text-gray-500">${entry.price_cop.toLocaleString('es-CO')}</span>
                <button
                  type="button"
                  onClick={() => addItem(pickerTabId, entry)}
                  className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-dark"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                </button>
              </li>
            ))}
            {pickerEntries.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                {t('adminTabs.noResults')}
              </li>
            )}
          </ul>
        </Modal>
      )}

      {payTabId !== null && (
        <Modal title={t('adminTabs.markPaid')} onClose={() => setPayTabId(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitPay()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.paymentMethod')} *
              </span>
              <select
                required
                value={payMethodId}
                onChange={(e) => setPayMethodId(Number(e.target.value))}
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="" disabled>
                  {t('adminTabs.fields.paymentMethod')}
                </option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name.es}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('adminTabs.markPaid')}
              </button>
              <button
                type="button"
                onClick={() => setPayTabId(null)}
                className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
