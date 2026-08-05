import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  es: {
    translation: {
      header: {
        menu: 'Menú',
        location: 'Ubicación',
        login: 'Ingresa',
      },
      hero: {
        tagline:
          'Café de especialidad, 100% vegano — porque ser valientes también es cuidar a los animales. Cada taza, hecha con calma, para quienes se atreven a disfrutar sin dejar a nadie atrás.',
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
      footer: {
        text: 'Hecho con ♥ · Valiente Café',
      },
      menuPage: {
        heading: 'Menú completo',
        comingSoon: 'Muy pronto vas a poder ver acá todo nuestro menú.',
        back: 'Volver al inicio',
      },
    },
  },
  en: {
    translation: {
      header: {
        menu: 'Menu',
        location: 'Location',
        login: 'Log in',
      },
      hero: {
        tagline:
          'Specialty coffee, 100% vegan — because being brave also means caring for animals. Every cup, made unhurried, for those who dare to enjoy it without leaving anyone behind.',
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
      footer: {
        text: 'Made with ♥ · Valiente Café',
      },
      menuPage: {
        heading: 'Full menu',
        comingSoon: "Our full menu will be available here soon.",
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
