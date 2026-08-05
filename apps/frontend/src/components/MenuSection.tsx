import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchProducts, type Product } from '../lib/api'
import { MenuCard } from './MenuCard'

export function MenuSection() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    fetchProducts(1)
      .then((page) => {
        if (!cancelled) {
          setProducts(page.items)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

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
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <MenuCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
