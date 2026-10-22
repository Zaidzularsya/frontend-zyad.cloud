import { formatBytes } from '@/features/storage/utils/formatBytes'

import type { EntitlementSummaryItem } from '../types'

export interface UsageRow {
  key: string
  label: string
  used?: number
  limit?: number
  unit?: string
  atLimit: boolean
  /** 0-100; undefined bila item tidak punya meter (tanpa used). */
  percent?: number
  /** Teks siap tampil, mis. "32 / 50" atau "batas 5 bagian". */
  format: string
}

export interface UsageGroup {
  title: string
  rows: UsageRow[]
}

const GROUP_CRM = 'CRM'
const GROUP_BILLING = 'Penjualan & Billing (per bulan)'
const GROUP_FILES = 'Landing & File'
const GROUP_TEAM = 'Tim'

// Urutan eksplisit baris; key tak dikenal ditaruh setelahnya sesuai urutan masuk.
const KEY_ORDER = [
  'crm.max_leads',
  'crm.max_contacts',
  'crm.max_companies',
  'crm.max_deals',
  'crm.max_pipelines',
  'crm.max_quotations_per_month',
  'crm.max_sales_orders_per_month',
  'receivable.max_invoices_per_month',
  'landing.max_pages',
  'domain.max_domains',
  'storage.max_bytes',
  'users.max_users',
]

const LABELS: Record<string, string> = {
  'crm.max_leads': 'Lead',
  'crm.max_contacts': 'Contact',
  'crm.max_companies': 'Company',
  'crm.max_deals': 'Deal',
  'crm.max_pipelines': 'Pipeline',
  'crm.max_quotations_per_month': 'Quotation',
  'crm.max_sales_orders_per_month': 'Sales Order',
  'receivable.max_invoices_per_month': 'Invoice',
  'landing.max_pages': 'Landing page',
  'domain.max_domains': 'Domain',
  'storage.max_bytes': 'Storage',
  'users.max_users': 'User',
}

const FILE_MODULES = ['landing', 'domain', 'media', 'storage']

function groupTitle(item: EntitlementSummaryItem): string {
  if (item.module === 'users') return GROUP_TEAM
  if (item.reset_strategy === 'monthly') return GROUP_BILLING
  if (FILE_MODULES.includes(item.module)) return GROUP_FILES
  return GROUP_CRM
}

function formatRow(item: EntitlementSummaryItem): string {
  const isBytes = item.feature_key === 'storage.max_bytes'
  const fmt = (n: number) => (isBytes ? formatBytes(n) : String(n))
  const unit = !isBytes && item.unit ? ` ${item.unit}` : ''
  if (item.used === undefined) {
    return item.limit === undefined ? '-' : `batas ${fmt(item.limit)}${unit}`
  }
  return item.limit === undefined
    ? `${fmt(item.used)}${unit}`
    : `${fmt(item.used)} / ${fmt(item.limit)}${unit}`
}

function toRow(item: EntitlementSummaryItem): UsageRow {
  const hasMeter = item.used !== undefined && item.limit !== undefined && item.limit > 0
  const percent = hasMeter ? Math.min(100, Math.round((item.used! / item.limit!) * 100)) : undefined
  return {
    key: item.feature_key,
    label: LABELS[item.feature_key] ?? item.name,
    used: item.used,
    limit: item.limit,
    unit: item.unit,
    atLimit: item.at_limit,
    percent: item.at_limit && hasMeter ? 100 : percent,
    format: formatRow(item),
  }
}

function orderOf(key: string): number {
  const idx = KEY_ORDER.indexOf(key)
  return idx === -1 ? KEY_ORDER.length : idx
}

export function groupUsage(items: EntitlementSummaryItem[]): UsageGroup[] {
  const buckets = new Map<string, EntitlementSummaryItem[]>(
    [GROUP_CRM, GROUP_BILLING, GROUP_FILES, GROUP_TEAM].map((t) => [t, []]),
  )
  for (const item of items) {
    if (item.state !== 'quota') continue
    buckets.get(groupTitle(item))!.push(item)
  }
  return [...buckets.entries()]
    .map(([title, list]) => ({
      title,
      rows: list
        .map((item, index) => ({ item, index }))
        .sort(
          (a, b) => orderOf(a.item.feature_key) - orderOf(b.item.feature_key) || a.index - b.index,
        )
        .map(({ item }) => toRow(item)),
    }))
    .filter((g) => g.rows.length > 0)
}
