type Localized<T> = { es: T; en: T }

export interface Product {
  id: string
  name: Localized<string>
  description: Localized<string>
  weight: string
  price: number
  presentations: Localized<string[]>
}

// Placeholder data. Once the backend exposes a products endpoint, this
// export should be replaced by a fetch call — components that consume
// Product[] don't need to change.
export const menuItems: Product[] = [
  {
    id: 'lavado',
    name: { es: 'Café Lavado', en: 'Washed Coffee' },
    description: {
      es: 'Proceso lavado, notas dulces y acidez brillante.',
      en: 'Washed process, sweet notes and bright acidity.',
    },
    weight: '500gr',
    price: 47000,
    presentations: {
      es: ['Molido', 'En grano'],
      en: ['Ground', 'Whole bean'],
    },
  },
  {
    id: 'natural',
    name: { es: 'Café Natural', en: 'Natural Coffee' },
    description: {
      es: 'Secado natural, cuerpo intenso y notas frutales.',
      en: 'Natural drying, full body and fruity notes.',
    },
    weight: '340gr',
    price: 42000,
    presentations: {
      es: ['Molido', 'En grano'],
      en: ['Ground', 'Whole bean'],
    },
  },
  {
    id: 'honey',
    name: { es: 'Café Honey', en: 'Honey Coffee' },
    description: {
      es: 'Proceso honey, dulzor equilibrado y final limpio.',
      en: 'Honey process, balanced sweetness and clean finish.',
    },
    weight: '340gr',
    price: 45000,
    presentations: {
      es: ['Molido', 'En grano'],
      en: ['Ground', 'Whole bean'],
    },
  },
  {
    id: 'descafeinado',
    name: { es: 'Descafeinado', en: 'Decaf' },
    description: {
      es: 'Todo el sabor, sin cafeína.',
      en: 'All the flavor, without the caffeine.',
    },
    weight: '340gr',
    price: 46000,
    presentations: {
      es: ['Molido', 'En grano'],
      en: ['Ground', 'Whole bean'],
    },
  },
]
