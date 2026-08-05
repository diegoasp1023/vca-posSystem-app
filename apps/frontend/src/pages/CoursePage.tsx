import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { courses } from '../data/courses'

export function CoursePage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'es'
  const { slug } = useParams<{ slug: string }>()
  const course = courses.find((c) => c.slug === slug)

  if (!course) {
    return (
      <section className="px-6 py-24 text-center">
        <p className="text-gray-600">{t('coursePage.notFound')}</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('coursePage.back')}
        </Link>
      </section>
    )
  }

  return (
    <article>
      <img
        src={course.image}
        alt={course.title[lang]}
        className="h-72 w-full object-cover sm:h-96"
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-4xl text-lavender-dark">
          {course.title[lang]}
        </h1>
        <p className="mt-3 text-lg text-gray-600">{course.tagline[lang]}</p>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.objectives')}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {course.objectives[lang].map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.content')}
          </h2>
          <ul className="mt-3 divide-y divide-cream rounded-2xl border border-cream">
            {course.content[lang].map((item) => (
              <li
                key={item.module}
                className="flex items-center justify-between px-4 py-3 text-gray-700"
              >
                <span>{item.module}</span>
                <span className="font-semibold text-lavender-dark">
                  {item.duration}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.duration')}
          </h2>
          <p className="mt-3 text-gray-700">{course.duration[lang]}</p>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.cost')}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {course.cost[lang].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.methods')}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {course.methods[lang].map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </section>

        <Link
          to="/"
          className="mt-12 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
        >
          {t('coursePage.back')}
        </Link>
      </div>
    </article>
  )
}
