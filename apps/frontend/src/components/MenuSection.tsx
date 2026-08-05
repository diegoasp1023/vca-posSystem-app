import { menuItems } from '../data/menu'
import { MenuCard } from './MenuCard'

export function MenuSection() {
  return (
    <section id="menu" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl text-lavender-dark">
          Nuestro menú
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((product) => (
            <MenuCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
