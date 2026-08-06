import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ComingSoonPage({
  translationKey,
}: {
  translationKey: 'menuPage' | 'aboutPage'
}) {
  const { t } = useTranslation()

  return (
    <section className="px-6 py-24 text-center">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-4xl text-lavender-dark">
          {t(`${translationKey}.heading`)}
        </h1>
        <p className="mt-4 text-gray-600">{t(`${translationKey}.comingSoon`)}</p>
        <Link
          to="/"
          className="mt-10 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
        >
          {t(`${translationKey}.back`)}
        </Link>
      </div>
    </section>
  )
}
