import { useTranslation } from 'react-i18next'
import { SocialIcons } from './SocialIcons'
import { MapEmbed } from './MapEmbed'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-cream text-center text-sm text-gray-500">
      <MapEmbed className="h-64" />

      <div className="px-6 py-8">
        <SocialIcons className="justify-center" />
        <p className="mt-4">
          {t('footer.text')} © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
