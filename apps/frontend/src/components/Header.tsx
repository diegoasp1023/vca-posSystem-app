import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import foxLogo from '../assets/fox-logo.svg'
import { SocialIcons } from './SocialIcons'
import { useAuth } from '../context/AuthContext'

export function Header() {
  const { t, i18n } = useTranslation()
  const { initialized, authenticated, login } = useAuth()

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-cream bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="shrink-0">
          <img src={foxLogo} alt="Valiente Café" className="h-12 w-12" />
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-lavender-dark md:flex">
          <Link to="/" className="hover:text-coral-dark">
            {t('header.home')}
          </Link>
          <Link to="/menu" className="hover:text-coral-dark">
            {t('header.menu')}
          </Link>
          <Link to="/nosotros" className="hover:text-coral-dark">
            {t('header.about')}
          </Link>
          <Link to="/contacto" className="hover:text-coral-dark">
            {t('header.contact')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <SocialIcons className="hidden sm:flex" />

          <span className="hidden h-6 w-px bg-cream sm:block" />

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="rounded-full border border-lavender px-3 py-1 text-xs font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white"
          >
            {i18n.language === 'en' ? 'ES' : 'EN'}
          </button>

          {authenticated ? (
            <Link
              to="/admin"
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
            >
              {t('header.admin')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={login}
              disabled={!initialized}
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50"
            >
              {t('header.login')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
