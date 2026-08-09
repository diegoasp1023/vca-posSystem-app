import { useTranslation } from 'react-i18next'
import { location } from '../data/location'
import { socialLinks } from '../data/social'
import { SocialIcons } from '../components/SocialIcons'
import { MapEmbed } from '../components/MapEmbed'

export function ContactPage() {
  const { t } = useTranslation()

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-center font-serif text-4xl text-lavender-dark">
          {t('contactPage.heading')}
        </h1>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-lavender uppercase">
                {t('contactPage.address')}
              </h2>
              <p className="mt-2 text-gray-700">
                {location.address}, {location.city}
              </p>
            </div>

            <div className="mt-8">
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

            <div className="mt-8">
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

            <SocialIcons className="mt-10" />
          </div>

          <MapEmbed className="min-h-64 rounded-2xl" />
        </div>
      </div>
    </section>
  )
}
