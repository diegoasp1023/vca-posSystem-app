import { useTranslation } from 'react-i18next'
import { menuItems } from '../data/menu'
import { MenuCard } from './MenuCard'

export function MenuSection() {
  const { t } = useTranslation()

  return (
    <section id="menu" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl text-lavender-dark">
          {t('menu.heading')}
        </h2>
        <p className="mt-3 text-center text-gray-600">{t('menu.note')}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((product) => (
            <MenuCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
