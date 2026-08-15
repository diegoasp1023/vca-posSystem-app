import { useTranslation } from 'react-i18next'

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
}) {
  const { t } = useTranslation()

  if (totalPages <= 1 && !pageSize) return null

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
      {pageSize !== undefined && onPageSizeChange && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('pagination.pageSize')}
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-cream px-2 py-1"
          >
            {(pageSizeOptions ?? [20, 50, 100]).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}

      {totalPages > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-full border border-lavender px-4 py-2 text-sm font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-lavender-dark"
          >
            {t('pagination.previous')}
          </button>
          <span className="text-sm text-gray-600">
            {t('pagination.pageOf', { page, totalPages })}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-full border border-lavender px-4 py-2 text-sm font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-lavender-dark"
          >
            {t('pagination.next')}
          </button>
        </>
      )}
    </div>
  )
}
