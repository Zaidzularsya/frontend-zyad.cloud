import type { LeadAddress } from '@/features/crm/leads/api/leads.api'

// Sama dengan annualRevenuePattern di backend (numeric(18,2)): maks 16 digit
// bulat + 2 desimal, tanpa tanda minus/pemisah ribuan.
const annualRevenuePattern = /^\d{1,16}(\.\d{1,2})?$/

/** String kosong valid — artinya nilai dikosongkan. */
export function isValidAnnualRevenue(value: string) {
  const trimmed = value.trim()
  return trimmed === '' || annualRevenuePattern.test(trimmed)
}

/** Buang field kosong supaya jsonb address tidak berisi string kosong. */
export function compactAddress(address: LeadAddress): LeadAddress {
  return Object.fromEntries(
    Object.entries(address)
      .map(([key, value]) => [key, (value ?? '').trim()])
      .filter(([, value]) => value),
  ) as LeadAddress
}
