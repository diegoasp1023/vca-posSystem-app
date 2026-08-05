import { useTranslation } from 'react-i18next'
import type { Product } from '../data/menu'

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function MenuCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'es'

  return (
    <div className="rounded-2xl border border-cream bg-white p-6 text-left shadow-sm transition hover:shadow-md">
      <h3 className="text-lg font-semibold text-lavender-dark">
        {product.name[lang]} · {product.weight}
      </h3>
      <p className="mt-2 text-sm text-gray-600">{product.description[lang]}</p>

      <p className="mt-3 text-xs font-semibold tracking-wide text-lavender uppercase">
        {t('menu.presentations')}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {product.presentations[lang].map((presentation) => (
          <span
            key={presentation}
            className="rounded-full bg-cream px-3 py-1 text-xs font-medium text-lavender-dark"
          >
            {presentation}
          </span>
        ))}
      </div>

      <p className="mt-4 font-semibold text-coral-dark">
        {priceFormatter.format(product.price)}
      </p>
    </div>
  )
}
