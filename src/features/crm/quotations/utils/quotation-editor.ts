import type { CatalogProduct } from '@/features/catalog/api/catalog.api'
import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'
import type { LineItemInput, Quotation } from '@/features/crm/quotations/api/quotations.api'

export interface EditorLine {
  key: string
  productId: string
  sku: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  discountPercent: string
  taxPercent: string
}

let seq = 0
const nextKey = () => `l${++seq}`

export function blankLine(): EditorLine {
  return {
    key: nextKey(),
    productId: '',
    sku: '',
    description: '',
    quantity: '1',
    unit: '',
    unitPrice: '',
    discountPercent: '',
    taxPercent: '0',
  }
}

export function lineFromProduct(p: CatalogProduct): EditorLine {
  return {
    ...blankLine(),
    productId: p.id,
    sku: p.sku ?? '',
    description: p.name,
    unit: p.unit,
    unitPrice: p.base_price,
    taxPercent: p.tax_percent,
  }
}

export function linesFromQuotation(q: Quotation): EditorLine[] {
  return q.items.map((it) => ({
    key: nextKey(),
    productId: it.product_id ?? '',
    sku: it.sku ?? '',
    description: it.description,
    quantity: it.quantity,
    unit: it.unit ?? '',
    unitPrice: it.unit_price,
    discountPercent: it.discount_percent ?? '',
    taxPercent: it.tax_percent ?? '0',
  }))
}

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/

function percent(v: string): string | null {
  const s = (v || '0').trim().replace(',', '.')
  return PERCENT.test(s) && Number(s) <= 100 ? s : null
}

/** "12.5" → 1250n (dua desimal → sen). */
function toCents(decimal: string): bigint {
  const [whole, frac = ''] = decimal.split('.')
  return BigInt(whole || '0') * 100n + BigInt((frac + '00').slice(0, 2))
}

function fromCents(c: bigint): string {
  const s = c.toString().padStart(3, '0')
  return `${s.slice(0, -2)}.${s.slice(-2)}`
}

/** round(a * b / div) half-up untuk bilangan non-negatif. */
function mulDivRound(a: bigint, b: bigint, div: bigint): bigint {
  return (a * b * 2n + div) / (2n * div)
}

export interface EditorTotals {
  lines: { gross: string; discount: string; net: string; tax: string }[]
  subtotal: string
  discountTotal: string
  taxTotal: string
  grandTotal: string
}

export function computeTotals(lines: EditorLine[]): EditorTotals {
  let subtotal = 0n
  let discountTotal = 0n
  let taxTotal = 0n
  const out = lines.map((l) => {
    const qty = toCents(normalizeAmount(l.quantity || '1') || '0') // sen = qty × 100
    const price = toCents(normalizeAmount(l.unitPrice) || '0')
    const disc = toCents(percent(l.discountPercent) ?? '0')
    const tax = toCents(percent(l.taxPercent) ?? '0')
    const gross = mulDivRound(qty, price, 100n) // (qty×100)(price×100)/100 → sen
    const discount = mulDivRound(gross, disc, 10000n)
    const net = gross - discount
    const taxAmount = mulDivRound(net, tax, 10000n)
    subtotal += gross
    discountTotal += discount
    taxTotal += taxAmount
    return {
      gross: fromCents(gross),
      discount: fromCents(discount),
      net: fromCents(net),
      tax: fromCents(taxAmount),
    }
  })
  return {
    lines: out,
    subtotal: fromCents(subtotal),
    discountTotal: fromCents(discountTotal),
    taxTotal: fromCents(taxTotal),
    grandTotal: fromCents(subtotal - discountTotal + taxTotal),
  }
}

export function validateLines(lines: EditorLine[]): string | null {
  if (lines.length === 0) return 'Tambahkan minimal satu item.'
  for (const [i, l] of lines.entries()) {
    const n = `Item ${i + 1}`
    if (!l.description.trim()) return `${n}: deskripsi wajib diisi.`
    if (normalizeAmount(l.quantity || '1') === null) return `${n}: qty harus berupa angka.`
    if (normalizeAmount(l.unitPrice) === null) return `${n}: harga harus berupa angka.`
    if (percent(l.discountPercent) === null) return `${n}: diskon harus 0–100.`
    if (percent(l.taxPercent) === null) return `${n}: pajak harus 0–100.`
  }
  return null
}

export function buildItemsPayload(lines: EditorLine[]): LineItemInput[] {
  return lines.map((l) => ({
    product_id: l.productId || undefined,
    description: l.description.trim(),
    quantity: normalizeAmount(l.quantity || '1') || '1',
    unit_price: normalizeAmount(l.unitPrice) || '0',
    discount_percent: l.discountPercent.trim()
      ? (percent(l.discountPercent) ?? undefined)
      : undefined,
    tax_percent: percent(l.taxPercent) ?? '0',
    unit: l.unit.trim() || undefined,
  }))
}

/** "1500000.50" → "Rp 1.500.000,50"; nol pecahan dihilangkan (sama dengan PDF). */
export function formatRupiah(decimal: string): string {
  const [whole = '0', frac = ''] = (decimal || '0').split('.')
  const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const cents = frac.padEnd(2, '0').slice(0, 2)
  return cents === '00' ? `Rp ${grouped}` : `Rp ${grouped},${cents}`
}
