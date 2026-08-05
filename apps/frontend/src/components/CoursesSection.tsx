import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCourses, type CourseSummary } from '../lib/api'
import { Pagination } from './Pagination'

export function CoursesSection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'es'

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    fetchCourses(page)
      .then((result) => {
        if (!cancelled) {
          setCourses(result.items)
          setTotalPages(result.total_pages)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <section id="cursos" className="bg-cream px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl text-lavender-dark">
          {t('courses.heading')}
        </h2>

        {status === 'loading' && (
          <p className="mt-10 text-center text-gray-500">{t('common.loading')}</p>
        )}
        {status === 'error' && (
          <p className="mt-10 text-center text-gray-500">{t('common.error')}</p>
        )}
        {status === 'ready' && (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {courses.map((course) => (
                <div
                  key={course.slug}
                  className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm transition hover:shadow-md"
                >
                  <img
                    src={course.image_url}
                    alt={course.title[lang]}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-6 text-left">
                    <h3 className="text-lg font-semibold text-lavender-dark">
                      {course.title[lang]}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      {course.tagline[lang]}
                    </p>
                    <a
                      href={`/cursos/${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-dark"
                    >
                      {t('courses.moreInfo')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  )
}
