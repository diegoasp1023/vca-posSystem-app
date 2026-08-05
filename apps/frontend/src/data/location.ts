export interface LocationInfo {
  address: string
  city: string
  hours: { key: 'weekdays' | 'saturday' | 'sundayHolidays'; time: string }[]
}

export const location: LocationInfo = {
  address: 'Cl. 26d #4-15',
  city: 'Bogotá',
  hours: [
    { key: 'weekdays', time: '10:00 AM - 7:00 PM' },
    { key: 'saturday', time: '10:00 AM - 8:00 PM' },
    { key: 'sundayHolidays', time: '10:00 AM - 6:00 PM' },
  ],
}
