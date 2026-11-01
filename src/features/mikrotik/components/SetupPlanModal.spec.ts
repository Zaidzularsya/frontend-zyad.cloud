import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import SetupPlanModal from '@/features/mikrotik/components/SetupPlanModal.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { planFixture, routerFixture } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { setup: { preview: vi.fn(), apply: vi.fn(), cleanup: vi.fn() } },
}))

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
})
