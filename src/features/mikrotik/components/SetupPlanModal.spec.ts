import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import SetupPlanModal from '@/features/mikrotik/components/SetupPlanModal.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { planFixture, routerFixture } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { setup: { preview: vi.fn(), apply: vi.fn(), cleanup: vi.fn() } },
}))

function findButton(label: string) {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )
}

function mountModal() {
  return mount(SetupPlanModal, {
    props: { open: true, router: routerFixture() },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
    attachTo: document.body,
  })
}

describe('SetupPlanModal', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.setup.preview).mockReset().mockResolvedValue(planFixture())
    vi.mocked(mikrotikApi.setup.apply).mockReset().mockResolvedValue(routerFixture())
    document.body.innerHTML = ''
  })

  it('renders plan actions verbatim and applies with the preview plan_hash', async () => {
    const w = mountModal()
    await flushPromises()
    expect(mikrotikApi.setup.preview).toHaveBeenCalledWith('r1', {})
    const text = document.body.textContent ?? ''
    expect(text).toContain('/ppp/profile')
    expect(text).toContain('name=zyad-isolir')
    expect(text).toContain('local-address=10.255.254.1')
    expect(text).toContain('/ip/firewall/nat')
    const apply = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Terapkan',
    )
    apply?.click()
    await flushPromises()
    expect(mikrotikApi.setup.apply).toHaveBeenCalledWith('r1', { plan_hash: 'hash-abc' })
    expect(w.emitted('applied')).toHaveLength(1)
  })

  it('re-previews when the plan changed', async () => {
    vi.mocked(mikrotikApi.setup.apply).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_SETUP_PLAN_CHANGED', message: 'berubah' } },
    })
    mountModal()
    await flushPromises()
    const apply = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Terapkan',
    )
    apply?.click()
    await flushPromises()
    expect(mikrotikApi.setup.preview).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).toContain('Rencana berubah')
  })

  it('applies with the NEW hash after a PLAN_CHANGED re-preview', async () => {
    vi.mocked(mikrotikApi.setup.preview)
      .mockReset()
      .mockResolvedValueOnce(planFixture())
      .mockResolvedValueOnce({ ...planFixture(), hash: 'hash-new' })
    vi.mocked(mikrotikApi.setup.apply).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_SETUP_PLAN_CHANGED', message: 'berubah' } },
    })
    mountModal()
    await flushPromises()
    findButton('Terapkan')?.click()
    await flushPromises()
    findButton('Terapkan')?.click()
    await flushPromises()
    expect(vi.mocked(mikrotikApi.setup.apply).mock.calls[1]?.[1]).toEqual({ plan_hash: 'hash-new' })
  })

  it('keeps Terapkan disabled until a preview exists', async () => {
    vi.mocked(mikrotikApi.setup.preview)
      .mockReset()
      .mockReturnValue(new Promise(() => {}))
    mountModal()
    await flushPromises()
    expect(findButton('Terapkan')?.disabled).toBe(true)
    expect(mikrotikApi.setup.apply).not.toHaveBeenCalled()
  })

  it('sends the same non-empty advanced payload plus plan_hash', async () => {
    mountModal()
    await flushPromises()
    const input = document.body.querySelector('input[name="profile_name"]') as HTMLInputElement
    input.value = 'isolir-x'
    input.dispatchEvent(new Event('input'))
    const hosts = document.body.querySelector('input[name="doku_hosts"]') as HTMLInputElement
    hosts.value = 'a.doku.com, b.doku.com'
    hosts.dispatchEvent(new Event('input'))
    findButton('Pratinjau ulang')?.click()
    await flushPromises()
    const expected = { profile_name: 'isolir-x', doku_hosts: ['a.doku.com', 'b.doku.com'] }
    expect(mikrotikApi.setup.preview).toHaveBeenLastCalledWith('r1', expected)
    findButton('Terapkan')?.click()
    await flushPromises()
    expect(mikrotikApi.setup.apply).toHaveBeenCalledWith('r1', {
      ...expected,
      plan_hash: 'hash-abc',
    })
  })
})
