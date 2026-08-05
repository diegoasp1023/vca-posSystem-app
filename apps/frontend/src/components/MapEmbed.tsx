import { location } from '../data/location'

export function MapEmbed({ className = '' }: { className?: string }) {
  const query = encodeURIComponent(`${location.address}, ${location.city}`)

  return (
    <div className={`overflow-hidden ${className}`}>
      <iframe
        title="Valiente Café"
        src={`https://www.google.com/maps?q=${query}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full w-full border-0"
      />
    </div>
  )
}
