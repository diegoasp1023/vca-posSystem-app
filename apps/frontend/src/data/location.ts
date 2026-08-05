export interface LocationInfo {
  address: string
  city: string
  hours: { days: string; time: string }[]
}

// Placeholder data — replace with the real address/hours before launch.
export const location: LocationInfo = {
  address: 'Calle Falsa 123',
  city: 'Bogotá D.C.',
  hours: [
    { days: 'Lunes a sábado', time: '10:00 AM - 8:00 PM' },
    { days: 'Domingo', time: '10:00 AM - 6:00 PM' },
  ],
}
