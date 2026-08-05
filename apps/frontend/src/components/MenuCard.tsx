import type { Product } from '../data/menu'

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function MenuCard({ product }: { product: Product }) {
  return (
    <div className="rounded-2xl border border-cream bg-white p-6 text-left shadow-sm transition hover:shadow-md">
      <h3 className="text-lg font-semibold text-lavender-dark">
        {product.name}
      </h3>
      <p className="mt-2 text-sm text-gray-600">{product.description}</p>
      <p className="mt-4 font-semibold text-coral-dark">
        {priceFormatter.format(product.price)}
      </p>
    </div>
  )
}
