export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function employeeColor(employeeId: number): string {
  const hue = (employeeId * 137.508) % 360
  return `hsl(${hue}, 65%, 45%)`
}
