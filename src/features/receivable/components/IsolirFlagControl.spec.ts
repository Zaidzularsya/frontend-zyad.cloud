import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const { setIsolirFlag, controlGet, can } = vi.hoisted(() => ({
  setIsolirFlag: vi.fn(),
  controlGet: vi.fn(),
  can: vi.fn(),
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { invoices: { setIsolirFlag } },
}))
vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { control: { get: controlGet } },
}))
vi.mock('@/features/mikrotik/composables/useMikrotikEnabled', () => ({
  useMikrotikEnabled: () => ({ value: true }),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ can }) }))

import IsolirFlagControl from './IsolirFlagControl.vue'

const invoice = (over: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  status: 'overdue',
  isolir_flag: false,
  arrears_recording_id: 'rec-1',
  ...over,
})

function mountControl(inv = invoice()) {
  return mount(IsolirFlagControl, {
    props: { invoice: inv as never },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
}

const toggle = (w: ReturnType<typeof mountControl>) => w.find('input[name="isolir_flag"]')

beforeEach(() => {
  for (const fn of [setIsolirFlag, controlGet, can]) fn.mockReset()
  setIsolirFlag.mockResolvedValue(invoice({ isolir_flag: true }))
  controlGet.mockResolvedValue({ mode: 'simulation' })
  can.mockReturnValue(true)
})

describe('IsolirFlagControl', () => {
  it('owner turns the flag on without confirmation outside active mode', async () => {
    const w = mountControl()
    await flushPromises()
    await toggle(w).setValue(true)
    await flushPromises()
    expect(setIsolirFlag).toHaveBeenCalledWith('inv-1', true)
  })

  it('asks for confirmation in active mode and only saves after it', async () => {
    controlGet.mockResolvedValue({ mode: 'active' })
    const w = mountControl()
    await flushPromises()
    await toggle(w).setValue(true)
    expect(setIsolirFlag).not.toHaveBeenCalled()
    expect(w.text()).toContain('bisa langsung terisolir')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Ya, ikutkan isolir')!
      .trigger('click')
    await flushPromises()
    expect(setIsolirFlag).toHaveBeenCalledWith('inv-1', true)
  })

  it('turning the flag off needs no confirmation even in active mode', async () => {
    controlGet.mockResolvedValue({ mode: 'active' })
    const w = mountControl(invoice({ isolir_flag: true }))
    await flushPromises()
    await toggle(w).setValue(false)
    await flushPromises()
    expect(setIsolirFlag).toHaveBeenCalledWith('inv-1', false)
  })

  it('a role without invoice.isolir_flag only sees the state', async () => {
    can.mockImplementation((p: string) => p !== 'invoice.isolir_flag')
    const w = mountControl(invoice({ isolir_flag: true }))
    await flushPromises()
    expect(toggle(w).exists()).toBe(false)
    expect(w.text()).toContain('Ikut isolir')
  })

  it('shows no control on paid or void invoices', async () => {
    for (const status of ['paid', 'void']) {
      const w = mountControl(invoice({ status }))
      await flushPromises()
      expect(toggle(w).exists()).toBe(false)
    }
  })
})
