import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import {
  AdminApiError,
  addTabItem,
  closeCashSession,
  createTab,
  deleteTab,
  fetchTabPaymentMethods,
  fetchTables,
  fetchTabs,
  openCashSession,
  payTab,
  removeTabItem,
  reopenTab,
  updateTabItem,
  type CashSession,
  type Tab,
  type TabPaymentMethod,
  type TabSourceType,
  type Table as FloorTable,
} from '../../lib/adminApi'
import { fetchMenuItems, fetchProducts, type MenuItem, type Product } from '../../lib/api'
import { FloorPlan } from './FloorPlan'
import { Modal } from './Modal'
import { TabCard } from './TabCard'

interface PickerEntry {
  source_type: TabSourceType
  source_id: number
  label: string
  price_cop: number | null
  category: string
}

function pickerKey(entry: PickerEntry): string {
  return `${entry.source_type}-${entry.source_id}`
}

async function loadAllProducts(): Promise<Product[]> {
  const first = await fetchProducts(1)
  if (first.total_pages <= 1) return first.items

  const rest = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, i) => fetchProducts(i + 2)),
  )
  return [first, ...rest].flatMap((page) => page.items)
}

export function CuentasTab({
  cashSession,
  onCashSessionChange,
}: {
  cashSession: CashSession | null | undefined
  onCashSessionChange: () => void
}) {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [tabs, setTabs] = useState<Tab[]>([])
  const [rawTables, setRawTables] = useState<FloorTable[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<TabPaymentMethod[]>([])

  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)

  const [newAccountType, setNewAccountType] = useState<'takeaway' | 'custom' | null>(null)
  const [newAccountNote, setNewAccountNote] = useState('')

  const [pickerTabId, setPickerTabId] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerCategory, setPickerCategory] = useState<string>('all')
  const [pickerQuantities, setPickerQuantities] = useState<Record<string, number>>({})
  const [pricingEntry, setPricingEntry] = useState<PickerEntry | null>(null)
  const [pricingForm, setPricingForm] = useState({ price: '', description: '' })

  const [payTabId, setPayTabId] = useState<number | null>(null)
  const [payMethodId, setPayMethodId] = useState<number | ''>('')

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => Promise.all([fetchTabs(token), fetchTables(token)]))
      .then(([tabResult, tableResult]) => {
        setTabs(tabResult)
        setRawTables(tableResult)
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

  const openDineInByTableId = useMemo(() => {
    const map = new Map<number, Tab>()
    for (const tab of tabs) {
      if (tab.status === 'open' && tab.table) map.set(tab.table.id, tab)
    }
    return map
  }, [tabs])

  const tables = useMemo(
    () =>
      rawTables.map((table) => {
        const openTab = openDineInByTableId.get(table.id)
        return {
          ...table,
          open_tab: openTab
            ? { tab_id: openTab.id, total_cop: openTab.total_cop, opened_at: openTab.opened_at }
            : null,
        }
      }),
    [rawTables, openDineInByTableId],
  )

  const otherTabs = useMemo(
    () => tabs.filter((tab) => tab.account_type !== 'dine_in' || tab.status === 'paid'),
    [tabs],
  )

  const selectedTab = tabs.find((t) => t.id === selectedTabId) ?? null

  const productsCategoryLabel = t('adminTabs.productsCategory')

  const allPickerEntries = useMemo<PickerEntry[]>(() => {
    const fromMenu: PickerEntry[] = menuItems.map((item) => ({
      source_type: 'menu_item' as const,
      source_id: item.id,
      label: item.name.es,
      price_cop: item.price_cop,
      category: item.category.es,
    }))
    const fromProducts: PickerEntry[] = products.map((product) => ({
      source_type: 'product' as const,
      source_id: product.id,
      label: product.name.es,
      price_cop: product.price_cop,
      category: productsCategoryLabel,
    }))
    return [...fromMenu, ...fromProducts]
  }, [menuItems, products, productsCategoryLabel])

  const pickerCategories = useMemo(
    () => Array.from(new Set(allPickerEntries.map((entry) => entry.category))),
    [allPickerEntries],
  )

  const pickerEntries = useMemo<PickerEntry[]>(() => {
    const search = pickerSearch.trim().toLowerCase()
    return allPickerEntries.filter((entry) => {
      if (pickerCategory !== 'all' && entry.category !== pickerCategory) return false
      return search === '' ? true : entry.label.toLowerCase().includes(search)
    })
  }, [allPickerEntries, pickerCategory, pickerSearch])

  const openPicker = (tabId: number) => {
    setPickerTabId(tabId)
    setPickerSearch('')
    setPickerCategory('all')
    setPickerQuantities({})
  }

  const getPickerQuantity = (entry: PickerEntry) => pickerQuantities[pickerKey(entry)] ?? 1

  const setPickerQuantity = (entry: PickerEntry, quantity: number) => {
    if (quantity < 1) return
    setPickerQuantities((prev) => ({ ...prev, [pickerKey(entry)]: quantity }))
  }

  const handleTableClick = async (table: FloorTable) => {
    if (table.open_tab) {
      setSelectedTabId(table.open_tab.tab_id)
      return
    }
    const token = await getToken()
    const created = await createTab(token, {
      account_type: 'dine_in',
      table_id: table.id,
      reference_note: null,
    })
    setTabs((prev) => [created, ...prev])
    setSelectedTabId(created.id)
  }

  const submitNewAccount = async () => {
    if (!newAccountType) return
    const token = await getToken()
    const created = await createTab(token, {
      account_type: newAccountType,
      table_id: null,
      reference_note: newAccountNote.trim() === '' ? null : newAccountNote.trim(),
    })
    setTabs((prev) => [created, ...prev])
    setNewAccountType(null)
    setNewAccountNote('')
  }

  const addItem = async (
    tabId: number,
    entry: PickerEntry,
    quantity: number,
    priced?: { price: number; description: string | null },
  ) => {
    const token = await getToken()
    const updated = await addTabItem(token, tabId, {
      source_type: entry.source_type,
      source_id: entry.source_id,
      quantity,
      ...(priced ? { unit_price_cop: priced.price, description: priced.description ?? undefined } : {}),
    })
    replaceTab(updated)
    setPickerQuantities((prev) => ({ ...prev, [pickerKey(entry)]: 1 }))
  }

  const handlePickEntry = (entry: PickerEntry) => {
    if (pickerTabId === null) return
    if (entry.price_cop === null) {
      setPricingEntry(entry)
      setPricingForm({ price: '', description: '' })
      return
    }
    addItem(pickerTabId, entry, getPickerQuantity(entry))
  }

  const submitPricing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pickerTabId === null || !pricingEntry) return
    const price = Number(pricingForm.price)
    if (!price || price <= 0) return
    await addItem(pickerTabId, pricingEntry, getPickerQuantity(pricingEntry), {
      price,
      description: pricingForm.description.trim() === '' ? null : pricingForm.description.trim(),
    })
    setPricingEntry(null)
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
    if (selectedTabId === tabId) setSelectedTabId(null)
  }

  const handleOpenSession = async () => {
    const token = await getToken()
    await openCashSession(token)
    onCashSessionChange()
  }

  const handleCloseSession = async () => {
    if (!window.confirm(t('adminTabs.confirmCloseCashSession'))) return
    const token = await getToken()
    try {
      await closeCashSession(token)
      onCashSessionChange()
    } catch (error) {
      const message =
        error instanceof AdminApiError && error.status === 400
          ? t('adminTabs.closeCashSessionUnpaidError')
          : t('admin.saveError')
      window.alert(message)
    }
  }

  const cashSessionBanner = cashSession !== undefined && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream bg-white p-4">
      <span className="text-sm font-semibold text-lavender-dark">
        {cashSession
          ? t('adminTabs.cashSessionOpenLabel', {
              time: new Date(cashSession.opened_at).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              username: cashSession.opened_by,
            })
          : t('adminTabs.cashSessionClosedLabel')}
      </span>
      {cashSession ? (
        <button
          type="button"
          onClick={handleCloseSession}
          className="rounded-full border border-coral px-5 py-2 text-sm font-semibold text-coral-dark hover:bg-coral/10"
        >
          {t('adminTabs.closeCashSession')}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpenSession}
          className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('adminTabs.openCashSession')}
        </button>
      )}
    </div>
  )

  if (!cashSession) {
    return (
      <div className="mt-6 space-y-6">
        {cashSessionBanner}
        <p className="text-center text-gray-500">{t('adminTabs.cashSessionClosedNotice')}</p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {cashSessionBanner}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setNewAccountType('takeaway')}
          className="rounded-full border border-lavender px-5 py-2 text-sm font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
        >
          {t('adminTabs.newTakeaway')}
        </button>
        <button
          type="button"
          onClick={() => setNewAccountType('custom')}
          className="rounded-full border border-lavender px-5 py-2 text-sm font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
        >
          {t('adminTabs.newCustom')}
        </button>
      </div>

      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}

      {status === 'ready' && (
        <FloorPlan tables={tables} editable={false} onTableClick={handleTableClick} />
      )}

      {status === 'ready' && otherTabs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {otherTabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              onAddItems={openPicker}
              onChangeQuantity={changeQuantity}
              onRemoveItem={removeItem}
              onPay={(id) => setPayTabId(id)}
              onDelete={remove}
              onReopen={reopen}
            />
          ))}
        </div>
      )}

      {selectedTab && (
        <Modal title={t('adminTabs.tableAccount')} onClose={() => setSelectedTabId(null)}>
          <TabCard
            tab={selectedTab}
            onAddItems={openPicker}
            onChangeQuantity={changeQuantity}
            onRemoveItem={removeItem}
            onPay={(id) => setPayTabId(id)}
            onDelete={remove}
            onReopen={reopen}
          />
        </Modal>
      )}

      {newAccountType && (
        <Modal
          title={newAccountType === 'takeaway' ? t('adminTabs.newTakeaway') : t('adminTabs.newCustom')}
          onClose={() => setNewAccountType(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitNewAccount()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.referenceNote')}
              </span>
              <input
                value={newAccountNote}
                onChange={(e) => setNewAccountNote(e.target.value)}
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
                onClick={() => setNewAccountType(null)}
                className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pickerTabId !== null && (
        <Modal
          title={t('adminTabs.addItems')}
          onClose={() => setPickerTabId(null)}
          maxWidthClassName="max-w-xl"
        >
          <input
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={t('adminTabs.searchPlaceholder')}
            className="mb-3 w-full rounded-lg border border-cream px-3 py-2 text-sm"
          />
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setPickerCategory('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                pickerCategory === 'all'
                  ? 'bg-coral text-white'
                  : 'bg-cream/60 text-lavender-dark hover:bg-cream'
              }`}
            >
              {t('adminTabs.allCategories')}
            </button>
            {pickerCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setPickerCategory(category)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  pickerCategory === category
                    ? 'bg-coral text-white'
                    : 'bg-cream/60 text-lavender-dark hover:bg-cream'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {pickerEntries.map((entry) => {
              const quantity = getPickerQuantity(entry)
              return (
                <li
                  key={pickerKey(entry)}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-cream/60"
                >
                  <span className="flex-1">{entry.label}</span>
                  <span className="w-20 text-right text-gray-500">
                    {entry.price_cop === null
                      ? t('adminTabs.noPrice')
                      : `$${entry.price_cop.toLocaleString('es-CO')}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPickerQuantity(entry, quantity - 1)}
                      aria-label="-"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-cream text-lavender-dark"
                    >
                      <FontAwesomeIcon icon={faMinus} className="h-2.5 w-2.5" />
                    </button>
                    <span className="w-5 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setPickerQuantity(entry, quantity + 1)}
                      aria-label="+"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-cream text-lavender-dark"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePickEntry(entry)}
                    className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-dark"
                  >
                    {t('adminTabs.add')}
                  </button>
                </li>
              )
            })}
            {pickerEntries.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                {t('adminTabs.noResults')}
              </li>
            )}
          </ul>
        </Modal>
      )}

      {pricingEntry && (
        <Modal title={pricingEntry.label} onClose={() => setPricingEntry(null)}>
          <form onSubmit={submitPricing} className="space-y-4">
            <p className="text-sm text-gray-500">
              {t('adminTabs.fields.quantity')}: {getPickerQuantity(pricingEntry)}
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.price')} *
              </span>
              <input
                required
                type="number"
                min={1}
                value={pricingForm.price}
                onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.fields.description')}
              </span>
              <input
                value={pricingForm.description}
                onChange={(e) => setPricingForm({ ...pricingForm, description: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
              >
                {t('adminTabs.addItems')}
              </button>
              <button
                type="button"
                onClick={() => setPricingEntry(null)}
                className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
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
                    {method.name}
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
