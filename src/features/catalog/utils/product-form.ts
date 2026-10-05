import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'
import type { CatalogProduct, ProductPayload } from '@/features/catalog/api/catalog.api'
import {
  normalizePricing,
  type BillingFrequency,
  type ChargeType,
  type PaymentTiming,
} from '@/features/catalog/utils/pricing'

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
  }
}

export function productToForm(p: CatalogProduct): ProductForm {
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
  }
}

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/

export function validateProductForm(f: ProductForm): string | null {
  if (!f.name.trim()) return 'Nama produk wajib diisi.'
  if (normalizeAmount(f.basePrice) === null) return 'Harga harus berupa angka.'
  const tax = f.taxPercent.trim().replace(',', '.') || '0'
  if (!PERCENT.test(tax) || Number(tax) > 100) return 'Pajak harus antara 0 dan 100.'
  return null
}

export function buildProductPayload(
  f: ProductForm,
  opts: { editing?: boolean } = {},
): ProductPayload {
  const pricing = normalizePricing({
    charge_type: f.chargeType,
    billing_frequency: f.frequency,
    payment_timing: f.paymentTiming,
  })
  const clear = (v: string) => (v.trim() ? v.trim() : opts.editing ? '' : undefined)
  return {
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
}
