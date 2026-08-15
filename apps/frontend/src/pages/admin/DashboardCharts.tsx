import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExpand } from '@fortawesome/free-solid-svg-icons'
import { downloadCsv } from '../../lib/csv'
import { Modal } from './Modal'
import type {
  DashboardBusyHourPoint,
  DashboardPaymentMethodBreakdown,
  DashboardSalesSummary,
  DashboardTopProduct,
} from '../../lib/adminApi'

type View = 'chart' | 'table'

function money(value: number) {
  return `$${value.toLocaleString('es-CO')}`
}

function DataCard({
  title,
  chart,
  table,
  hasData,
  onExportCsv,
}: {
  title: string
  chart: React.ReactNode
  table: React.ReactNode
  hasData: boolean
  onExportCsv: () => void
}) {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('chart')
  const [expanded, setExpanded] = useState(false)

  const content = hasData ? (view === 'chart' ? chart : table) : <EmptyState />

  return (
    <div className="rounded-2xl border border-cream bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-lavender-dark">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
            className="rounded-full border border-lavender px-3 py-1 text-xs font-semibold text-lavender-dark transition hover:bg-cream"
          >
            {view === 'chart' ? t('admin.dashboard.viewTable') : t('admin.dashboard.viewChart')}
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!hasData}
            className="rounded-full border border-lavender px-3 py-1 text-xs font-semibold text-lavender-dark transition hover:bg-cream disabled:opacity-50"
          >
            {t('admin.exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={!hasData}
            aria-label={t('admin.dashboard.expand')}
            className="rounded-full border border-lavender px-2.5 py-1.5 text-xs font-semibold text-lavender-dark transition hover:bg-cream disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faExpand} className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-4 h-64 overflow-auto">{content}</div>

      {expanded && (
        <Modal title={title} onClose={() => setExpanded(false)} maxWidthClassName="max-w-4xl">
          <div className="h-[65vh] overflow-auto">{content}</div>
        </Modal>
      )}
    </div>
  )
}

export function SalesChart({ sales }: { sales: DashboardSalesSummary }) {
  const { t } = useTranslation()
  const rows = sales.daily_series

  return (
    <DataCard
      title={t('admin.dashboard.salesChartTitle')}
      hasData={rows.length > 0}
      onExportCsv={() =>
        downloadCsv(
          'ventas-por-dia.csv',
          [t('admin.dashboard.tableDate'), t('admin.dashboard.tooltipRevenue'), t('admin.dashboard.tableTabsCount')],
          rows.map((r) => [r.date, r.revenue_cop, r.tabs_count]),
        )
      }
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f7f5f2" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} width={48} />
            <Tooltip
              formatter={(value) => [money(Number(value)), t('admin.dashboard.tooltipRevenue')]}
            />
            <Line
              type="monotone"
              dataKey="revenue_cop"
              stroke="#e8836a"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      }
      table={
        <SimpleTable
          headers={[t('admin.dashboard.tableDate'), t('admin.dashboard.tooltipRevenue'), t('admin.dashboard.tableTabsCount')]}
          rows={rows.map((r) => [r.date, money(r.revenue_cop), r.tabs_count])}
        />
      }
    />
  )
}

export function TopProductsChart({ products }: { products: DashboardTopProduct[] }) {
  const { t } = useTranslation()
  const data = products.map((p) => ({ name: p.name.es, quantity: p.quantity, revenue_cop: p.revenue_cop }))

  return (
    <DataCard
      title={t('admin.dashboard.topProductsChartTitle')}
      hasData={data.length > 0}
      onExportCsv={() =>
        downloadCsv(
          'productos-mas-vendidos.csv',
          [t('admin.dashboard.tableProduct'), t('admin.dashboard.tooltipQuantity'), t('admin.dashboard.tooltipRevenue')],
          data.map((d) => [d.name, d.quantity, d.revenue_cop]),
        )
      }
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f7f5f2" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip formatter={(value) => [value, t('admin.dashboard.tooltipQuantity')]} />
            <Bar dataKey="quantity" fill="#7b7fc4" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <SimpleTable
          headers={[t('admin.dashboard.tableProduct'), t('admin.dashboard.tooltipQuantity'), t('admin.dashboard.tooltipRevenue')]}
          rows={data.map((d) => [d.name, d.quantity, money(d.revenue_cop)])}
        />
      }
    />
  )
}

export function PaymentMethodsChart({
  methods,
}: {
  methods: DashboardPaymentMethodBreakdown[]
}) {
  const { t } = useTranslation()

  return (
    <DataCard
      title={t('admin.dashboard.paymentMethodsChartTitle')}
      hasData={methods.length > 0}
      onExportCsv={() =>
        downloadCsv(
          'metodos-de-pago.csv',
          [
            t('admin.dashboard.tableMethod'),
            t('admin.dashboard.tooltipRevenue'),
            t('admin.dashboard.tableTips'),
            t('admin.dashboard.tableTabsCount'),
          ],
          methods.map((m) => [m.name, m.revenue_cop, m.tips_cop, m.tabs_count]),
        )
      }
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={methods} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f7f5f2" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip
              formatter={(value) => [money(Number(value)), t('admin.dashboard.tooltipRevenue')]}
            />
            <Bar dataKey="revenue_cop" fill="#e8836a" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <SimpleTable
          headers={[
            t('admin.dashboard.tableMethod'),
            t('admin.dashboard.tooltipRevenue'),
            t('admin.dashboard.tableTips'),
            t('admin.dashboard.tableTabsCount'),
          ]}
          rows={methods.map((m) => [m.name, money(m.revenue_cop), money(m.tips_cop), m.tabs_count])}
        />
      }
    />
  )
}

export function BusyHoursChart({ hours }: { hours: DashboardBusyHourPoint[] }) {
  const { t } = useTranslation()
  const data = hours.map((h) => ({ hour: `${h.hour}:00`, count: h.tabs_opened_count }))

  return (
    <DataCard
      title={t('admin.dashboard.busyHoursChartTitle')}
      hasData={data.length > 0}
      onExportCsv={() =>
        downloadCsv(
          'horas-mas-concurridas.csv',
          [t('admin.dashboard.tableHour'), t('admin.dashboard.tooltipTabsOpened')],
          data.map((d) => [d.hour, d.count]),
        )
      }
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f7f5f2" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
            <Tooltip formatter={(value) => [value, t('admin.dashboard.tooltipTabsOpened')]} />
            <Bar dataKey="count" fill="#4c9a8b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      }
      table={
        <SimpleTable
          headers={[t('admin.dashboard.tableHour'), t('admin.dashboard.tooltipTabsOpened')]}
          rows={data.map((d) => [d.hour, d.count])}
        />
      }
    />
  )
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-cream text-lavender">
          {headers.map((header) => (
            <th key={header} className="py-2 pr-4">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={index} className="border-b border-cream">
            {row.map((cell, cellIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <td key={cellIndex} className="py-2 pr-4">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      {t('admin.dashboard.noData')}
    </div>
  )
}
