import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Table, TableKind, TableShape } from '../../lib/adminApi'
import { Modal } from './Modal'
import { formatDuration, useNow } from './TabCard'

const DEFAULT_SIZE: Record<TableShape, { width: number; height: number }> = {
  circle: { width: 70, height: 70 },
  rect: { width: 80, height: 60 },
}

const LANDMARK_KINDS: TableKind[] = ['entrance', 'bar', 'cashier']

export function FloorPlan({
  tables,
  editable,
  onTableClick,
  onCreateTable,
  onMoveTable,
  onDeleteTable,
}: {
  tables: Table[]
  editable: boolean
  onTableClick?: (table: Table) => void
  onCreateTable?: (data: {
    name: string
    kind: TableKind
    shape: TableShape
    capacity: number | null
  }) => void
  onMoveTable?: (tableId: number, pos_x: number, pos_y: number) => void
  onDeleteTable?: (tableId: number) => void
}) {
  const { t } = useTranslation()
  const now = useNow()
  const kindLabel = (kind: TableKind) =>
    t(
      {
        table: 'adminTabs.floorPlan.kindTable',
        entrance: 'adminTabs.floorPlan.kindEntrance',
        bar: 'adminTabs.floorPlan.kindBar',
        cashier: 'adminTabs.floorPlan.kindCashier',
      }[kind],
    )

  const [newTableOpen, setNewTableOpen] = useState(false)
  const [newTableForm, setNewTableForm] = useState<{
    name: string
    kind: TableKind
    shape: TableShape
    capacity: string
  }>({ name: '', kind: 'table', shape: 'circle', capacity: '' })

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ tableId: number; offsetX: number; offsetY: number } | null>(null)
  const [dragPositions, setDragPositions] = useState<Record<number, { x: number; y: number }>>({})

  const startDrag = (e: React.PointerEvent, table: Table) => {
    if (!editable) return
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasRect = canvas.getBoundingClientRect()
    dragState.current = {
      tableId: table.id,
      offsetX: e.clientX - canvasRect.left - table.pos_x,
      offsetY: e.clientY - canvasRect.top - table.pos_y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDrag = (e: React.PointerEvent) => {
    const drag = dragState.current
    const canvas = canvasRef.current
    if (!drag || !canvas) return
    const canvasRect = canvas.getBoundingClientRect()
    const x = Math.max(0, e.clientX - canvasRect.left - drag.offsetX)
    const y = Math.max(0, e.clientY - canvasRect.top - drag.offsetY)
    setDragPositions((prev) => ({ ...prev, [drag.tableId]: { x, y } }))
  }

  const endDrag = () => {
    const drag = dragState.current
    if (!drag) return
    const pos = dragPositions[drag.tableId]
    dragState.current = null
    if (pos) {
      onMoveTable?.(drag.tableId, pos.x, pos.y)
    }
  }

  const submitNewTable = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTableForm.name.trim() === '') return
    onCreateTable?.({
      name: newTableForm.name.trim(),
      kind: newTableForm.kind,
      shape: newTableForm.shape,
      capacity:
        newTableForm.kind !== 'table' || newTableForm.capacity.trim() === ''
          ? null
          : Number(newTableForm.capacity),
    })
    setNewTableForm({ name: '', kind: 'table', shape: 'circle', capacity: '' })
    setNewTableOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          {t(editable ? 'adminTabs.floorPlan.editHint' : 'adminTabs.floorPlan.hint')}
        </p>
        {editable && (
          <button
            type="button"
            onClick={() => setNewTableOpen(true)}
            className="rounded-full border border-lavender px-4 py-1.5 text-xs font-semibold text-lavender-dark hover:bg-lavender hover:text-white"
          >
            {t('adminTabs.floorPlan.addTable')}
          </button>
        )}
      </div>

      <div
        ref={canvasRef}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        className="relative min-h-[360px] w-full overflow-auto rounded-2xl border border-cream bg-cream/30"
        style={{
          backgroundImage:
            'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '25px 25px',
        }}
      >
        {tables.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            {t('adminTabs.floorPlan.noTables')}
          </p>
        )}
        {tables.map((table) => {
          const pos = dragPositions[table.id] ?? { x: table.pos_x, y: table.pos_y }
          const isLandmark = table.kind !== 'table'
          const occupied = table.open_tab !== null
          const clickable = editable || !isLandmark

          return (
            <div
              key={table.id}
              onPointerDown={(e) => startDrag(e, table)}
              onClick={() => !editable && !isLandmark && onTableClick?.(table)}
              className={`absolute flex select-none flex-col items-center justify-center text-center shadow-sm ${
                table.shape === 'circle' ? 'rounded-full' : 'rounded-xl'
              } ${
                isLandmark
                  ? 'border-2 border-dashed border-gray-400 bg-gray-100 text-gray-500'
                  : occupied
                    ? 'bg-coral text-white'
                    : 'bg-emerald-500 text-white'
              } ${
                editable
                  ? 'cursor-grab active:cursor-grabbing'
                  : clickable
                    ? 'cursor-pointer'
                    : 'cursor-default'
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                width: table.width,
                height: table.height,
              }}
            >
              <span className="text-xs font-semibold leading-tight">{table.name}</span>
              {!isLandmark && (
                <span className="text-[11px] font-normal leading-tight">
                  {occupied
                    ? `$${table.open_tab!.total_cop.toLocaleString('es-CO')}`
                    : table.capacity
                      ? t('adminTabs.floorPlan.capacity', { count: table.capacity })
                      : ''}
                </span>
              )}
              {!isLandmark && occupied && (
                <span className="text-[10px] font-normal leading-tight opacity-90">
                  {formatDuration(table.open_tab!.opened_at, now)}
                </span>
              )}
              {editable && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteTable?.(table.id)
                  }}
                  aria-label={t('admin.delete')}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-coral-dark shadow"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {newTableOpen && (
        <Modal title={t('adminTabs.floorPlan.addTable')} onClose={() => setNewTableOpen(false)}>
          <form onSubmit={submitNewTable} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.floorPlan.fields.kind')}
              </span>
              <select
                value={newTableForm.kind}
                onChange={(e) => {
                  const kind = e.target.value as TableKind
                  setNewTableForm((prev) => ({
                    ...prev,
                    kind,
                    name: prev.name.trim() === '' ? kindLabel(kind) : prev.name,
                  }))
                }}
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="table">{kindLabel('table')}</option>
                {LANDMARK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabel(kind)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.floorPlan.fields.name')}
              </span>
              <input
                required
                value={newTableForm.name}
                onChange={(e) => setNewTableForm({ ...newTableForm, name: e.target.value })}
                className="w-full rounded-lg border border-cream px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-lavender-dark">
                {t('adminTabs.floorPlan.fields.shape')}
              </span>
              <select
                value={newTableForm.shape}
                onChange={(e) =>
                  setNewTableForm({ ...newTableForm, shape: e.target.value as TableShape })
                }
                className="w-full rounded-lg border border-cream px-3 py-2"
              >
                <option value="circle">{t('adminTabs.floorPlan.shapeCircle')}</option>
                <option value="rect">{t('adminTabs.floorPlan.shapeRect')}</option>
              </select>
            </label>
            {newTableForm.kind === 'table' && (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-lavender-dark">
                  {t('adminTabs.floorPlan.fields.capacity')}
                </span>
                <input
                  type="number"
                  min={1}
                  value={newTableForm.capacity}
                  onChange={(e) => setNewTableForm({ ...newTableForm, capacity: e.target.value })}
                  className="w-full rounded-lg border border-cream px-3 py-2"
                />
              </label>
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
                onClick={() => setNewTableOpen(false)}
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

export { DEFAULT_SIZE }
