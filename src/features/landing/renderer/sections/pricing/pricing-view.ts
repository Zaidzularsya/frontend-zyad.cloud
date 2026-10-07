import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import type {
  PublicListing,
  PublicListingCategory,
  PublicListingVariant,
} from '@/features/public/api/public-catalog.api'
import { formatCurrency } from '@/lib/utils'

// Logika murni pricing page per kategori: tab, toggle frekuensi, kartu, dan tujuan tombol.
// PricingSection.vue hanya merender hasilnya.

export type PricingCta =
  | { kind: 'checkout'; productId: string }
  | { kind: 'free' }
  | { kind: 'contact' }
  | { kind: 'unavailable' }

export interface PricingCard {
  code: string
  name: string
  description?: string
  priceLabel: string
  benefits: string[]
  cta: PricingCta
  ctaLabel: string
}

const frequencyOrder = FREQUENCIES.map((f) => f.value as string)

export function frequencyLabel(frequency: string | null): string {
  return FREQUENCIES.find((f) => f.value === frequency)?.label ?? ''
}

function frequencySuffix(frequency: string | null): string {
  return FREQUENCIES.find((f) => f.value === frequency)?.suffix ?? ''
}

/** Frekuensi yang dimiliki produk di kategori, urut harian → tahunan. */
export function frequenciesOf(category: PublicListingCategory): string[] {
  const found = new Set<string>()
  for (const listing of category.listings) {
    for (const variant of listing.variants) {
      if (variant.billing_frequency) found.add(variant.billing_frequency)
    }
  }
  return [...found].sort((a, b) => frequencyOrder.indexOf(a) - frequencyOrder.indexOf(b))
}

export function defaultFrequency(freqs: string[]): string | null {
  if (freqs.includes('monthly')) return 'monthly'
  return freqs[0] ?? null
}

// Varian untuk frekuensi terpilih; produk sekali bayar punya satu varian tanpa frekuensi.
function pickVariant(
  listing: PublicListing,
  frequency: string | null,
): PublicListingVariant | undefined {
  if (frequency) {
    const match = listing.variants.find((v) => v.billing_frequency === frequency)
    if (match) return match
  }
  return listing.variants.find((v) => !v.billing_frequency)
}

function isZero(amount: string): boolean {
  return Number(amount) === 0
}

function cardFor(listing: PublicListing, frequency: string | null): PricingCard {
  const base = {
    code: listing.code,
    name: listing.name,
    description: listing.description,
    benefits: listing.benefits.map((b) => b.label),
  }
  const variant = pickVariant(listing, frequency)
  if (!variant) {
    const label = frequencyLabel(frequency)
    return {
      ...base,
      priceLabel: '-',
      cta: { kind: 'unavailable' },
      ctaLabel: label ? `Tidak tersedia ${label}` : 'Tidak tersedia',
    }
  }
  if (isZero(variant.price_with_tax)) {
    return { ...base, priceLabel: 'Gratis', cta: { kind: 'free' }, ctaLabel: 'Mulai gratis' }
  }
  const priceLabel =
    formatCurrency(Number(variant.price_with_tax), variant.currency) +
    frequencySuffix(variant.billing_frequency)
  if (variant.checkout_enabled) {
    return {
      ...base,
      priceLabel,
      cta: { kind: 'checkout', productId: variant.product_id },
      ctaLabel: `Pilih ${listing.name}`,
    }
  }
  return { ...base, priceLabel, cta: { kind: 'contact' }, ctaLabel: 'Hubungi sales' }
}

export function buildCards(
  category: PublicListingCategory,
  frequency: string | null,
): PricingCard[] {
  return [...category.listings].sort((a, b) => a.order - b.order).map((l) => cardFor(l, frequency))
}

/** Tujuan tombol checkout; belum login → daftar dulu lalu kembali ke checkout. */
export function checkoutTarget(productId: string, authenticated: boolean): string {
  const target = `/app/checkout?product=${productId}`
  return authenticated ? target : `/auth/register?redirect=${encodeURIComponent(target)}`
}

function priceOf(listing: PublicListing, frequency: string): number | null {
  const variant = listing.variants.find((v) => v.billing_frequency === frequency)
  if (!variant) return null
  const price = Number(variant.price_with_tax)
  return Number.isFinite(price) && price > 0 ? price : null
}

/** Persen hemat tahunan vs 12× bulanan (price_with_tax); null bila tidak berlaku. */
export function yearlySavings(listing: PublicListing): number | null {
  const monthly = priceOf(listing, 'monthly')
  const annual = priceOf(listing, 'annual')
  if (monthly === null || annual === null) return null
  const percent = Math.round((1 - annual / (monthly * 12)) * 100)
  return percent > 0 ? percent : null
}

/** Hemat tahunan terbesar di kategori, untuk badge toggle "Hemat s.d. X%". */
export function maxYearlySavings(category: PublicListingCategory): number | null {
  let max: number | null = null
  for (const listing of category.listings) {
    const s = yearlySavings(listing)
    if (s !== null && (max === null || s > max)) max = s
  }
  return max
}
