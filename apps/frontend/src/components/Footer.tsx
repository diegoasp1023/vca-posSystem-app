import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-cream px-6 py-8 text-center text-sm text-gray-500">
      <p>
        {t('footer.text')} © {new Date().getFullYear()}
      </p>
    </footer>
  )
}
