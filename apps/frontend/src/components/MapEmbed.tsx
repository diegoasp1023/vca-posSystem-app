import { location } from '../data/location'

export function MapEmbed({ className = '' }: { className?: string }) {
  const query = encodeURIComponent(`${location.address}, ${location.city}`)

  return (
    <iframe
      title="Valiente Café"
      src={`https://www.google.com/maps?q=${query}&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`w-full border-0 ${className}`}
    />
  )
}
