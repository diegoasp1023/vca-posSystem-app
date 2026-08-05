import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  es: {
    translation: {
      header: {
        home: 'Inicio',
        menu: 'Menú',
        about: 'Nosotros',
        contact: 'Contacto',
        location: 'Ubicación',
        login: 'Ingresa',
      },
      hero: {
        tagline:
          'Café de especialidad, 100% vegano. Porque la valentía de cambiar el mundo empieza con decisiones conscientes. Cada taza, servida con la calma y el respeto que todos merecemos.',
        cta: 'Ver el menú',
      },
      menu: {
        heading: 'Nuestros cafés de especialidad',
        note: 'Pídelo en la presentación que prefieras: molido, en grano, o como más te guste disfrutarlo.',
        presentations: 'Presentaciones',
      },
      location: {
        heading: 'Ubicación y horario',
        mapPlaceholder: 'Mapa próximamente',
        hours: {
          weekdays: 'Lunes a sábado',
          sunday: 'Domingo',
        },
      },
      courses: {
        heading: 'Nuestros cursos y talleres',
        moreInfo: 'Más información',
      },
      coursePage: {
        objectives: 'Objetivos',
        content: 'Contenido del curso',
        duration: 'Duración',
        cost: 'Costo',
        methods: 'Métodos de pago',
        back: 'Volver al inicio',
        notFound: 'No encontramos este curso.',
      },
      footer: {
        text: 'Hecho con ♥ · Valiente Café',
      },
      menuPage: {
        heading: 'Menú completo',
        comingSoon: 'Muy pronto vas a poder ver acá todo nuestro menú.',
        back: 'Volver al inicio',
      },
      aboutPage: {
        heading: 'Nosotros',
        comingSoon: 'Muy pronto vas a poder conocer más sobre nosotros acá.',
        back: 'Volver al inicio',
      },
      contactPage: {
        heading: 'Contacto',
        comingSoon: 'Muy pronto vas a poder contactarnos acá.',
        back: 'Volver al inicio',
      },
    },
  },
  en: {
    translation: {
      header: {
        home: 'Home',
        menu: 'Menu',
        about: 'About',
        contact: 'Contact',
        location: 'Location',
        login: 'Log in',
      },
      hero: {
        tagline:
          'Specialty coffee, 100% vegan. Courage to change the world starts with conscious choices. Every cup, crafted with the patience and respect we all deserve.',
        cta: 'See the menu',
      },
      menu: {
        heading: 'Our specialty coffees',
        note: 'Order it however you like: ground, whole bean, or your favorite way to enjoy it.',
        presentations: 'Available as',
      },
      location: {
        heading: 'Location & hours',
        mapPlaceholder: 'Map coming soon',
        hours: {
          weekdays: 'Monday to Saturday',
          sunday: 'Sunday',
        },
      },
      courses: {
        heading: 'Our Courses & Workshops',
        moreInfo: 'Learn more',
      },
      coursePage: {
        objectives: 'Objectives',
        content: 'Course content',
        duration: 'Duration',
        cost: 'Cost',
        methods: 'Payment methods',
        back: 'Back to home',
        notFound: "We couldn't find this course.",
      },
      footer: {
        text: 'Made with ♥ · Valiente Café',
      },
      menuPage: {
        heading: 'Full menu',
        comingSoon: "Our full menu will be available here soon.",
        back: 'Back to home',
      },
      aboutPage: {
        heading: 'About us',
        comingSoon: "You'll be able to learn more about us here soon.",
        back: 'Back to home',
      },
      contactPage: {
        heading: 'Contact',
        comingSoon: "You'll be able to reach us here soon.",
        back: 'Back to home',
      },
    },
  },
} as const

i18n.use(initReactI18next).init({
  resources,
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
