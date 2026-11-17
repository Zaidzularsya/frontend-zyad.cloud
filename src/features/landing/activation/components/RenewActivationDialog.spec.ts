import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const renew = vi.hoisted(() => vi.fn())
vi.mock('../api/activation.api', () => ({ activationApi: { renew } }))
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

import RenewActivationDialog from './RenewActivationDialog.vue'
import type { ActivationInvoiceRow } from '../utils/activation-invoices'

const row: ActivationInvoiceRow = {
  id: 'a1',
  page_id: 'p1',
  page_title: 'Undangan Budi',
  page_slug: 'undangan-budi',
  page_status: 'draft',
  page_active_until: null,
  invoice_id: 'inv-1',
  buyer_name: 'Budi',
  buyer_contact: '081234567890',
  buyer_email: null,
  price: '150000.00',
  duration_value: 1,
  duration_unit: 'month',
  invoice_due_at: '2026-10-26T05:00:00Z',
  status: 'open',
  state: 'expired',
  paid_at: null,
  created_at: '2026-10-26T04:00:00Z',
  payment_url: 'https://zyad.cloud/i/PAY',
}

function mountDialog(extra: Record<string, unknown> = {}) {
  return mount(RenewActivationDialog, {
    props: { open: true, row, ...extra },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
}

beforeEach(() => {
  renew.mockReset()
})

describe('RenewActivationDialog', () => {
  it('default masa berlaku 24 jam dan menyebut efeknya pada link lama', () => {
    const w = mountDialog()
    expect((w.get('input[name="due_value"]').element as HTMLInputElement).value).toBe('24')
    expect((w.get('select[name="due_unit"]').element as HTMLSelectElement).value).toBe('hour')
    expect(w.text()).toContain('Undangan Budi')
    expect(w.text()).toMatch(/link preview lama.*tidak (berlaku|bisa)/i)
  })

  it('mengirim payload jam/hari lalu menampilkan link baru dan memberi tahu pemanggil', async () => {
    renew.mockResolvedValue({
      activation: { id: 'a1', invoice_due_at: '2026-10-28T05:00:00Z' },
      preview_url: 'https://reseller.zyad.cloud/preview/NEW',
      payment_url: 'https://zyad.cloud/i/PAY',
    })
    const w = mountDialog()
    await w.get('input[name="due_value"]').setValue('2')
    await w.get('select[name="due_unit"]').setValue('day')
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(renew).toHaveBeenCalledWith('a1', { invoice_due_days: 2 })
    expect((w.get('input[name="preview_url"]').element as HTMLInputElement).value).toBe(
      'https://reseller.zyad.cloud/preview/NEW',
    )
    expect(w.emitted('renewed')).toHaveLength(1)
    expect(w.find('form').exists()).toBe(false)
  })

  it('masa berlaku di luar batas tidak memanggil API', async () => {
    const w = mountDialog()
    await w.get('input[name="due_value"]').setValue('721')
    await w.get('form').trigger('submit')
    expect(renew).not.toHaveBeenCalled()
    expect(w.text()).toContain('1–720')
  })

  it('menampilkan galat server dan tetap bisa dicoba lagi', async () => {
    renew.mockRejectedValue({
      response: {
        status: 422,
        data: { code: 'ACTIVATION_NO_PUBLIC_HOST', message: 'Tambahkan domain aktif dulu.' },
      },
    })
    const w = mountDialog()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('Tambahkan domain aktif dulu.')
    expect(w.find('form').exists()).toBe(true)
    expect(w.emitted('renewed')).toBeUndefined()
  })
})
