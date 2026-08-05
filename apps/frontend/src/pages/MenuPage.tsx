import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchProducts, type Product } from '../lib/api'
import { MenuCard } from '../components/MenuCard'
import { Pagination } from '../components/Pagination'

export function MenuPage() {
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

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center font-serif text-4xl text-lavender-dark">
          {t('menuPage.heading')}
        </h1>

        {status === 'loading' && (
          <p className="mt-10 text-center text-gray-500">{t('common.loading')}</p>
        )}
        {status === 'error' && (
          <p className="mt-10 text-center text-gray-500">{t('common.error')}</p>
        )}
        {status === 'ready' && (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <MenuCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  )
}
