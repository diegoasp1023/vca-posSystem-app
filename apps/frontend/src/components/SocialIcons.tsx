import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faInstagram,
  faFacebookF,
  faWhatsapp,
} from '@fortawesome/free-brands-svg-icons'
import { socialLinks } from '../data/social'

const links = [
  { href: socialLinks.instagram, icon: faInstagram, label: 'Instagram' },
  { href: socialLinks.facebook, icon: faFacebookF, label: 'Facebook' },
  { href: socialLinks.whatsapp, icon: faWhatsapp, label: 'WhatsApp' },
]

export function SocialIcons({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map(({ href, icon, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-coral-dark transition hover:bg-coral hover:text-white"
        >
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </a>
      ))}
    </div>
  )
}
