// Kosakata atribut harga — cerminan backend `internal/shared/pricing`.
// Dipakai katalog dan quotation.
export type ChargeType = 'one_time' | 'recurring'
export type BillingFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
export type PaymentTiming = 'prepaid' | 'postpaid'

export interface PricingAttrs {
  charge_type: ChargeType
  billing_frequency: BillingFrequency | null
  payment_timing: PaymentTiming
}

// Urut daily → annual; urutan ini juga dipakai untuk menampilkan rincian total.
export const FREQUENCIES: { value: BillingFrequency; label: string; suffix: string }[] = [
  { value: 'daily', label: 'Harian', suffix: '/hari' },
  { value: 'weekly', label: 'Mingguan', suffix: '/minggu' },
  { value: 'monthly', label: 'Bulanan', suffix: '/bulan' },
  { value: 'quarterly', label: 'Triwulan', suffix: '/triwulan' },
  { value: 'semiannual', label: 'Semesteran', suffix: '/semester' },
  { value: 'annual', label: 'Tahunan', suffix: '/tahun' },
]

export const DEFAULT_PRICING: PricingAttrs = {
  charge_type: 'one_time',
  billing_frequency: null,
  payment_timing: 'prepaid',
}

const timingLabel = (t: PaymentTiming) => (t === 'postpaid' ? 'Pascabayar' : 'Prabayar')

export function pricingShort(a: PricingAttrs): string {
  const lead =
    a.charge_type === 'recurring'
      ? (FREQUENCIES.find((f) => f.value === a.billing_frequency)?.label ?? 'Berulang')
      : 'Sekali bayar'
  return `${lead} · ${timingLabel(a.payment_timing)}`
}

export function priceSuffix(a: PricingAttrs): string {
  if (a.charge_type !== 'recurring') return ''
  return FREQUENCIES.find((f) => f.value === a.billing_frequency)?.suffix ?? ''
}

// one_time → frequency dikosongkan; recurring tanpa frequency → bulanan.
export function normalizePricing(a: Partial<PricingAttrs>): PricingAttrs {
  const charge_type: ChargeType = a.charge_type === 'recurring' ? 'recurring' : 'one_time'
  return {
    charge_type,
    billing_frequency: charge_type === 'recurring' ? (a.billing_frequency ?? 'monthly') : null,
    payment_timing: a.payment_timing === 'postpaid' ? 'postpaid' : 'prepaid',
  }
}
