import { useTranslation } from 'react-i18next'
import foxLogo from '../assets/fox-logo.svg'
import { socialLinks } from '../data/social'

export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="bg-gradient-to-b from-cream to-white px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <img
          src={foxLogo}
          alt="Valiente Café"
          className="mx-auto h-24 w-24 sm:h-28 sm:w-28"
        />
        <h1 className="mt-6 font-serif text-5xl text-lavender-dark sm:text-6xl">
          Valiente Café
        </h1>
        <p className="mt-6 text-lg text-gray-600">{t('hero.tagline')}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#menu"
            className="inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('hero.cta')}
          </a>
          <a
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full border border-coral px-8 py-3 font-semibold text-coral-dark transition hover:bg-coral hover:text-white"
          >
            {t('hero.contactCta')}
          </a>
        </div>
      </div>
    </section>
  )
}
