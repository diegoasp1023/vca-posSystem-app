export interface LocationInfo {
  address: string
  city: string
  hours: { key: 'weekdays' | 'sunday'; time: string }[]
}

// Placeholder data — replace with the real address/hours before launch.
export const location: LocationInfo = {
  address: 'Calle Falsa 123',
  city: 'Bogotá D.C.',
  hours: [
    { key: 'weekdays', time: '10:00 AM - 8:00 PM' },
    { key: 'sunday', time: '10:00 AM - 6:00 PM' },
  ],
}
