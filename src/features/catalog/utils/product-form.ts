import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'
import type {
  CatalogFeatureDef,
  CatalogProduct,
  ProductPayload,
} from '@/features/catalog/api/catalog.api'
import { featureInputText, parseFeatureInput } from '@/features/catalog/utils/feature-value'
import {
  normalizePricing,
  type BillingFrequency,
  type ChargeType,
  type PaymentTiming,
} from '@/features/catalog/utils/pricing'

export interface FeatureRow {
  key: string
  raw: string | boolean
  displayLabel: string
}

export const MAX_FEATURES = 30
const LISTING_CODE = /^[a-z0-9][a-z0-9-]{0,49}$/

export interface ProductForm {
  categoryId: string
  sku: string
  name: string
  description: string
  unit: string
  basePrice: string
  taxPercent: string
  chargeType: ChargeType
  frequency: BillingFrequency
  paymentTiming: PaymentTiming
  isActive: boolean
  // Publikasi & fitur (katalog platform saja).
  isPublic: boolean
  listingCode: string
  listingOrder: string
  features: FeatureRow[]
}

export function emptyProductForm(): ProductForm {
  return {
    categoryId: '',
    sku: '',
    name: '',
    description: '',
    unit: 'pcs',
    basePrice: '',
    taxPercent: '0',
    chargeType: 'one_time',
    frequency: 'monthly',
    paymentTiming: 'prepaid',
    isActive: true,
    isPublic: false,
    listingCode: '',
    listingOrder: '0',
    features: [],
  }
}

export function productToForm(p: CatalogProduct, defs: CatalogFeatureDef[] = []): ProductForm {
  const byKey = new Map(defs.map((d) => [d.key, d]))
  return {
    categoryId: p.category_id ?? '',
    sku: p.sku ?? '',
    name: p.name,
    description: p.description ?? '',
    unit: p.unit,
    basePrice: p.base_price,
    taxPercent: p.tax_percent,
    chargeType: p.charge_type ?? 'one_time',
    frequency: p.billing_frequency ?? 'monthly',
    paymentTiming: p.payment_timing ?? 'prepaid',
    isActive: p.is_active,
    isPublic: p.is_public ?? false,
    listingCode: p.listing_code ?? '',
    listingOrder: String(p.listing_order ?? 0),
    // Key nonaktif tidak ada di defs: nilai asli dipertahankan apa adanya sampai pengguna menggantinya.
    features: (p.features ?? []).map((f) => {
      const def = byKey.get(f.feature_key)
      return {
        key: f.feature_key,
        raw: def
          ? featureInputText(def, f.value)
          : typeof f.value === 'boolean'
            ? f.value
            : String(f.value ?? ''),
        displayLabel: f.display_label ?? '',
      }
    }),
  }
}

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/

export interface PlatformOptions {
  platform?: boolean
  featureDefs?: CatalogFeatureDef[]
}

export function validateProductForm(f: ProductForm, opts: PlatformOptions = {}): string | null {
  if (!f.name.trim()) return 'Nama produk wajib diisi.'
  if (normalizeAmount(f.basePrice) === null) return 'Harga harus berupa angka.'
  const tax = f.taxPercent.trim().replace(',', '.') || '0'
  if (!PERCENT.test(tax) || Number(tax) > 100) return 'Pajak harus antara 0 dan 100.'
  if (opts.platform) return validatePublishing(f, opts.featureDefs ?? [])
  return null
}

function validatePublishing(f: ProductForm, defs: CatalogFeatureDef[]): string | null {
  const code = f.listingCode.trim()
  if (f.isPublic && !code) return 'Kode listing wajib bila tampil di pricing page.'
  if (f.isPublic && !f.categoryId) return 'Kategori wajib bila tampil di pricing page.'
  if (code && !LISTING_CODE.test(code)) {
    return 'Kode listing hanya huruf kecil, angka, dan tanda -, maksimal 50 karakter.'
  }
  if (!/^\d{1,6}$/.test(f.listingOrder.trim() || '0')) return 'Urutan harus bilangan bulat.'
  if (f.features.length > MAX_FEATURES) return `Maksimal ${MAX_FEATURES} fitur per produk.`
  const byKey = new Map(defs.map((d) => [d.key, d]))
  for (const row of f.features) {
    const def = byKey.get(row.key)
    if (!def) return `Fitur "${row.key || '(belum dipilih)'}" tidak aktif. Ganti atau hapus.`
    const parsed = parseFeatureInput(def, row.raw)
    if (!parsed.ok) return `${def.name}: ${parsed.error}.`
    if (row.displayLabel.trim().length > 200) return `${def.name}: label maksimal 200 karakter.`
  }
  return null
}

export function buildProductPayload(
  f: ProductForm,
  opts: { editing?: boolean } & PlatformOptions = {},
): ProductPayload {
  const pricing = normalizePricing({
    charge_type: f.chargeType,
    billing_frequency: f.frequency,
    payment_timing: f.paymentTiming,
  })
  const clear = (v: string) => (v.trim() ? v.trim() : opts.editing ? '' : undefined)
  const payload: ProductPayload = {
    name: f.name.trim(),
    sku: clear(f.sku),
    description: f.description.trim() || undefined,
    category_id: clear(f.categoryId),
    unit: f.unit.trim() || 'pcs',
    base_price: normalizeAmount(f.basePrice) || '0',
    tax_percent: f.taxPercent.trim().replace(',', '.') || '0',
    charge_type: pricing.charge_type,
    billing_frequency: pricing.billing_frequency,
    payment_timing: pricing.payment_timing,
    is_active: f.isActive,
  }
  // Listing & fitur hanya dikirim untuk katalog platform (backend menolak org lain dengan 422).
  if (opts.platform) {
    const byKey = new Map((opts.featureDefs ?? []).map((d) => [d.key, d]))
    payload.is_public = f.isPublic
    payload.listing_code = f.listingCode.trim()
    payload.listing_order = Number(f.listingOrder.trim() || '0')
    payload.features = f.features.map((row, position) => {
      const def = byKey.get(row.key)
      const parsed = def ? parseFeatureInput(def, row.raw) : null
      return {
        feature_key: row.key,
        value: parsed?.ok ? parsed.value : row.raw,
        display_label: row.displayLabel.trim() || undefined,
        position,
      }
    })
  }
  return payload
}
