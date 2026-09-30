import type { LeadDashboardGranularity } from '@/features/crm/leads/api/leads.api'

export type LeadRangePreset = '7d' | '30d' | '90d' | '12m' | 'custom'

export const leadRangePresets: { value: LeadRangePreset; label: string }[] = [
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: '90d', label: '90 hari' },
  { value: '12m', label: '12 bulan' },
  { value: 'custom', label: 'Custom' },
]

const presetDays: Record<Exclude<LeadRangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
}

/** Same threshold as the backend default (autoMonthlyAfterDays). */
const autoMonthlyAfterDays = 92

/** Local calendar date as YYYY-MM-DD. */
export function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseIsoDate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function daysBetweenInclusive(from: string, to: string) {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime()
  return Math.round(ms / 86_400_000) + 1
}

/** Inclusive range ending today for a preset. */
export function presetRange(preset: Exclude<LeadRangePreset, 'custom'>, today = new Date()) {
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const from = new Date(to)
  from.setDate(from.getDate() - (presetDays[preset] - 1))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export function defaultGranularity(from: string, to: string): LeadDashboardGranularity {
  return daysBetweenInclusive(from, to) > autoMonthlyAfterDays ? 'month' : 'day'
}

/**
 * Percentage change vs the previous period, rounded. null when there is no
 * baseline (previous = 0) — "new from zero" is not a percentage.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })
const dayMonthFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export type DueTone = 'overdue' | 'today' | 'later' | 'none'

/** Text color per due tone (dashboard follow-ups, lead list next step). */
export const dueToneClass: Record<DueTone, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-amber-600 dark:text-amber-400',
  later: 'text-gray-700 dark:text-gray-300 font-medium',
  none: 'text-gray-400',
}

/** Human label for an activity due date relative to now (local days). */
export function dueLabel(
  dueAt: string | null | undefined,
  now = new Date(),
): { text: string; tone: DueTone } {
  if (!dueAt) return { text: 'Tanpa jadwal', tone: 'none' }
  const due = new Date(dueAt)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const dayDiff = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000)

  if (dayDiff < 0) {
    return { text: `Terlambat ${-dayDiff} hari`, tone: 'overdue' }
  }
  if (dayDiff === 0) {
    return due < now
      ? { text: `Hari ini, ${timeFormat.format(due)} (lewat)`, tone: 'overdue' }
      : { text: `Hari ini, ${timeFormat.format(due)}`, tone: 'today' }
  }
  if (dayDiff === 1) return { text: `Besok, ${timeFormat.format(due)}`, tone: 'later' }
  return { text: dayMonthFormat.format(due), tone: 'later' }
}

const relativeFormat = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** "12 menit yang lalu", "kemarin", then an absolute date after a week. */
export function relativeTime(value: string, now = new Date()) {
  const diffSeconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return 'baru saja'
  if (abs < 3600) return relativeFormat.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86_400) return relativeFormat.format(Math.round(diffSeconds / 3600), 'hour')
  if (abs < 7 * 86_400) return relativeFormat.format(Math.round(diffSeconds / 86_400), 'day')
  return dateTimeFormat.format(new Date(value))
}

/** Axis label for a series bucket (YYYY-MM-DD). */
export function bucketLabel(bucket: string, granularity: LeadDashboardGranularity) {
  const date = parseIsoDate(bucket)
  return granularity === 'month'
    ? new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}
