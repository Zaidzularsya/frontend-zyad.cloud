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
  await w.get('input[name="buyer_contact"]').setValue('081234567890')
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
    expect(w.text()).toContain('Nama pelanggan wajib diisi')
  })

  it('sends the exact payload (price string, hours)', async () => {
    createInvoice.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'https://x.test/preview/TOKEN',
      payment_url: 'https://x.test/i/PAY',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(createInvoice).toHaveBeenCalledWith('p1', {
      buyer_name: 'Budi',
      buyer_contact: '081234567890',
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
      preview_url: 'https://x.test/preview/TOKEN',
      payment_url: 'https://x.test/i/PAY',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect((w.get('input[name="preview_url"]').element as HTMLInputElement).value).toBe(
      'https://x.test/preview/TOKEN',
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

  it('ignores every close path while pending and keeps the link afterwards', async () => {
    let resolve!: (v: unknown) => void
    createInvoice.mockReturnValue(new Promise((r) => (resolve = r)))
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    const batal = w.findAll('button').find((b) => b.text() === 'Batal')!
    expect(batal.attributes('disabled')).toBeDefined()
    await batal.trigger('click')
    await w.get('button[aria-label="Tutup"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(w.emitted('close')).toBeUndefined()
    resolve({
      activation: { id: 'a', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'PREVIEW',
      payment_url: 'PAY',
    })
    await flushPromises()
    expect((w.get('input[name="preview_url"]').element as HTMLInputElement).value).toBe('PREVIEW')
  })

  it('stays open for retry after a failed request and allows close after success', async () => {
    createInvoice.mockRejectedValueOnce(apiError(500, 'X'))
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.emitted('close')).toBeUndefined()
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    createInvoice.mockResolvedValueOnce({
      activation: { id: 'a', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'P',
      payment_url: 'Q',
    })
    await w.get('form').trigger('submit')
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Selesai')!
      .trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('shows fresh state when reopened and copies the exact link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    createInvoice.mockResolvedValue({
      activation: { id: 'a', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'https://x.test/preview/TOKEN',
      payment_url: 'https://x.test/i/PAY',
    })
    const w = mountDialog()
    await fill(w)
    await w.get('form').trigger('submit')
    await flushPromises()
    await w
      .findAll('button')
      .filter((b) => b.text() === 'Salin')[0]!
      .trigger('click')
    expect(writeText).toHaveBeenCalledWith('https://x.test/preview/TOKEN')
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(w.find('input[name="preview_url"]').exists()).toBe(false)
    expect((w.get('input[name="buyer_name"]').element as HTMLInputElement).value).toBe('')
  })

  describe('berbagi lewat WhatsApp', () => {
    const created = {
      activation: { id: 'a1', invoice_due_at: '2026-10-25T03:00:00Z' },
      preview_url: 'https://reseller.zyad.cloud/preview/TOKEN',
      payment_url: 'https://zyad.cloud/i/PAY',
    }

    async function createdDialog() {
      createInvoice.mockResolvedValue(created)
      const w = mountDialog()
      await fill(w)
      await w.get('form').trigger('submit')
      await flushPromises()
      return w
    }

    it('menampilkan label yang relevan untuk pelanggan, bukan "penagih"', () => {
      const w = mountDialog()
      expect(w.text()).toContain('Nama pelanggan')
      expect(w.text()).toContain('Nomor WhatsApp pelanggan')
      expect(w.text()).not.toMatch(/penagih/i)
    })

    it('menolak nomor yang tidak bisa dipakai untuk WhatsApp', async () => {
      const w = mountDialog()
      await w.get('input[name="buyer_name"]').setValue('Budi')
      await w.get('input[name="buyer_contact"]').setValue('0812')
      await w.get('input[name="price"]').setValue('150000')
      await w.get('form').trigger('submit')
      expect(createInvoice).not.toHaveBeenCalled()
      expect(w.text()).toContain('Nomor WhatsApp tidak valid')
    })

    it('tombol kirim menargetkan nomor pelanggan dengan pesan berisi kedua link', async () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null)
      const w = await createdDialog()
      await w.get('[data-testid="share-whatsapp-all"]').trigger('click')

      expect(open).toHaveBeenCalledTimes(1)
      const [url, target, features] = open.mock.calls[0] as [string, string, string]
      expect(url.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
      const text = decodeURIComponent(url.split('?text=')[1] ?? '')
      expect(text).toContain('https://reseller.zyad.cloud/preview/TOKEN')
      expect(text).toContain('https://zyad.cloud/i/PAY')
      expect(text).toContain('Budi')
      expect(target).toBe('_blank')
      expect(features).toContain('noopener')
      open.mockRestore()
    })

    it('tombol per-link hanya membawa link masing-masing', async () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null)
      const w = await createdDialog()

      await w.get('[data-testid="share-whatsapp-preview"]').trigger('click')
      const previewText = decodeURIComponent(
        (open.mock.calls[0]?.[0] as string).split('?text=')[1] ?? '',
      )
      expect(previewText).toContain('/preview/TOKEN')
      expect(previewText).not.toContain('/i/PAY')

      await w.get('[data-testid="share-whatsapp-payment"]').trigger('click')
      const paymentText = decodeURIComponent(
        (open.mock.calls[1]?.[0] as string).split('?text=')[1] ?? '',
      )
      expect(paymentText).toContain('/i/PAY')
      expect(paymentText).not.toContain('/preview/TOKEN')
      open.mockRestore()
    })
  })
})
