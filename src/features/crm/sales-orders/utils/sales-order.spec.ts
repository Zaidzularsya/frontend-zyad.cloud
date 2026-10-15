import { describe, expect, it } from 'vitest'

import type {
  SalesOrderDraftForm,
  SalesOrderItem,
} from '@/features/crm/sales-orders/api/sales-orders.api'
import { groupSalesOrderItems, validateSalesOrderDraft } from './sales-order'

const item = (over: Partial<SalesOrderItem>): SalesOrderItem => ({
  id: 'i',
  description: 'x',
  quantity: '1',
  unit: '',
  unit_price: '1',
  discount_percent: '',
  tax_percent: '0',
  tax_amount: '0',
  line_total: '1',
  charge_type: 'one_time',
  billing_frequency: null,
  payment_timing: 'prepaid',
  delivery_status: 'not_applicable',
  delivered_at: null,
  delivery_note: '',
  invoice_id: '',
  position: 0,
  ...over,
})

const form = (over: Partial<SalesOrderDraftForm> = {}): SalesOrderDraftForm => ({
  start_date: '2026-10-05',
  bill_to_name: 'Budi',
  bill_to_company: '',
  bill_to_email: 'budi@example.com',
  bill_to_phone: '0812',
  bill_to_address: '',
  channels: ['email'],
  pic_user_id: '',
  ...over,
})

const NOW = new Date('2026-10-05T03:00:00Z') // 5 Okt 2026 10:00 WIB

describe('groupSalesOrderItems', () => {
  it('returns the three groups in fixed order and drops empty ones', () => {
    const groups = groupSalesOrderItems([
      item({ id: 'a', charge_type: 'recurring', billing_frequency: 'monthly' }),
      item({ id: 'b', payment_timing: 'postpaid' }),
      item({ id: 'c' }),
    ])
    expect(groups.map((g) => g.title)).toEqual([
      'Sekali bayar · Prabayar',
      'Sekali bayar · Pascabayar',
      'Berulang',
    ])
    expect(groupSalesOrderItems([item({ id: 'c' })]).map((g) => g.title)).toEqual([
      'Sekali bayar · Prabayar',
    ])
  })
})

describe('validateSalesOrderDraft', () => {
  it('accepts a complete form', () => {
    expect(validateSalesOrderDraft(form(), true, NOW)).toEqual([])
  })

  it('requires a start date no older than 30 days', () => {
    expect(validateSalesOrderDraft(form({ start_date: '' }), true, NOW)).toContain(
      'Tanggal mulai wajib diisi.',
    )
    expect(validateSalesOrderDraft(form({ start_date: '2026-09-05' }), true, NOW)).toEqual([])
    expect(validateSalesOrderDraft(form({ start_date: '2026-09-04' }), true, NOW)).toContain(
      'Tanggal mulai paling awal 30 hari yang lalu.',
    )
  })

  it('validates the email channel', () => {
    expect(validateSalesOrderDraft(form({ bill_to_email: 'bukan-email' }), true, NOW)).toContain(
      'Email penagihan tidak valid.',
    )
  })

  it('requires a CRM contact and phone for WhatsApp', () => {
    const wa = form({ channels: ['whatsapp'] })
    expect(validateSalesOrderDraft(wa, false, NOW)).toContain(
      'WhatsApp butuh kontak CRM dan nomor telepon.',
    )
    expect(
      validateSalesOrderDraft(form({ channels: ['whatsapp'], bill_to_phone: '' }), true, NOW),
    ).toContain('WhatsApp butuh kontak CRM dan nomor telepon.')
    expect(validateSalesOrderDraft(wa, true, NOW)).toEqual([])
  })

  it('requires at least one channel and a name', () => {
    const errors = validateSalesOrderDraft(form({ channels: [], bill_to_name: ' ' }), true, NOW)
    expect(errors).toHaveLength(2)
  })
})
