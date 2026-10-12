import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`
  if (amount >= 1_000_000)     return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)         return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// For date-only values (e.g. due_date, a `date` column with no time component).
// Parses year/month/day as local components — new Date('YYYY-MM-DD') parses as
// UTC midnight, which can display as the previous day in negative-UTC-offset
// timezones.
export function formatDateOnly(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function getRiskColor(level: 'high' | 'medium' | 'low'): string {
  return { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' }[level]
}

export function getRiskBg(level: 'high' | 'medium' | 'low'): string {
  return { high: '#FFDAD6', medium: '#FEF3C7', low: '#DCFCE7' }[level]
}
