import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchCourseBySlug, type CourseDetail } from '../lib/api'
import { socialLinks } from '../data/social'

export function CoursePage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'es'
  const { slug } = useParams<{ slug: string }>()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'not-found' | 'ready'>(
    'loading',
  )

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    setStatus('loading')
    fetchCourseBySlug(slug)
      .then((result) => {
        if (!cancelled) {
          setCourse(result)
          setStatus('ready')
        }
      })
      .catch((error: Error) => {
        if (cancelled) return
        setStatus(error.message.includes('404') ? 'not-found' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <section className="px-6 py-24 text-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </section>
    )
  }

  if (status === 'error' || status === 'not-found' || !course) {
    return (
      <section className="px-6 py-24 text-center">
        <p className="text-gray-600">
          {status === 'error' ? t('common.error') : t('coursePage.notFound')}
        </p>
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
        src={course.image_url}
        alt={course.title[lang]}
        className="h-72 w-full object-cover sm:h-96"
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-4xl text-lavender-dark">
          {course.title[lang]}
        </h1>
        <p className="mt-3 text-lg text-gray-600">{course.tagline[lang]}</p>

        <div className="mt-8 rounded-2xl bg-cream p-6 text-center">
          <h2 className="font-serif text-xl text-lavender-dark">
            {t('coursePage.enroll')}
          </h2>
          <p className="mt-2 text-gray-700">{t('coursePage.enrollText')}</p>
          <a
            href={`${socialLinks.whatsapp}${encodeURIComponent(
              t('coursePage.enrollMessage', { course: course.title[lang] }),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full bg-coral px-8 py-3 font-semibold text-white transition hover:bg-coral-dark"
          >
            {t('coursePage.enrollCta')}
          </a>
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.objectives')}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {course.objectives.map((objective) => (
              <li key={objective[lang]}>{objective[lang]}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.content')}
          </h2>
          <ul className="mt-3 divide-y divide-cream rounded-2xl border border-cream">
            {course.content.map((item) => (
              <li
                key={item.module[lang]}
                className="flex items-center justify-between px-4 py-3 text-gray-700"
              >
                <span>{item.module[lang]}</span>
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
            {course.cost.map((line) => (
              <li key={line[lang]}>{line[lang]}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-2xl text-coral-dark">
            {t('coursePage.methods')}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
            {course.methods.map((method) => (
              <li key={method[lang]}>{method[lang]}</li>
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
