import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Tab } from '../../lib/adminApi'

export function tabTitle(tab: Tab, t: (key: string) => string): string {
  return tab.table?.name ?? tab.reference_note ?? t('adminTabs.untitledTab')
}

export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function formatDuration(fromIso: string, until: Date): string {
  const ms = until.getTime() - new Date(fromIso).getTime()
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`
}

export function TabCard({
  tab,
  onAddItems,
  onChangeQuantity,
  onRemoveItem,
  onPay,
  onDelete,
  onReopen,
}: {
  tab: Tab
  onAddItems: (tabId: number) => void
  onChangeQuantity: (tabId: number, itemId: number, quantity: number) => void
  onRemoveItem: (tabId: number, itemId: number) => void
  onPay: (tabId: number) => void
  onDelete: (tabId: number) => void
  onReopen: (tabId: number) => void
}) {
  const { t } = useTranslation()
  const now = useNow()
  const duration =
    tab.status === 'open'
      ? formatDuration(tab.opened_at, now)
      : tab.paid_at
        ? formatDuration(tab.opened_at, new Date(tab.paid_at))
        : null

  return (
    <div className="rounded-2xl border border-cream bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-lavender-dark">{tabTitle(tab, t)}</p>
          {tab.account_type !== 'dine_in' && (
            <p className="text-xs text-gray-500">
              {t(
                tab.account_type === 'takeaway'
                  ? 'adminTabs.accountTypeTakeaway'
                  : 'adminTabs.accountTypeCustom',
              )}
            </p>
          )}
          {tab.table && tab.reference_note && (
            <p className="text-xs text-gray-500">{tab.reference_note}</p>
          )}
          {duration && (
            <p className="text-xs text-gray-500">
              {t(
                tab.status === 'open'
                  ? 'adminTabs.openForDuration'
                  : 'adminTabs.wasOpenForDuration',
                { duration },
              )}
            </p>
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
        {tab.items.length === 0 && <li className="text-gray-500">{t('adminTabs.noItems')}</li>}
        {tab.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2">
            <span className="flex-1">
              {item.name.es}
              {item.description && (
                <span className="block text-xs text-gray-500">{item.description}</span>
              )}
            </span>
            {tab.status === 'open' ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(tab.id, item.id, item.quantity - 1)}
                  className="h-6 w-6 rounded-full border border-cream text-lavender-dark"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(tab.id, item.id, item.quantity + 1)}
                  className="h-6 w-6 rounded-full border border-cream text-lavender-dark"
                >
                  +
                </button>
              </div>
            ) : (
              <span className="text-gray-500">×{item.quantity}</span>
            )}
            <span className="w-20 text-right">${item.subtotal_cop.toLocaleString('es-CO')}</span>
            {tab.status === 'open' && (
              <button
                type="button"
                onClick={() => onRemoveItem(tab.id, item.id)}
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
              onClick={() => onAddItems(tab.id)}
              className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1 h-3 w-3" />
              {t('adminTabs.addItems')}
            </button>
            <button
              type="button"
              onClick={() => onPay(tab.id)}
              disabled={tab.items.length === 0}
              className="rounded-full bg-coral px-4 py-1.5 text-xs font-semibold text-white hover:bg-coral-dark disabled:opacity-50"
            >
              {t('adminTabs.markPaid')}
            </button>
            <button
              type="button"
              onClick={() => onDelete(tab.id)}
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
            onClick={() => onReopen(tab.id)}
            className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
          >
            {t('adminTabs.reopen')}
          </button>
        )}
      </div>
    </div>
  )
}
