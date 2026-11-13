import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const { periods, record, resend, controlGet, can } = vi.hoisted(() => ({
  periods: vi.fn(),
  record: vi.fn(),
  resend: vi.fn(),
  controlGet: vi.fn(),
  can: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { arrears: { periods, record, resend } },
}))
vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { control: { get: controlGet } },
}))
vi.mock('@/features/mikrotik/composables/useMikrotikEnabled', () => ({
  useMikrotikEnabled: () => ({ value: true }),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can }) }))

import RecordArrearsDialog from './RecordArrearsDialog.vue'

const periodData = (hasTrigger = true) => ({
  has_trigger_product: hasTrigger,
  periods: [
    { index: 0, start: '2026-08-05', end: '2026-09-04', default_amount: '333000.00', conflict: '' },
    { index: 1, start: '2026-09-05', end: '2026-10-04', default_amount: '333000.00', conflict: '' },
    {
      index: 2,
      start: '2026-10-05',
      end: '2026-11-04',
      default_amount: '333000.00',
      conflict: 'Periode ini sudah punya invoice.',
    },
  ],
})

function mountDialog() {
  return mount(RecordArrearsDialog, {
    props: { open: true, contractId: 'ctr-1', accountId: 'acc-1' },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
}

const saveButton = (w: ReturnType<typeof mountDialog>) =>
  w.findAll('button').find((b) => b.text() === 'Simpan tunggakan')!

async function selectPeriod(w: ReturnType<typeof mountDialog>, start: string) {
  await w.find(`input[name="period-${start}"]`).setValue(true)
}

beforeEach(() => {
  for (const fn of [periods, record, resend, controlGet, can]) fn.mockReset()
  periods.mockResolvedValue(periodData())
  controlGet.mockResolvedValue({ mode: 'simulation' })
  can.mockReturnValue(true)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')
})

describe('RecordArrearsDialog', () => {
  it('lists the contract periods; a conflicting period cannot be selected and says why', async () => {
    const w = mountDialog()
    await flushPromises()
    expect(w.text()).toContain('5 Agu 2026 – 4 Sep 2026')
    const conflict = w.find('input[name="period-2026-10-05"]')
    expect((conflict.element as HTMLInputElement).disabled).toBe(true)
    expect(w.text()).toContain('Periode ini sudah punya invoice.')
  })

  it('selecting a period adds an editable row with the default amount, due date and an unchecked flag', async () => {
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    const amount = w.find('input[name="amount-2026-08-05"]')
    expect((amount.element as HTMLInputElement).value).toBe('333000.00')
    expect((w.find('input[name="due-2026-08-05"]').element as HTMLInputElement).value).toBe(
      '2026-08-05',
    )
    const flag = w.find('input[name="flag-2026-08-05"]')
    expect((flag.element as HTMLInputElement).checked).toBe(false)
    expect((flag.element as HTMLInputElement).disabled).toBe(false)
  })

  it('disables the flag with an explanation when the contract has no trigger product', async () => {
    periods.mockResolvedValue(periodData(false))
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    expect((w.find('input[name="flag-2026-08-05"]').element as HTMLInputElement).disabled).toBe(
      true,
    )
    expect(w.text()).toContain('tidak punya produk pemicu isolir')
  })

  it('disables the flag for a role without invoice.isolir_flag', async () => {
    can.mockImplementation((p: string) => p !== 'invoice.isolir_flag')
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    expect((w.find('input[name="flag-2026-08-05"]').element as HTMLInputElement).disabled).toBe(
      true,
    )
    expect(w.text()).toContain('Hanya pemilik')
  })

  it('asks for confirmation before flagging in active mode', async () => {
    controlGet.mockResolvedValue({ mode: 'active' })
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    await w.find('input[name="flag-2026-08-05"]').setValue(true)
    expect(w.text()).toContain('bisa langsung terisolir')
    expect((w.find('input[name="flag-2026-08-05"]').element as HTMLInputElement).checked).toBe(
      false,
    )
    await w
      .findAll('button')
      .find((b) => b.text() === 'Ya, ikutkan isolir')!
      .trigger('click')
    expect((w.find('input[name="flag-2026-08-05"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('keeps Save disabled until a reason is filled', async () => {
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
    await w.find('textarea[name="reason"]').setValue('Tunggakan sebelum pakai sistem')
    expect(saveButton(w).attributes('disabled')).toBeUndefined()
  })

  it('records with one idempotency key and shows the summary; failed send offers resend', async () => {
    record.mockResolvedValue({
      recording: {
        id: 'rec-1',
        notify_status: 'failed',
        notify_error: 'Email: Pelanggan belum punya email.',
      },
      invoices: [
        {
          id: 'inv-1',
          invoice_number: 'INV-2026-0101',
          status: 'overdue',
          grand_total: '300000.00',
        },
      ],
      notify_status: 'failed',
    })
    resend.mockResolvedValue({ id: 'rec-1', notify_status: 'sent', notify_error: '' })
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    await w.find('input[name="amount-2026-08-05"]').setValue('300000')
    await w.find('textarea[name="reason"]').setValue('lama')
    await saveButton(w).trigger('click')
    await flushPromises()
    expect(record).toHaveBeenCalledWith(
      {
        account_id: 'acc-1',
        contract_id: 'ctr-1',
        reason: 'lama',
        rows: [
          {
            period_start: '2026-08-05',
            amount: '300000',
            due_date: '2026-08-05',
            isolir_flag: false,
          },
        ],
      },
      '11111111-1111-4111-8111-111111111111',
    )
    expect(w.text()).toContain('INV-2026-0101')
    expect(w.text()).toContain('Pelanggan belum punya email.')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Kirim ulang')!
      .trigger('click')
    await flushPromises()
    expect(resend).toHaveBeenCalledWith('rec-1')
    expect(w.text()).toContain('Pesan ringkasan terkirim')
  })

  it('shows the conflicting periods on 409', async () => {
    record.mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'ARREARS_CONFLICT',
          message: 'Ada periode yang sudah punya invoice.',
          data: {
            conflicts: [
              { row: 1, period_start: '2026-08-05', reason: 'Periode ini sudah punya invoice.' },
            ],
          },
        },
      },
    })
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    await w.find('textarea[name="reason"]').setValue('lama')
    await saveButton(w).trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('5 Agu 2026')
    expect(w.find('[role="alert"]').text()).toContain('sudah punya invoice')
  })

  it('asks for confirmation while the tenant mode is still loading', async () => {
    controlGet.mockReturnValue(new Promise(() => {}))
    const w = mountDialog()
    await flushPromises()
    await selectPeriod(w, '2026-08-05')
    await w.find('input[name="flag-2026-08-05"]').setValue(true)
    expect(w.text()).toContain('bisa langsung terisolir')
  })

  it('lists the newest period first and marks periods before the contract start', async () => {
    periods.mockResolvedValue({
      has_trigger_product: true,
      periods: [
        {
          index: -1,
          start: '2026-07-05',
          end: '2026-08-04',
          default_amount: '333000.00',
          conflict: '',
        },
        ...periodData().periods,
      ],
    })
    const w = mountDialog()
    await flushPromises()
    const names = w.findAll('input[name^="period-"]').map((i) => i.attributes('name'))
    expect(names[0]).toBe('period-2026-10-05')
    expect(names[names.length - 1]).toBe('period-2026-07-05')
    expect(w.text()).toContain('sebelum kontrak dimulai')
  })
})
