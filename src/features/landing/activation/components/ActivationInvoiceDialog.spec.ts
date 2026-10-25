import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const createInvoice = vi.hoisted(() => vi.fn())
vi.mock('../api/activation.api', () => ({ activationApi: { createInvoice } }))
vi.mock('@/features/entitlements/api/entitlements.api', () => ({
  entitlementsApi: { summary: vi.fn().mockResolvedValue([]) },
}))

import ActivationInvoiceDialog from './ActivationInvoiceDialog.vue'

function mountDialog(extra: Record<string, unknown> = {}) {
  return mount(ActivationInvoiceDialog, {
    props: { open: true, pageId: 'p1', pageTitle: 'Undangan Budi', ...extra },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
}

async function fill(w: ReturnType<typeof mountDialog>) {
  await w.get('input[name="buyer_name"]').setValue('Budi')
  await w.get('input[name="buyer_contact"]').setValue('0812')
  await w.get('input[name="price"]').setValue('150000')
}

function apiError(status: number, code: string, message = 'x') {
  return { response: { status, data: { success: false, code, message } } }
}

beforeEach(() => {
  createInvoice.mockReset()
})

describe('ActivationInvoiceDialog', () => {
  it('defaults the invoice due to 1 jam and the duration to 1 bulan', () => {
    const w = mountDialog()
    expect((w.get('input[name="due_value"]').element as HTMLInputElement).value).toBe('1')
    expect((w.get('select[name="due_unit"]').element as HTMLSelectElement).value).toBe('hour')
    expect((w.get('select[name="duration_unit"]').element as HTMLSelectElement).value).toBe('month')
  })

  it('does not call the API while required fields are invalid', async () => {
    const w = mountDialog()
    await w.get('form').trigger('submit')
    expect(createInvoice).not.toHaveBeenCalled()
    expect(w.text()).toContain('Nama penagih wajib diisi')
  })

  it('sends the exact payload (price string, hours)', async () => {
    createInvoice.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'https://x.test/api/v1/public/landing/preview/TOKEN',
      payment_url: 'https://x.test/i/PAY',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(createInvoice).toHaveBeenCalledWith('p1', {
      buyer_name: 'Budi',
      buyer_contact: '0812',
      price: '150000',
      duration_value: 1,
      duration_unit: 'month',
      invoice_due_hours: 1,
    })
  })

  it('maps days to invoice_due_days', async () => {
    createInvoice.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'u',
      payment_url: 'p',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('select[name="due_unit"]').setValue('day')
    await w.get('input[name="due_value"]').setValue('2')
    await w.get('form').trigger('submit')
    await flushPromises()
    const payload = createInvoice.mock.calls[0]![1]
    expect(payload.invoice_due_days).toBe(2)
    expect(payload).not.toHaveProperty('invoice_due_hours')
  })

  it('shows both links once with the one-time note and emits created', async () => {
    createInvoice.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'https://x.test/api/v1/public/landing/preview/TOKEN',
      payment_url: 'https://x.test/i/PAY',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect((w.get('input[name="preview_url"]').element as HTMLInputElement).value).toBe(
      'https://x.test/api/v1/public/landing/preview/TOKEN',
    )
    expect((w.get('input[name="payment_url"]').element as HTMLInputElement).value).toBe(
      'https://x.test/i/PAY',
    )
    expect(w.text()).toContain('hanya ditampilkan sekali')
    expect(w.findAll('button').filter((b) => b.text() === 'Salin')).toHaveLength(2)
    expect(w.emitted('created')).toHaveLength(1)
  })

  it('shows the ACTIVATION_OPEN message', async () => {
    createInvoice.mockRejectedValue(apiError(409, 'ACTIVATION_OPEN'))
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Masih ada invoice yang menunggu pembayaran untuk halaman ini')
  })

  it('shows quota, forbidden and generic messages', async () => {
    const cases: Array<[unknown, string]> = [
      [apiError(409, 'QUOTA_EXCEEDED'), 'Kuota invoice bulan ini sudah penuh'],
      [apiError(403, 'FEATURE_NOT_ENABLED'), 'Fitur ini belum aktif untuk akun Anda'],
      [apiError(422, 'VALIDATION_ERROR', 'Harga tidak valid'), 'Harga tidak valid'],
      [apiError(500, 'X'), 'Gagal membuat invoice. Coba lagi.'],
    ]
    for (const [err, text] of cases) {
      createInvoice.mockReset()
      createInvoice.mockRejectedValue(err)
      const w = mountDialog()
      await fill(w)
      await w.get('form').trigger('submit')
      await flushPromises()
      expect(w.text()).toContain(text)
    }
  })

  it('prevents double submit while pending', async () => {
    let resolve!: (v: unknown) => void
    createInvoice.mockReturnValue(new Promise((r) => (resolve = r)))
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(createInvoice).toHaveBeenCalledTimes(1)
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    resolve({
      activation: { id: 'a', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'u',
      payment_url: 'p',
    })
    await flushPromises()
  })
})
