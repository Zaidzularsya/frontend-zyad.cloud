import { normalizePricing } from '@/features/catalog/utils/pricing'
import { normalizeAmount } from '@/features/crm/leads/utils/convert-form'
import {
  buildItemsPayload,
  formatRupiah,
  validateLines,
  type EditorLine,
} from '@/features/crm/quotations/utils/quotation-editor'
import type {
  Invoice,
  InvoiceItemPayload,
  InvoicePayload,
  SendChannel,
} from '@/features/receivable/api/receivable.api'

// Baris invoice memakai model baris yang sama dengan editor quotation (harga, diskon, pajak,
// atribut penagihan), jadi hitungan total di layar identik dengan backend.
export interface InvoiceForm {
  accountId: string
  channels: SendChannel[]
  picUserId: string
  notes: string
  periodStart: string
  periodEnd: string
  lines: EditorLine[]
}

export function blankInvoiceForm(defaultChannels: SendChannel[]): InvoiceForm {
  return {
    accountId: '',
    channels: defaultChannels.length > 0 ? [...defaultChannels] : ['email'],
    picUserId: '',
    notes: '',
    periodStart: '',
    periodEnd: '',
    lines: [],
  }
}

let seq = 0

export function formFromInvoice(inv: Invoice): InvoiceForm {
  return {
    accountId: inv.account.id,
    channels: inv.channels.length > 0 ? [...inv.channels] : ['email'],
    picUserId: inv.pic_user_id ?? '',
    notes: inv.notes ?? '',
    periodStart: inv.period_start ?? '',
    periodEnd: inv.period_end ?? '',
    lines: inv.items.map((it) => ({
      key: `inv${++seq}`,
      productId: it.product_id ?? '',
      sku: it.sku ?? '',
      description: it.description,
      quantity: it.quantity,
      unit: it.unit ?? '',
      unitPrice: it.unit_price,
      discountPercent: it.discount_percent ?? '',
      taxPercent: it.tax_percent ?? '0',
      pricing: normalizePricing({
        charge_type: it.charge_type,
        billing_frequency: it.billing_frequency,
        payment_timing: it.payment_timing,
      }),
      features: [], // fitur produk hanya untuk penawaran
    })),
  }
}

export function buildInvoicePayload(form: InvoiceForm): InvoicePayload {
  const items: InvoiceItemPayload[] = buildItemsPayload(form.lines).map((item) => {
    const base: InvoiceItemPayload = {
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_id: item.product_id,
      discount_percent: item.discount_percent,
      tax_percent: item.tax_percent,
      unit: item.unit,
      charge_type: item.charge_type ?? 'one_time',
      billing_frequency: item.billing_frequency ?? null,
      payment_timing: item.payment_timing ?? 'prepaid',
    }
    // Hanya baris berulang yang ditagih untuk satu periode; baris sekali bayar tidak punya periode.
    if (base.charge_type === 'recurring' && form.periodStart && form.periodEnd) {
      base.period_start = form.periodStart
      base.period_end = form.periodEnd
    }
    return base
  })
  // sku hanya ada di EditorLine (buildItemsPayload tidak membawanya): sertakan sebagai snapshot katalog.
  form.lines.forEach((l, i) => {
    const item = items[i]
    if (item && l.sku.trim()) item.sku = l.sku.trim()
  })
  return {
    account_id: form.accountId,
    channels: form.channels,
    pic_user_id: form.picUserId || undefined,
    notes: form.notes.trim() || undefined,
    period_start: form.periodStart || undefined,
    period_end: form.periodEnd || undefined,
    items,
  }
}

export function validateInvoiceForm(form: InvoiceForm): string | null {
  if (!form.accountId) return 'Pilih pelanggan.'
  if (form.channels.length === 0) return 'Pilih minimal satu kanal pengiriman.'
  const lineError = validateLines(form.lines)
  if (lineError) return lineError
  if (Boolean(form.periodStart) !== Boolean(form.periodEnd))
    return 'Isi kedua tanggal periode atau kosongkan keduanya.'
  if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart)
    return 'Akhir periode tidak boleh sebelum awal periode.'
  return null
}

/** "12.5" → 1250n (dua desimal → sen); null bila lebih dari dua desimal. */
function toCents(decimal: string): bigint | null {
  const [whole = '0', frac = ''] = decimal.split('.')
  if (frac.length > 2) return null
  return BigInt(whole || '0') * 100n + BigInt((frac + '00').slice(0, 2))
}

export function validatePayment(amount: string, balance: string): string | null {
  const normalized = normalizeAmount(amount.trim())
  const cents = normalized ? toCents(normalized) : null
  if (cents === null) return 'Jumlah harus berupa angka.'
  if (cents <= 0n) return 'Jumlah harus lebih dari 0.'
  const balanceCents = toCents(balance) ?? 0n
  if (cents > balanceCents) return `Jumlah melebihi sisa tagihan (${formatRupiah(balance)}).`
  return null
}
