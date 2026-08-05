import { useTranslation } from 'react-i18next'

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <div className="mt-10 flex items-center justify-center gap-4">
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
    </div>
  )
}
