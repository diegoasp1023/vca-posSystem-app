import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp } from '@fortawesome/free-solid-svg-icons'
import foxLogo from '../assets/fox-logo.svg'
import { fetchMenuCategories, fetchMenuItems, type MenuCategory, type MenuItem } from '../lib/api'

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const SCROLL_TOP_THRESHOLD = 400

export function MenuPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'es'

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all')
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    Promise.all([fetchMenuCategories(), fetchMenuItems()])
      .then(([categoriesResult, itemsResult]) => {
        if (cancelled) return
        setCategories(categoriesResult)
        setItems(itemsResult)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > SCROLL_TOP_THRESHOLD)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const itemsByCategory = useMemo(() => {
    const map = new Map<number, MenuItem[]>()
    for (const item of items) {
      const list = map.get(item.category_id)
      if (list) {
        list.push(item)
      } else {
        map.set(item.category_id, [item])
      }
    }
    return map
  }, [items])

  const categoriesWithItems = categories.filter(
    (category) => (itemsByCategory.get(category.id)?.length ?? 0) > 0,
  )
  const visibleCategories =
    selectedCategoryId === 'all'
      ? categoriesWithItems
      : categoriesWithItems.filter((category) => category.id === selectedCategoryId)

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      <section className="bg-gradient-to-b from-cream to-white px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <img src={foxLogo} alt="Valiente Café" className="mx-auto h-20 w-20" />
          <h1 className="mt-6 font-serif text-5xl text-lavender-dark">
            {t('menuPage.heading')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{t('menuPage.intro')}</p>
        </div>
      </section>

      {status === 'loading' && (
        <p className="px-6 py-16 text-center text-gray-500">{t('common.loading')}</p>
      )}
      {status === 'error' && (
        <p className="px-6 py-16 text-center text-gray-500">{t('common.error')}</p>
      )}

      {status === 'ready' && (
        <div className="mx-auto max-w-4xl px-6 pb-24">
          {categoriesWithItems.length === 0 ? (
            <p className="mt-16 text-center text-gray-500">{t('menuPage.empty')}</p>
          ) : (
            <>
              <nav className="mt-10 flex flex-wrap justify-center gap-2">
                <CategoryPill
                  active={selectedCategoryId === 'all'}
                  onClick={() => setSelectedCategoryId('all')}
                >
                  {t('menuPage.allCategories')}
                </CategoryPill>
                {categoriesWithItems.map((category) => (
                  <CategoryPill
                    key={category.id}
                    active={selectedCategoryId === category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    {category.name[lang]}
                  </CategoryPill>
                ))}
              </nav>

              <div className="mt-12 space-y-16">
                {visibleCategories.map((category) => (
                  <section key={category.id}>
                    <h2 className="border-b border-cream pb-3 font-serif text-3xl text-lavender-dark">
                      {category.name[lang]}
                    </h2>
                    <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                      {(itemsByCategory.get(category.id) ?? []).map((item) => (
                        <MenuItemRow key={item.id} item={item} lang={lang} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          <div className="mt-20 text-center">
            <Link
              to="/"
              className="inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
            >
              {t('menuPage.back')}
            </Link>
          </div>
        </div>
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={t('menuPage.backToTop')}
          title={t('menuPage.backToTop')}
          className="fixed right-6 bottom-6 flex h-11 w-11 items-center justify-center rounded-full bg-lavender-dark text-white shadow-lg transition hover:bg-lavender"
        >
          <FontAwesomeIcon icon={faChevronUp} className="h-4 w-4" />
        </button>
      )}
    </>
  )
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? 'border-lavender-dark bg-lavender-dark text-white'
          : 'border-lavender text-lavender-dark hover:bg-lavender hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function MenuItemRow({ item, lang }: { item: MenuItem; lang: 'es' | 'en' }) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-gray-800">{item.name[lang]}</span>
        <span className="flex-1 translate-y-[-3px] border-b border-dotted border-gray-300" />
        {item.price_cop !== null ? (
          <span className="shrink-0 font-semibold text-coral-dark">
            {priceFormatter.format(item.price_cop)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-cream px-3 py-0.5 text-xs font-semibold whitespace-nowrap text-lavender-dark">
            {t('menuPage.askUs')}
          </span>
        )}
      </div>
      {item.description && (
        <p className="mt-1 text-sm text-gray-500 italic">{item.description[lang]}</p>
      )}
    </div>
  )
}
