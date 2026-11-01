import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import RouterFormModal from '@/features/mikrotik/components/RouterFormModal.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { routerFixture } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { routers: { create: vi.fn(), update: vi.fn() } },
}))

describe('RouterFormModal', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.routers.update).mockReset().mockResolvedValue(routerFixture())
    vi.mocked(mikrotikApi.routers.create).mockReset().mockResolvedValue(routerFixture())
    document.body.innerHTML = ''
  })

  function mountForm(router?: ReturnType<typeof routerFixture>) {
    return mount(RouterFormModal, {
      props: { open: true, router },
      global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
      attachTo: document.body,
    })
  }

  it('omits password from PATCH when left empty', async () => {
    mountForm(routerFixture())
    await flushPromises()
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    const payload = vi.mocked(mikrotikApi.routers.update).mock.calls[0]?.[1]
    expect(payload).toBeDefined()
    expect(payload).not.toHaveProperty('password')
    expect(payload).toMatchObject({ name: 'Core-1', host: '10.0.0.1', port: 8728 })
  })

  it('sends password on PATCH when filled', async () => {
    mountForm(routerFixture())
    await flushPromises()
    const input = document.body.querySelector('input[name="password"]') as HTMLInputElement
    input.value = 'rahasia'
    input.dispatchEvent(new Event('input'))
    document.body.querySelector('form')?.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(vi.mocked(mikrotikApi.routers.update).mock.calls[0]?.[1]).toMatchObject({
      password: 'rahasia',
    })
  })
})
