import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

export function BackToPanelLink() {
  const { t } = useTranslation()

  return (
    <Link
      to="/admin"
      className="inline-flex items-center gap-2 rounded-full border border-lavender px-4 py-1.5 text-sm font-semibold text-lavender-dark transition hover:bg-lavender hover:text-white"
    >
      <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
      {t('admin.backToPanel')}
    </Link>
  )
}
