import { useEffect, useState } from 'react'

function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export function DateField({
  value,
  onChange,
  required,
  className,
}: {
  value: string
  onChange: (iso: string) => void
  required?: boolean
  className?: string
}) {
  const [text, setText] = useState(isoToDisplay(value))

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const formatted =
      digits.length > 4
        ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
        : digits.length > 2
          ? `${digits.slice(0, 2)}/${digits.slice(2)}`
          : digits

    setText(formatted)
    onChange(displayToIso(formatted))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      placeholder="dd/mm/aaaa"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      maxLength={10}
      className={className}
    />
  )
}
