export interface LocationInfo {
  address: string
  city: string
  hours: { key: 'weekdays' | 'sunday'; time: string }[]
}

export const location: LocationInfo = {
  address: 'Cl. 26d #4-15',
  city: 'Bogotá',
  hours: [
    { key: 'weekdays', time: '10:00 AM - 8:00 PM' },
    { key: 'sunday', time: '10:00 AM - 6:00 PM' },
  ],
}
