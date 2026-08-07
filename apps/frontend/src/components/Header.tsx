import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import foxLogo from '../assets/fox-logo.svg'
import { SocialIcons } from './SocialIcons'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { to: '/', key: 'home' },
  { to: '/menu', key: 'menu' },
  { to: '/nosotros', key: 'about' },
  { to: '/contacto', key: 'contact' },
] as const

export function Header() {
  const { t, i18n } = useTranslation()
  const { initialized, authenticated, openAdmin } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-cream bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="shrink-0" onClick={() => setIsMenuOpen(false)}>
          <img src={foxLogo} alt="Valiente Café" className="h-12 w-12" />
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-lavender-dark md:flex">
          {navLinks.map(({ to, key }) => (
            <Link key={to} to={to} className="hover:text-coral-dark">
              {t(`header.${key}`)}
            </Link>
          ))}
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

          <button
            type="button"
            onClick={openAdmin}
            disabled={!initialized}
            className="hidden rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50 sm:block"
          >
            {authenticated ? t('header.admin') : t('header.login')}
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lavender text-lavender-dark md:hidden"
          >
            {isMenuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-cream bg-white px-6 py-4 text-sm font-medium text-lavender-dark md:hidden">
          {navLinks.map(({ to, key }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg px-2 py-2 hover:bg-cream hover:text-coral-dark"
            >
              {t(`header.${key}`)}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false)
              openAdmin()
            }}
            disabled={!initialized}
            className="mt-2 rounded-full bg-coral px-5 py-2 text-center text-sm font-semibold text-white transition hover:bg-coral-dark disabled:opacity-50 sm:hidden"
          >
            {authenticated ? t('header.admin') : t('header.login')}
          </button>

          <SocialIcons className="mt-2 px-2 sm:hidden" />
        </nav>
      )}
    </header>
  )
}
