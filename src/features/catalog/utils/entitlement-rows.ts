import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'
import { MAX_FEATURES, type FeatureRow } from '@/features/catalog/utils/product-form'

export type RowStatus = 'unset' | 'unlimited' | 'quota' | 'hidden'

// Perilaku diturunkan dari value_type registry: boolean true = Penuh, boolean false =
// Disembunyikan (false tersimpan), integer = Berkuota, tanpa nilai = Tidak diatur (baris tidak
// dikirim; berperilaku seperti tersembunyi saat runtime). Tipe lain (decimal/string) tidak didukung tabel ini.
export function availableStatuses(def: CatalogFeatureDef): RowStatus[] {
  if (def.value_type === 'boolean') return ['unset', 'unlimited', 'hidden']
  if (def.value_type === 'integer') return ['unset', 'quota']
  return []
}

export function statusOfRow(def: CatalogFeatureDef, value: unknown): RowStatus {
  if (value === undefined) return 'unset'
  if (def.value_type === 'boolean') return value === true ? 'unlimited' : 'hidden'
  if (def.value_type === 'integer') return 'quota'
  throw new RangeError(`Tipe fitur ${def.value_type} tidak didukung tabel entitlement`)
}

// Melempar RangeError untuk kombinasi tidak sah atau batas bukan bilangan bulat >= 0.
export function valueForStatus(def: CatalogFeatureDef, status: RowStatus, limit?: number): unknown {
  if (!availableStatuses(def).includes(status)) {
    throw new RangeError(`Status ${status} tidak diizinkan untuk fitur ${def.key}`)
  }
  if (status === 'unset') return undefined
  if (status === 'quota') {
    if (limit === undefined || !Number.isSafeInteger(limit) || limit < 0) {
      throw new RangeError('Batas harus bilangan bulat 0 atau lebih')
    }
    return limit
  }
  return status === 'unlimited'
}

export interface RowChange {
  features: FeatureRow[]
  error?: string
}

const LIMIT_ERROR = 'Batas harus bilangan bulat 0 atau lebih.'

// Hanya baris yang di-set admin masuk ke payload: baris default (tidak disentuh) tidak
// ditambahkan, supaya produk tetap di bawah batas 30 fitur backend. Batas integer kosong
// berarti baris dihapus.
export function applyRowChange(
  features: FeatureRow[],
  def: CatalogFeatureDef,
  status: RowStatus,
  limitText = '',
): RowChange {
  const index = features.findIndex((r) => r.key === def.key)
  const text = limitText.trim()

  if (status === 'unset' || (status === 'quota' && text === '')) {
    return { features: index < 0 ? features : features.filter((_, i) => i !== index) }
  }

  let value: unknown
  try {
    value = valueForStatus(def, status, /^\d+$/.test(text) ? Number(text) : Number.NaN)
  } catch (e) {
    if (status === 'quota') return { features, error: LIMIT_ERROR }
    throw e
  }
  const raw = status === 'quota' ? String(value) : (value as boolean)

  if (index >= 0) {
    return { features: features.map((r, i) => (i === index ? { ...r, raw } : r)) }
  }
  if (features.length >= MAX_FEATURES) {
    return { features, error: `Maksimal ${MAX_FEATURES} fitur per produk.` }
  }
  return { features: [...features, { key: def.key, raw, displayLabel: '' }] }
}

export function resetLabel(strategy?: string): string {
  if (!strategy) return '-'
  if (strategy === 'never') return 'Total'
  if (strategy === 'monthly') return 'Bulanan'
  return strategy
}

export const STATUS_LABEL: Record<RowStatus, string> = {
  unset: 'Tidak diatur',
  unlimited: 'Penuh',
  quota: 'Berkuota',
  hidden: 'Disembunyikan',
}
