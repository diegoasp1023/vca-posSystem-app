import { useTranslation } from 'react-i18next'
import foxLogo from '../assets/fox-logo.svg'

export function Header() {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-cream bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="/">
          <img src={foxLogo} alt="Valiente Café" className="h-12 w-12" />
        </a>

        <nav className="hidden gap-8 text-sm font-medium text-lavender-dark sm:flex">
          <a href="/#menu" className="hover:text-coral-dark">
            {t('header.menu')}
          </a>
          <a href="/#ubicacion" className="hover:text-coral-dark">
            {t('header.location')}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="rounded-full border border-lavender px-3 py-1 text-xs font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white"
          >
            {i18n.language === 'en' ? 'ES' : 'EN'}
          </button>

          {/* TODO: wire up to Keycloak login (public + PKCE client) once auth is implemented. */}
          <button
            type="button"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('header.login')}
          </button>
        </div>
      </div>
    </header>
  )
}
