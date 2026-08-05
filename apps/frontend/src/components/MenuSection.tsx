import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchProducts, type Product } from '../lib/api'
import { MenuCard } from './MenuCard'
import { Pagination } from './Pagination'

const CARD_WIDTH = 300
const GAP = 24

/** 1–3 items: one row of that size. 4: 2x2. 5–6: rows of 3, centered. */
function columnsForCount(count: number): number {
  if (count <= 3) return Math.max(count, 1)
  if (count === 4) return 2
  return 3
}

export function MenuSection() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    fetchProducts(page)
      .then((result) => {
        if (!cancelled) {
          setProducts(result.items)
          setTotalPages(result.total_pages)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [page])

  const columns = columnsForCount(products.length)

  return (
    <section id="menu" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl text-lavender-dark">
          {t('menu.heading')}
        </h2>
        <p className="mt-3 text-center text-gray-600">{t('menu.note')}</p>

        {status === 'loading' && (
          <p className="mt-10 text-center text-gray-500">{t('common.loading')}</p>
        )}
        {status === 'error' && (
          <p className="mt-10 text-center text-gray-500">{t('common.error')}</p>
        )}
        {status === 'ready' && (
          <>
            <div
              className="mx-auto mt-10 flex flex-wrap justify-center gap-6"
              style={{ maxWidth: columns * CARD_WIDTH + (columns - 1) * GAP }}
            >
              {products.map((product) => (
                <div key={product.id} className="w-full" style={{ maxWidth: CARD_WIDTH }}>
                  <MenuCard product={product} />
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  )
}
