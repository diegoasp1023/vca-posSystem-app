export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: 'bebida' | 'comida'
}

// Placeholder data. Once the backend exposes a products endpoint, this
// export should be replaced by a fetch call — components that consume
// Product[] don't need to change.
export const menuItems: Product[] = [
  {
    id: 'espresso',
    name: 'Espresso',
    description: 'Café solo, extracción clásica de origen colombiano.',
    price: 6000,
    category: 'bebida',
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    description: 'Espresso con leche vaporizada y espuma cremosa.',
    price: 9000,
    category: 'bebida',
  },
  {
    id: 'latte-art',
    name: 'Latte',
    description: 'Espresso suave con leche vaporizada, ideal para latte art.',
    price: 9500,
    category: 'bebida',
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: 'Extracción en frío, notas dulces y baja acidez.',
    price: 10000,
    category: 'bebida',
  },
  {
    id: 'croissant',
    name: 'Croissant',
    description: 'Croissant de mantequilla horneado en el local.',
    price: 8000,
    category: 'comida',
  },
  {
    id: 'torta-chocolate',
    name: 'Torta de chocolate',
    description: 'Porción de torta húmeda de chocolate.',
    price: 12000,
    category: 'comida',
  },
]
