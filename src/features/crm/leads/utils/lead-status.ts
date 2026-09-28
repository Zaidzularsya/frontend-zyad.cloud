import type { LeadStatus } from '@/features/crm/leads/api/leads.api'

export const leadStatusOrder: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
]

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'Baru',
  contacted: 'Dihubungi',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
}

export const leadStatusTone: Record<LeadStatus, string> = {
  new: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  contacted: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  qualified: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  unqualified: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  converted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}

export function leadScoreTone(score: number) {
  if (score >= 67) {
    return { label: 'HIGH', bar: 'bg-emerald-500' }
  }
  if (score >= 34) {
    return { label: 'MID', bar: 'bg-amber-500' }
  }
  return { label: 'LOW', bar: 'bg-red-500' }
}
