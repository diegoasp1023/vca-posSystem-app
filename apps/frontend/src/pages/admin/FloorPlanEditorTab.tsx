import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  createTable,
  deleteTable,
  fetchTables,
  fetchTabs,
  updateTable,
  type Tab,
  type Table as FloorTable,
  type TableKind,
  type TableShape,
} from '../../lib/adminApi'
import { DEFAULT_SIZE, FloorPlan } from './FloorPlan'

export function FloorPlanEditorTab() {
  const { t } = useTranslation()
  const { getToken } = useAuth()

  const [rawTables, setRawTables] = useState<FloorTable[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  const reload = useCallback(() => {
    setStatus('loading')
    getToken()
      .then((token) => Promise.all([fetchTables(token), fetchTabs(token)]))
      .then(([tableResult, tabResult]) => {
        setRawTables(tableResult)
        setTabs(tabResult)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [getToken])

  useEffect(reload, [reload])

  const tables = useMemo(() => {
    const openByTable = new Map<number, Tab>()
    for (const tab of tabs) {
      if (tab.status === 'open' && tab.table) openByTable.set(tab.table.id, tab)
    }
    return rawTables.map((table) => {
      const openTab = openByTable.get(table.id)
      return {
        ...table,
        open_tab: openTab
          ? { tab_id: openTab.id, total_cop: openTab.total_cop, opened_at: openTab.opened_at }
          : null,
      }
    })
  }, [rawTables, tabs])

  const handleCreateTable = async (data: {
    name: string
    kind: TableKind
    shape: TableShape
    capacity: number | null
  }) => {
    const token = await getToken()
    const size = DEFAULT_SIZE[data.shape]
    const table = await createTable(token, {
      name: data.name,
      kind: data.kind,
      shape: data.shape,
      pos_x: 40,
      pos_y: 40,
      width: size.width,
      height: size.height,
      capacity: data.capacity,
    })
    setRawTables((prev) => [...prev, table])
  }

  const handleMoveTable = async (tableId: number, pos_x: number, pos_y: number) => {
    const existing = rawTables.find((t) => t.id === tableId)
    if (!existing) return
    const token = await getToken()
    const updated = await updateTable(token, tableId, {
      name: existing.name,
      kind: existing.kind,
      shape: existing.shape,
      pos_x,
      pos_y,
      width: existing.width,
      height: existing.height,
      capacity: existing.capacity,
    })
    setRawTables((prev) => prev.map((t) => (t.id === tableId ? updated : t)))
  }

  const handleDeleteTable = async (tableId: number) => {
    if (!window.confirm(t('admin.confirmDelete'))) return
    const token = await getToken()
    try {
      await deleteTable(token, tableId)
      setRawTables((prev) => prev.filter((t) => t.id !== tableId))
    } catch {
      window.alert(t('adminTabs.floorPlan.deleteOccupiedError'))
    }
  }

  return (
    <div className="mt-6">
      {status === 'loading' && <p className="mt-10 text-gray-500">{t('common.loading')}</p>}
      {status === 'error' && <p className="mt-10 text-gray-500">{t('common.error')}</p>}
      {status === 'ready' && (
        <FloorPlan
          tables={tables}
          editable
          onCreateTable={handleCreateTable}
          onMoveTable={handleMoveTable}
          onDeleteTable={handleDeleteTable}
        />
      )}
    </div>
  )
}
