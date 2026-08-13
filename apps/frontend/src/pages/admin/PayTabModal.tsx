import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Tab, TabPayPart, TabPaymentMethod } from '../../lib/adminApi'
import { Modal } from './Modal'

const DEFAULT_TIP_RATE = 0.1

type SplitMode = 'simple' | 'equal' | 'items'

interface PartDraft {
  key: string
  name: string
  payment_method_id: number | ''
  tip_cop: number
  tipTouched: boolean
  allocations: Record<number, number>
}

function makePart(name: string): PartDraft {
  return {
    key: Math.random().toString(36).slice(2),
    name,
    payment_method_id: '',
    tip_cop: 0,
    tipTouched: false,
    allocations: {},
  }
}

function defaultTip(amountCop: number): number {
  return Math.round(amountCop * DEFAULT_TIP_RATE)
}

export function PayTabModal({
  tab,
  paymentMethods,
  onClose,
  onConfirm,
}: {
  tab: Tab
  paymentMethods: TabPaymentMethod[]
  onClose: () => void
  onConfirm: (parts: TabPayPart[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const total = tab.total_cop

  const [mode, setMode] = useState<SplitMode>('simple')
  const [simplePart, setSimplePart] = useState<PartDraft>(() => ({
    ...makePart(''),
    tip_cop: defaultTip(total),
  }))
  const [equalCount, setEqualCount] = useState(2)
  const [equalParts, setEqualParts] = useState<PartDraft[]>(() => {
    const base = Math.floor(total / 2)
    return Array.from({ length: 2 }, (_, i) => ({
      ...makePart(t('adminTabs.pay.partN', { n: i + 1 })),
      tip_cop: defaultTip(i === 1 ? total - base : base),
    }))
  })
  const [itemParts, setItemParts] = useState<PartDraft[]>(() => [
    makePart(t('adminTabs.pay.partN', { n: 1 })),
    makePart(t('adminTabs.pay.partN', { n: 2 })),
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const equalAmounts = useMemo(() => {
    const base = Math.floor(total / equalCount)
    return Array.from({ length: equalCount }, (_, i) =>
      i === equalCount - 1 ? total - base * (equalCount - 1) : base,
    )
  }, [total, equalCount])

  const changeEqualCount = (count: number) => {
    if (count < 1) return
    setEqualCount(count)
    setEqualParts((prev) => {
      const base = Math.floor(total / count)
      return Array.from({ length: count }, (_, i) => {
        const amount = i === count - 1 ? total - base * (count - 1) : base
        const existing = prev[i]
        return {
          key: existing?.key ?? Math.random().toString(36).slice(2),
          name: t('adminTabs.pay.partN', { n: i + 1 }),
          payment_method_id: existing?.payment_method_id ?? '',
          tip_cop: existing?.tipTouched ? existing.tip_cop : defaultTip(amount),
          tipTouched: existing?.tipTouched ?? false,
          allocations: {},
        }
      })
    })
  }

  const updateEqualPart = (index: number, patch: Partial<PartDraft>) => {
    setEqualParts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const allocatedQtyByItem = useMemo(() => {
    const map = new Map<number, number>()
    for (const part of itemParts) {
      for (const [itemId, qty] of Object.entries(part.allocations)) {
        map.set(Number(itemId), (map.get(Number(itemId)) ?? 0) + qty)
      }
    }
    return map
  }, [itemParts])

  const itemPartAmount = (part: PartDraft) =>
    Object.entries(part.allocations).reduce((sum, [itemId, qty]) => {
      const item = tab.items.find((i) => i.id === Number(itemId))
      return sum + (item ? item.unit_price_cop * qty : 0)
    }, 0)

  const setAllocation = (partIndex: number, itemId: number, quantity: number) => {
    setItemParts((prev) =>
      prev.map((part, i) => {
        if (i !== partIndex) return part
        const allocations = { ...part.allocations }
        if (quantity <= 0) delete allocations[itemId]
        else allocations[itemId] = quantity
        const amount = Object.entries(allocations).reduce((sum, [id, qty]) => {
          const item = tab.items.find((it) => it.id === Number(id))
          return sum + (item ? item.unit_price_cop * qty : 0)
        }, 0)
        return {
          ...part,
          allocations,
          tip_cop: part.tipTouched ? part.tip_cop : defaultTip(amount),
        }
      }),
    )
  }

  const addItemPart = () => {
    setItemParts((prev) => [...prev, makePart(t('adminTabs.pay.partN', { n: prev.length + 1 }))])
  }

  const removeItemPart = (index: number) => {
    setItemParts((prev) => prev.filter((_, i) => i !== index))
  }

  const itemsFullyAllocated = tab.items.every(
    (item) => (allocatedQtyByItem.get(item.id) ?? 0) === item.quantity,
  )

  const canSubmit = (() => {
    if (mode === 'simple') return simplePart.payment_method_id !== ''
    if (mode === 'equal') return equalParts.every((p) => p.payment_method_id !== '')
    return (
      itemsFullyAllocated &&
      itemParts.every((p) => p.payment_method_id !== '' && itemPartAmount(p) > 0)
    )
  })()

  const submit = async () => {
    setError(null)
    let parts: TabPayPart[]
    if (mode === 'simple') {
      parts = [
        {
          payment_method_id: simplePart.payment_method_id as number,
          tip_cop: simplePart.tip_cop,
          amount_cop: total,
        },
      ]
    } else if (mode === 'equal') {
      parts = equalParts.map((p, i) => ({
        payment_method_id: p.payment_method_id as number,
        tip_cop: p.tip_cop,
        amount_cop: equalAmounts[i],
      }))
    } else {
      parts = itemParts.map((p) => ({
        payment_method_id: p.payment_method_id as number,
        tip_cop: p.tip_cop,
        item_allocations: Object.entries(p.allocations).map(([itemId, quantity]) => ({
          item_id: Number(itemId),
          quantity,
        })),
      }))
    }

    setSubmitting(true)
    try {
      await onConfirm(parts)
    } catch {
      setError(t('admin.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const methodSelect = (value: number | '', onChange: (v: number) => void) => (
    <select
      required
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-cream px-3 py-2 text-sm"
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
  )

  const tipInput = (value: number, onChange: (v: number) => void) => (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-cream px-3 py-2 text-sm"
    />
  )

  return (
    <Modal title={t('adminTabs.markPaid')} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="mb-4 flex gap-2">
        {(['simple', 'equal', 'items'] as SplitMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              mode === m
                ? 'bg-coral text-white'
                : 'border border-lavender text-lavender-dark hover:bg-lavender hover:text-white'
            }`}
          >
            {t(`adminTabs.pay.mode.${m}`)}
          </button>
        ))}
      </div>

      {mode === 'simple' && (
        <div className="space-y-3 rounded-xl border border-cream p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-lavender-dark">
            <span>{t('adminTabs.total')}</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </div>
          {methodSelect(simplePart.payment_method_id, (v) =>
            setSimplePart({ ...simplePart, payment_method_id: v }),
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('adminTabs.fields.tip')}
            </span>
            {tipInput(simplePart.tip_cop, (v) =>
              setSimplePart({ ...simplePart, tip_cop: v, tipTouched: true }),
            )}
          </label>
        </div>
      )}

      {mode === 'equal' && (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-lavender-dark">
              {t('adminTabs.pay.splitCount')}
            </span>
            <input
              type="number"
              min={2}
              value={equalCount}
              onChange={(e) => changeEqualCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-cream px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {equalParts.map((part, i) => (
              <div key={part.key} className="space-y-2 rounded-xl border border-cream p-3">
                <div className="flex items-center justify-between text-sm font-semibold text-lavender-dark">
                  <span>{part.name}</span>
                  <span>${equalAmounts[i]?.toLocaleString('es-CO')}</span>
                </div>
                {methodSelect(part.payment_method_id, (v) =>
                  updateEqualPart(i, { payment_method_id: v }),
                )}
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-500">{t('adminTabs.fields.tip')}</span>
                  {tipInput(part.tip_cop, (v) =>
                    updateEqualPart(i, { tip_cop: v, tipTouched: true }),
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'items' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">{t('adminTabs.pay.itemsHint')}</p>
          <div className="space-y-3">
            {itemParts.map((part, partIndex) => (
              <div key={part.key} className="space-y-2 rounded-xl border border-cream p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-lavender-dark">{part.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      ${itemPartAmount(part).toLocaleString('es-CO')}
                    </span>
                    {itemParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemPart(partIndex)}
                        className="text-xs text-coral-dark hover:text-coral"
                      >
                        {t('admin.delete')}
                      </button>
                    )}
                  </div>
                </div>
                <ul className="space-y-1">
                  {tab.items.map((item) => {
                    const allocated = allocatedQtyByItem.get(item.id) ?? 0
                    const mine = part.allocations[item.id] ?? 0
                    const maxForThis = item.quantity - allocated + mine
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex-1">{item.name.es}</span>
                        <input
                          type="number"
                          min={0}
                          max={maxForThis}
                          value={mine}
                          onChange={(e) =>
                            setAllocation(
                              partIndex,
                              item.id,
                              Math.min(Number(e.target.value), maxForThis),
                            )
                          }
                          className="w-16 rounded-lg border border-cream px-2 py-1 text-right"
                        />
                        <span className="w-10 text-xs text-gray-400">/{item.quantity}</span>
                      </li>
                    )
                  })}
                </ul>
                {methodSelect(part.payment_method_id, (v) =>
                  setItemParts((prev) =>
                    prev.map((p, i) => (i === partIndex ? { ...p, payment_method_id: v } : p)),
                  ),
                )}
                <label className="block text-xs">
                  <span className="mb-1 block text-gray-500">{t('adminTabs.fields.tip')}</span>
                  {tipInput(part.tip_cop, (v) =>
                    setItemParts((prev) =>
                      prev.map((p, i) =>
                        i === partIndex ? { ...p, tip_cop: v, tipTouched: true } : p,
                      ),
                    ),
                  )}
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItemPart}
            className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
          >
            {t('adminTabs.pay.addPart')}
          </button>
          {!itemsFullyAllocated && (
            <p className="text-xs text-coral-dark">{t('adminTabs.pay.incompleteAllocation')}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-coral-dark">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={submit}
          className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50"
        >
          {t('adminTabs.markPaid')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-lavender px-6 py-2 text-sm font-semibold text-lavender-dark"
        >
          {t('admin.cancel')}
        </button>
      </div>
    </Modal>
  )
}
