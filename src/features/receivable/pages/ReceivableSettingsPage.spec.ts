import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const { get, update, senders, can } = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  senders: vi.fn(),
  can: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { settings: { get, update }, senders },
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can }) }))

import ReceivableSettingsPage from './ReceivableSettingsPage.vue'

async function mountPage() {
  const w = mount(ReceivableSettingsPage, {
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  return w
}

describe('ReceivableSettingsPage', () => {
  beforeEach(() => {
    for (const fn of [get, update, senders, can]) fn.mockReset()
    can.mockReturnValue(true)
    get.mockResolvedValue({
      invoice_lead_days: 7,
      payment_terms_days: 14,
      default_channels: ['email'],
      default_sender_user_id: 'u1',
      default_billing_day: 10,
    })
    senders.mockResolvedValue([{ user_id: 'u1', name: 'Sari', email: 'sari@example.com' }])
  })

  it('loads the saved settings into the form', async () => {
    const w = await mountPage()
    expect((w.get('input[name="payment_terms_days"]').element as HTMLInputElement).value).toBe('14')
    expect((w.get('input[name="invoice_lead_days"]').element as HTMLInputElement).value).toBe('7')
    expect((w.get('select[name="default_sender"]').element as HTMLSelectElement).value).toBe('u1')
    expect(w.text()).toContain('Sari (sari@example.com)')
  })

  it('rejects out-of-range values before calling the server', async () => {
    const w = await mountPage()
    await w.get('input[name="invoice_lead_days"]').setValue('61')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(update).not.toHaveBeenCalled()
    expect(w.text()).toContain('Hari kirim sebelum periode harus 0–60.')

    await w.get('input[name="invoice_lead_days"]').setValue('5')
    await w.get('input[name="payment_terms_days"]').setValue('91')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Termin pembayaran harus 0–90 hari.')
    expect(update).not.toHaveBeenCalled()
  })

  it('requires at least one default channel', async () => {
    const w = await mountPage()
    await w.get('input[name="channel-email"]').setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Pilih minimal satu kanal default.')
    expect(update).not.toHaveBeenCalled()
  })

  it('saves a valid form', async () => {
    update.mockResolvedValue({})
    const w = await mountPage()
    await w.get('input[name="payment_terms_days"]').setValue('30')
    await w.get('input[name="channel-whatsapp"]').setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith({
      invoice_lead_days: 7,
      payment_terms_days: 30,
      default_channels: ['email', 'whatsapp'],
      default_sender_user_id: 'u1',
      // PUT mengganti semua field: default yang tersimpan harus ikut terkirim agar tidak terhapus.
      default_billing_day: 10,
    })
  })

  it('menyimpan default tanggal tagih dan menolak di luar 1–31', async () => {
    update.mockResolvedValue({})
    const w = await mountPage()
    const day = w.get('input[name="default_billing_day"]')
    expect((day.element as HTMLInputElement).value).toBe('10')

    for (const bad of ['0', '32', '2.5']) {
      await day.setValue(bad)
      await w.get('form').trigger('submit')
      await flushPromises()
      expect(w.text()).toContain('Default tanggal tagih harus 1–31.')
    }
    expect(update).not.toHaveBeenCalled()

    await day.setValue('31')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ default_billing_day: 31 }))
  })

  it('mengosongkan default tanggal tagih mengirim null', async () => {
    update.mockResolvedValue({})
    const w = await mountPage()
    await w.get('input[name="default_billing_day"]').setValue('')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ default_billing_day: null }))
  })

  it('is read-only without receivable.settings', async () => {
    can.mockReturnValue(false)
    const w = await mountPage()
    expect((w.get('input[name="payment_terms_days"]').element as HTMLInputElement).disabled).toBe(
      true,
    )
    expect(w.findAll('button').some((b) => b.text() === 'Simpan')).toBe(false)
    expect(senders).not.toHaveBeenCalled()
  })
})
