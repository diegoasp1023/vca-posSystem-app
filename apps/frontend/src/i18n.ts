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
        login: 'Ingresa',
        admin: 'Panel',
      },
      hero: {
        tagline:
          'Café de especialidad, 100% vegano. Porque la valentía de cambiar el mundo empieza con decisiones conscientes. Cada taza, servida con la calma y el respeto que todos merecemos.',
        cta: 'Ver nuestros cafés',
        contactCta: 'Contáctanos',
      },
      menu: {
        heading: 'Nuestros cafés de especialidad',
        note: 'Pídelo en la presentación que prefieras.',
        presentations: 'Presentaciones',
      },
      location: {
        heading: 'Ubicación y horario',
        hours: {
          weekdays: 'Lunes a viernes',
          saturday: 'Sábados',
          sundayHolidays: 'Domingos y festivos',
        },
      },
      courses: {
        heading: 'Nuestros cursos y talleres',
        moreInfo: 'Más información',
      },
      pagination: {
        previous: 'Anterior',
        next: 'Siguiente',
        pageOf: 'Página {{page}} de {{totalPages}}',
      },
      common: {
        loading: 'Cargando...',
        error: 'No pudimos cargar la información. Intenta de nuevo más tarde.',
      },
      coursePage: {
        enroll: '¿Cómo inscribirte?',
        enrollText:
          'Escríbenos por WhatsApp y te ayudamos a reservar tu cupo.',
        enrollCta: 'Inscribirme por WhatsApp',
        enrollMessage: 'Hola, quiero inscribirme al curso "{{course}}"',
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
        heading: 'Menú',
        comingSoon: 'Muy pronto vas a poder ver acá el menú del local.',
        back: 'Volver al inicio',
      },
      aboutPage: {
        heading: 'Nosotros',
        comingSoon: 'Muy pronto vas a poder conocer más sobre nosotros acá.',
        back: 'Volver al inicio',
      },
      contactPage: {
        heading: 'Contacto',
        address: 'Dirección',
        hours: 'Horario',
        cta: 'Escríbenos por WhatsApp',
      },
      admin: {
        panelTitle: 'Panel — Valiente Café',
        logout: 'Salir',
        backToPanel: '← Volver al panel',
        welcome: 'Bienvenido, {{username}}',
        noAccess: 'No tenés menús de administración asignados todavía.',
        manageProducts: 'Gestión de Cafés de especialidad',
        manageProductsDesc: 'Agregá, editá o eliminá los cafés que se muestran en el sitio.',
        manageCourses: 'Gestión de Cursos y Talleres',
        manageCoursesDesc: 'Agregá, editá o eliminá los cursos y su contenido.',
        newProduct: '+ Nuevo café',
        newCourse: '+ Nuevo curso',
        edit: 'Editar',
        delete: 'Eliminar',
        save: 'Guardar',
        cancel: 'Cancelar',
        confirmDelete: '¿Seguro que querés eliminar esto?',
        saveError: 'No pudimos guardar los cambios. Revisá los datos e intentá de nuevo.',
        presentationRequired: 'Seleccioná al menos una presentación.',
        fields: {
          nameEs: 'Nombre (ES)',
          nameEn: 'Nombre (EN)',
          descriptionEs: 'Descripción (ES)',
          descriptionEn: 'Descripción (EN)',
          weight: 'Peso (gr)',
          price: 'Precio (COP)',
          slug: 'Slug (url)',
          imageUrl: 'URL de imagen',
          titleEs: 'Título (ES)',
          titleEn: 'Título (EN)',
          taglineEs: 'Tagline (ES)',
          taglineEn: 'Tagline (EN)',
          durationEs: 'Duración (ES)',
          durationEn: 'Duración (EN)',
        },
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
        login: 'Log in',
        admin: 'Dashboard',
      },
      hero: {
        tagline:
          'Specialty coffee, 100% vegan. Courage to change the world starts with conscious choices. Every cup, crafted with the patience and respect we all deserve.',
        cta: 'See our coffees',
        contactCta: 'Contact us',
      },
      menu: {
        heading: 'Our specialty coffees',
        note: 'Order it in the format of your choice.',
        presentations: 'Available as',
      },
      location: {
        heading: 'Location & hours',
        hours: {
          weekdays: 'Monday to Friday',
          saturday: 'Saturdays',
          sundayHolidays: 'Sundays & holidays',
        },
      },
      courses: {
        heading: 'Our Courses & Workshops',
        moreInfo: 'Learn more',
      },
      pagination: {
        previous: 'Previous',
        next: 'Next',
        pageOf: 'Page {{page}} of {{totalPages}}',
      },
      common: {
        loading: 'Loading...',
        error: "We couldn't load this. Please try again later.",
      },
      coursePage: {
        enroll: 'How to enroll',
        enrollText: "Message us on WhatsApp and we'll help you save your spot.",
        enrollCta: 'Enroll via WhatsApp',
        enrollMessage: 'Hi, I want to enroll in the "{{course}}" course',
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
        heading: 'Menu',
        comingSoon: "Our in-house menu will be available here soon.",
        back: 'Back to home',
      },
      aboutPage: {
        heading: 'About us',
        comingSoon: "You'll be able to learn more about us here soon.",
        back: 'Back to home',
      },
      contactPage: {
        heading: 'Contact',
        address: 'Address',
        hours: 'Hours',
        cta: 'Message us on WhatsApp',
      },
      admin: {
        panelTitle: 'Dashboard — Valiente Café',
        logout: 'Log out',
        backToPanel: '← Back to dashboard',
        welcome: 'Welcome, {{username}}',
        noAccess: "You don't have any admin menus assigned yet.",
        manageProducts: 'Manage Specialty Coffees',
        manageProductsDesc: 'Add, edit, or remove the coffees shown on the site.',
        manageCourses: 'Manage Courses & Workshops',
        manageCoursesDesc: 'Add, edit, or remove courses and their content.',
        newProduct: '+ New coffee',
        newCourse: '+ New course',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        confirmDelete: 'Are you sure you want to delete this?',
        saveError: "We couldn't save your changes. Check the fields and try again.",
        presentationRequired: 'Select at least one presentation.',
        fields: {
          nameEs: 'Name (ES)',
          nameEn: 'Name (EN)',
          descriptionEs: 'Description (ES)',
          descriptionEn: 'Description (EN)',
          weight: 'Weight (g)',
          price: 'Price (COP)',
          slug: 'Slug (url)',
          imageUrl: 'Image URL',
          titleEs: 'Title (ES)',
          titleEn: 'Title (EN)',
          taglineEs: 'Tagline (ES)',
          taglineEn: 'Tagline (EN)',
          durationEs: 'Duration (ES)',
          durationEn: 'Duration (EN)',
        },
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
