import { describe, expect, it } from 'vitest'

import {
  activationBadge,
  activationButtonLabel,
  buildActivationPayload,
  canCreateActivation,
  formatWib,
  validateActivationForm,
  type ActivationFormState,
} from './activation-state'

const form = (over: Partial<ActivationFormState> = {}): ActivationFormState => ({
  buyer_name: 'Budi',
  buyer_contact: '0812',
  buyer_email: '',
  price: '150000',
  duration_value: 1,
  duration_unit: 'month',
  due_value: 1,
  due_unit: 'hour',
  ...over,
})

describe('formatWib', () => {
  it('renders UTC timestamps in WIB (UTC+7)', () => {
    expect(formatWib('2026-10-25T17:30:00Z')).toBe('26 Okt 2026 00.30 WIB')
  })
})

describe('activationBadge', () => {
  it('shows nothing for none / missing state', () => {
    expect(activationBadge({})).toBeNull()
    expect(activationBadge({ activation_state: 'none' })).toBeNull()
  })
  it('describes preview with the invoice due date', () => {
    const b = activationBadge({
      activation_state: 'preview',
      open_activation: {
        id: 'a',
        buyer_name: 'B',
        price: '1',
        invoice_due_at: '2026-10-25T03:00:00Z',
      },
    })
    expect(b?.kind).toBe('preview')
    expect(b?.label).toBe('Preview — menunggu pembayaran sampai 25 Okt 2026 10.00 WIB')
  })
  it('describes publish with active_until', () => {
    const b = activationBadge({ activation_state: 'publish', active_until: '2026-11-25T03:00:00Z' })
    expect(b?.label).toBe('Terbit sampai 25 Nov 2026 10.00 WIB')
  })
  it('describes expired', () => {
    expect(activationBadge({ activation_state: 'expired' })?.label).toBe('Kedaluwarsa')
  })
})

describe('activationButtonLabel', () => {
  it('switches to Perpanjang only when expired', () => {
    expect(activationButtonLabel('expired')).toBe('Perpanjang')
    expect(activationButtonLabel('none')).toBe('Create invoice')
    expect(activationButtonLabel(undefined)).toBe('Create invoice')
  })
})

describe('canCreateActivation', () => {
  it('only for non-template grapesjs pages', () => {
    expect(canCreateActivation({ builder: 'grapesjs', is_template: false })).toBe(true)
    expect(canCreateActivation({ builder: 'sections', is_template: false })).toBe(false)
    expect(canCreateActivation({ builder: 'grapesjs', is_template: true })).toBe(false)
  })
})

describe('buildActivationPayload', () => {
  it('maps hours to invoice_due_hours and omits email when empty', () => {
    expect(buildActivationPayload(form())).toEqual({
      buyer_name: 'Budi',
      buyer_contact: '0812',
      price: '150000',
      duration_value: 1,
      duration_unit: 'month',
      invoice_due_hours: 1,
    })
  })
  it('maps days to invoice_due_days and trims', () => {
    expect(
      buildActivationPayload(
        form({ due_unit: 'day', due_value: 3, buyer_email: ' a@b.co ', buyer_name: ' Budi ' }),
      ),
    ).toEqual({
      buyer_name: 'Budi',
      buyer_contact: '0812',
      buyer_email: 'a@b.co',
      price: '150000',
      duration_value: 1,
      duration_unit: 'month',
      invoice_due_days: 3,
    })
  })
})

describe('validateActivationForm', () => {
  it('accepts a valid form', () => {
    expect(validateActivationForm(form())).toEqual({})
  })
  it('flags required, email, price and numbers', () => {
    const e = validateActivationForm(
      form({ buyer_name: ' ', buyer_contact: '', buyer_email: 'x', price: '0', duration_value: 0 }),
    )
    expect(Object.keys(e).sort()).toEqual(
      ['buyer_contact', 'buyer_email', 'buyer_name', 'duration_value', 'price'].sort(),
    )
  })
  it('rejects non-decimal price and over-range due values', () => {
    expect(validateActivationForm(form({ price: '1,5' })).price).toBeTruthy()
    expect(validateActivationForm(form({ price: '10.555' })).price).toBeTruthy()
    expect(validateActivationForm(form({ due_unit: 'day', due_value: 31 })).due_value).toBeTruthy()
    expect(
      validateActivationForm(form({ due_unit: 'hour', due_value: 721 })).due_value,
    ).toBeTruthy()
  })
})

describe('canCreateActivation eligibility', () => {
  it('excludes archived and soft-deleted pages', () => {
    const base = { builder: 'grapesjs', is_template: false } as const
    expect(canCreateActivation({ ...base, status: 'archived' })).toBe(false)
    expect(canCreateActivation({ ...base, deleted_at: '2026-10-01T00:00:00Z' })).toBe(false)
    expect(canCreateActivation({ ...base, status: 'draft' })).toBe(true)
  })
})
