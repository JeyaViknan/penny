/** Every amount from the API is minor units (paise/cents) as an integer -- never a float. */
export function formatMinorUnits(minorUnits: number, currency = 'USD'): string {
  const major = minorUnits / 100
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(major)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
