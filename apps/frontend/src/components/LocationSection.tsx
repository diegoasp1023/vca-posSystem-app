import { useTranslation } from 'react-i18next'
import { location } from '../data/location'

export function LocationSection() {
  const { t } = useTranslation()

  return (
    <section id="ubicacion" className="bg-cream px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl text-lavender-dark">
            {t('location.heading')}
          </h2>
          <p className="mt-4 text-gray-700">
            {location.address}
            <br />
            {location.city}
          </p>
          <ul className="mt-6 space-y-1 text-gray-700">
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

        <div
          className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-lavender bg-white text-sm text-gray-400"
          aria-hidden="true"
        >
          {t('location.mapPlaceholder')}
        </div>
      </div>
    </section>
  )
}
