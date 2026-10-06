import type { CatalogFeatureDef } from '@/features/catalog/api/catalog.api'

export type ParsedFeature = { ok: true; value: unknown } | { ok: false; error: string }

const INTEGER = /^-?\d+$/
const DECIMAL = /^-?\d+(\.\d+)?$/
const MAX_STRING = 200

// Nilai fitur dikirim sebagai tipe JSON asli sesuai value_type registry; backend memvalidasi ulang.
export function parseFeatureInput(def: CatalogFeatureDef, raw: string | boolean): ParsedFeature {
  if (def.value_type === 'boolean') return { ok: true, value: raw === true || raw === 'true' }
  const text = String(raw).trim()
  if (def.value_type === 'integer') {
    if (!INTEGER.test(text)) return { ok: false, error: 'Harus bilangan bulat' }
    return { ok: true, value: Number(text) }
  }
  if (def.value_type === 'decimal') {
    const normalized = text.replace(',', '.')
    if (!DECIMAL.test(normalized)) return { ok: false, error: 'Harus berupa angka' }
    return { ok: true, value: Number(normalized) }
  }
  if (!text) return { ok: false, error: 'Nilai wajib diisi' }
  if (text.length > MAX_STRING) return { ok: false, error: 'Maksimal 200 karakter' }
  return { ok: true, value: text }
}

export function featureInputText(def: CatalogFeatureDef, value: unknown): string | boolean {
  if (def.value_type === 'boolean') return value === true
  return value === null || value === undefined ? '' : String(value)
}
