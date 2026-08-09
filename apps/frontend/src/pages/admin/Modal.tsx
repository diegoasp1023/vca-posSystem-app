import type { ReactNode } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

export function Modal({
  title,
  onClose,
  children,
  maxWidthClassName = 'max-w-lg',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        className={`flex max-h-[85vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-2xl bg-white shadow-lg`}
      >
        <div className="flex items-center justify-between border-b border-cream px-6 py-4">
          <h2 className="font-serif text-2xl text-lavender-dark">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 transition hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
