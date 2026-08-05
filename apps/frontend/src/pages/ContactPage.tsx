import { useTranslation } from 'react-i18next'
import { location } from '../data/location'
import { socialLinks } from '../data/social'
import { SocialIcons } from '../components/SocialIcons'

export function ContactPage() {
  const { t } = useTranslation()

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-4xl text-lavender-dark">
          {t('contactPage.heading')}
        </h1>

        <div className="mt-10 text-left">
          <h2 className="text-sm font-semibold tracking-wide text-lavender uppercase">
            {t('contactPage.address')}
          </h2>
          <p className="mt-2 text-gray-700">
            {location.address}, {location.city}
          </p>
        </div>

        <div className="mt-8 text-left">
          <h2 className="text-sm font-semibold tracking-wide text-lavender uppercase">
            {t('contactPage.hours')}
          </h2>
          <ul className="mt-2 space-y-1 text-gray-700">
            {location.hours.map((entry) => (
              <li key={entry.key}>
                <span className="font-semibold">
                  {t(`location.hours.${entry.key}`)}:
                </span>{' '}
                {entry.time}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 text-left">
          <h2 className="text-sm font-semibold tracking-wide text-lavender uppercase">
            WhatsApp
          </h2>
          <a
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-coral-dark hover:underline"
          >
            +57 315 784 5433
          </a>
        </div>

        <a
          href={socialLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('contactPage.cta')}
        </a>

        <SocialIcons className="mt-10 justify-center" />
      </div>
    </section>
  )
}
