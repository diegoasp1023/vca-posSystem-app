import cursoBarismo from '../assets/curso-barismo.jpg'
import cursoLatteArt from '../assets/curso-latte-art.jpg'
import cursoExtraccion from '../assets/curso-extraccion.jpg'
import cursoAficionados from '../assets/curso-aficionados.jpg'

type Localized<T> = { es: T; en: T }

export interface Course {
  slug: string
  image: string
  title: Localized<string>
  tagline: Localized<string>
  objectives: Localized<string[]>
  content: Localized<{ module: string; duration: string }[]>
  duration: Localized<string>
  cost: Localized<string[]>
  methods: Localized<string[]>
}

const paymentMethods: Localized<string[]> = {
  es: [
    'Consignación a cuenta de ahorros Bancolombia',
    'Tarjeta de crédito o débito',
    'Nequi',
    'Daviplata',
    'Pago 100% por adelantado al inscribirte',
  ],
  en: [
    'Bank transfer (Bancolombia savings account)',
    'Credit or debit card',
    'Nequi',
    'Daviplata',
    '100% payment required upon enrollment',
  ],
}

// Placeholder/reference data based on the courses currently offered at
// valientecafe.co/cursos — adjust prices, dates and copy before launch.
export const courses: Course[] = [
  {
    slug: 'fundamentos-de-barismo',
    image: cursoBarismo,
    title: { es: 'Fundamentos de Barismo', en: 'Barista Fundamentals' },
    tagline: {
      es: 'Un viaje de la semilla a la taza',
      en: 'A journey from seed to cup',
    },
    objectives: {
      es: [
        'Brindar las bases fundamentales sobre el café y sus elementos de preparación',
        'Explorar el origen del cultivo y los métodos de procesamiento post-cosecha',
        'Dominar la historia, técnica y estándares de calidad del espresso',
        'Desarrollar habilidades para preparar bebidas a base de espresso y leche vaporizada',
        'Aprender a preparar bebidas frías a base de espresso',
      ],
      en: [
        'Provide the essential foundations of coffee and its preparation elements',
        'Explore the origins of cultivation and post-harvest processing methods',
        'Master the history, technique and quality standards of espresso',
        'Develop skills to prepare espresso-based and steamed milk beverages',
        'Learn to prepare cold espresso-based drinks',
      ],
    },
    content: {
      es: [
        { module: 'Aspectos generales (definiciones, cata)', duration: '3h' },
        { module: 'Factores de calidad en el procesamiento', duration: '3h' },
        { module: 'Sistemas de espresso', duration: '3h' },
        { module: 'Bebidas a base de leche', duration: '4h' },
      ],
      en: [
        { module: 'General aspects (definitions, tasting)', duration: '3h' },
        { module: 'Quality factors in processing', duration: '3h' },
        { module: 'Espresso systems', duration: '3h' },
        { module: 'Milk-based beverages', duration: '4h' },
      ],
    },
    duration: {
      es: '12 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.',
      en: '12 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.',
    },
    cost: {
      es: [
        'Grupal (máx. 6 personas): $800.000 COP por persona',
        'Personalizada: $1.100.000 COP por persona',
        'Ambas incluyen materiales y certificado de asistencia',
      ],
      en: [
        'Group (max. 6 people): $800,000 COP per person',
        'Personalized: $1,100,000 COP per person',
        'Both include materials and a completion certificate',
      ],
    },
    methods: paymentMethods,
  },
  {
    slug: 'taller-de-latte-art',
    image: cursoLatteArt,
    title: { es: 'Taller de Latte Art', en: 'Latte Art Workshop' },
    tagline: {
      es: 'Explorando el arte de decorar los cafés',
      en: 'Exploring the art of decorating coffee',
    },
    objectives: {
      es: [
        'Introducir la historia y evolución del latte art',
        'Dominar la técnica de vertido libre (free pouring)',
        'Aprender la técnica de etching (decorado con aguja)',
        'Practicar texturización avanzada de leche, incluidas bebidas vegetales',
      ],
      en: [
        'Introduce the history and evolution of latte art',
        'Master the free pouring technique',
        'Learn the etching (needle decoration) technique',
        'Practice advanced milk texturizing, including plant-based milks',
      ],
    },
    content: {
      es: [
        { module: 'Conceptos avanzados de espresso', duration: '2h' },
        { module: 'Introducción al latte art', duration: '30min' },
        { module: 'Técnica de jarra y taza', duration: '30min' },
        { module: 'Texturización de leche', duration: '1.5h' },
        { module: 'Taller de coreografía', duration: '1.5h' },
        { module: 'Diseño cabeza de monje y corazón', duration: '3h' },
        { module: 'Diseño tulipán y rosetta', duration: '3h' },
      ],
      en: [
        { module: 'Advanced espresso concepts', duration: '2h' },
        { module: 'Introduction to latte art', duration: '30min' },
        { module: 'Jug and cup technique', duration: '30min' },
        { module: 'Milk texturizing', duration: '1.5h' },
        { module: 'Choreography workshop', duration: '1.5h' },
        { module: 'Monk head and heart design', duration: '3h' },
        { module: 'Tulip and rosetta patterns', duration: '3h' },
      ],
    },
    duration: {
      es: '12 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.',
      en: '12 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.',
    },
    cost: {
      es: [
        'Grupal (máx. 6 personas): $800.000 COP por persona',
        'Personalizada: $1.100.000 COP por persona',
        'Ambas incluyen materiales y certificado de asistencia',
      ],
      en: [
        'Group (max. 6 people): $800,000 COP per person',
        'Personalized: $1,100,000 COP per person',
        'Both include materials and a completion certificate',
      ],
    },
    methods: paymentMethods,
  },
  {
    slug: 'taller-de-metodos-de-extraccion',
    image: cursoExtraccion,
    title: {
      es: 'Taller de métodos de extracción',
      en: 'Extraction Methods Workshop',
    },
    tagline: {
      es: 'La nueva tendencia del café: resaltar sus atributos naturales',
      en: 'The new coffee trend: highlighting its natural attributes',
    },
    objectives: {
      es: [
        'Comprender los conceptos esenciales de extracción y la diferenciación del café de especialidad',
        'Conocer las bases de preparación en métodos alternativos',
        'Identificar las variables que afectan las características de la bebida final',
      ],
      en: [
        'Understand essential extraction concepts and specialty coffee differentiation',
        'Learn the basics of preparation with alternative brewing methods',
        'Identify the variables that affect the characteristics of the final drink',
      ],
    },
    content: {
      es: [
        { module: 'Introducción a la extracción', duration: '2h' },
        { module: 'Taller de variables de extracción', duration: '2h' },
        { module: 'Taller de proceso de extracción', duration: '1h' },
        { module: 'Preparación en prensa francesa', duration: '1h' },
        { module: 'Preparación en sifón', duration: '1h' },
        { module: 'Preparación en Chemex', duration: '1h' },
        { module: 'Preparación en V60 y Origami', duration: '1h' },
        { module: 'Preparación en Aeropress', duration: '1h' },
      ],
      en: [
        { module: 'Introduction to extraction', duration: '2h' },
        { module: 'Extraction variables workshop', duration: '2h' },
        { module: 'Extraction process workshop', duration: '1h' },
        { module: 'French press preparation', duration: '1h' },
        { module: 'Syphon preparation', duration: '1h' },
        { module: 'Chemex preparation', duration: '1h' },
        { module: 'V60 and Origami dripper preparation', duration: '1h' },
        { module: 'Aeropress preparation', duration: '1h' },
      ],
    },
    duration: {
      es: '10 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.',
      en: '10 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.',
    },
    cost: {
      es: [
        'Grupal (máx. 6 personas): $800.000 COP por persona',
        'Personalizada: $1.100.000 COP por persona',
        'Ambas incluyen materiales y certificado de asistencia',
      ],
      en: [
        'Group (max. 6 people): $800,000 COP per person',
        'Personalized: $1,100,000 COP per person',
        'Both include materials and a completion certificate',
      ],
    },
    methods: paymentMethods,
  },
  {
    slug: 'taller-de-preparacion-para-aficionados',
    image: cursoAficionados,
    title: {
      es: 'Taller de preparación para aficionados',
      en: "Enthusiasts' Preparation Workshop",
    },
    tagline: {
      es: 'Las técnicas modernas de preparación y decoración con cafés de alta calidad',
      en: 'Modern brewing and decoration techniques using premium coffee',
    },
    objectives: {
      es: [
        'Comprender la calidad, manejo y preparación del café y sus equipos esenciales',
        'Dominar técnicas de preparación filtrada: prensa francesa, moka, V60 y aeropress',
        'Aprender el manejo de la máquina de espresso para bebidas frías y calientes',
        'Preparar y decorar bebidas a base de espresso con leches vegetales texturizadas',
      ],
      en: [
        'Understand coffee quality, handling, preparation and essential equipment',
        'Master filtered brewing: French press, moka pot, V60 and Aeropress',
        'Learn to operate the espresso machine for hot and cold drinks',
        'Prepare and decorate espresso-based drinks with textured plant-based milk',
      ],
    },
    content: {
      es: [
        {
          module: 'Fundamentos del café (calidad, cata comparativa)',
          duration: '3h',
        },
        { module: 'Taller de métodos de preparación', duration: '3h' },
        { module: 'Sistemas de espresso y bebidas vegetales', duration: '3h' },
      ],
      en: [
        {
          module: 'Coffee fundamentals (quality, comparative tasting)',
          duration: '3h',
        },
        { module: 'Brewing methods workshop', duration: '3h' },
        { module: 'Espresso systems and plant-based drinks', duration: '3h' },
      ],
    },
    duration: {
      es: '9 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.',
      en: '9 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.',
    },
    cost: {
      es: [
        'Grupal (máx. 6 personas): $600.000 COP por persona',
        'Personalizada: $800.000 COP por persona',
        'Ambas incluyen materiales y certificado de asistencia',
      ],
      en: [
        'Group (max. 6 people): $600,000 COP per person',
        'Personalized: $800,000 COP per person',
        'Both include materials and a completion certificate',
      ],
    },
    methods: paymentMethods,
  },
]
