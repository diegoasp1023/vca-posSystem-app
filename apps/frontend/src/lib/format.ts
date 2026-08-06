export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function employeeHue(employeeId: number): number {
  return (employeeId * 137.508) % 360
}

export function employeeColor(employeeId: number): string {
  return `hsl(${employeeHue(employeeId)}, 70%, 85%)`
}

export function employeeTextColor(employeeId: number): string {
  return `hsl(${employeeHue(employeeId)}, 55%, 28%)`
}

export function employeeLegendColor(employeeId: number): string {
  return `hsl(${employeeHue(employeeId)}, 60%, 60%)`
}
