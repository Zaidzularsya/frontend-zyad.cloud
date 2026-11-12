import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { secrets: { detail: vi.fn() }, onboard: { preview: vi.fn(), run: vi.fn() } },
}))
vi.mock('@/features/catalog/api/catalog.api', () => ({
  catalogApi: { products: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }) },
}))
vi.mock('@/features/receivable/api/receivable.api', () => ({
  receivableApi: { settings: { get: vi.fn().mockResolvedValue({ default_billing_day: null }) } },
}))

import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import SecretDetailPage from '@/features/mikrotik/pages/SecretDetailPage.vue'
import { secret } from '@/features/mikrotik/testing/fixtures'
import { useAuthStore } from '@/stores/auth.store'

const Stub = { template: '<div />' }

describe('SecretDetailPage', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.secrets.detail)
      .mockReset()
      .mockResolvedValue({
        secret: secret({
          id: 's1',
          name: 'budi@pppoe',
          disabled: true,
          profile: '10M',
          comment: 'Jl. Mawar 1',
          account_id: 'a1',
          account_name: 'Budi',
        }),
        onboarding: null,
        contract: null,
        can_onboard: true,
      })
  })

  it('menampilkan informasi secret dan status aktif', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().$patch((state) => {
      ;(state as { user: unknown }).user = {
        id: 'u',
        name: 'A',
        email: 'a@x.test',
        permissions: ['mikrotik_secret.read', 'mikrotik_secret.pair'],
      }
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/mikrotik/secrets/:id',
          name: 'mikrotik-secret-detail',
          component: SecretDetailPage,
        },
        { path: '/mikrotik/accounts', name: 'mikrotik-accounts', component: Stub },
        { path: '/crm/products', name: 'crm-products', component: Stub },
      ],
    })
    await router.push('/mikrotik/secrets/s1')
    const w = mount(SecretDetailPage, {
      global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await flushPromises()
    expect(mikrotikApi.secrets.detail).toHaveBeenCalledWith('s1')
    expect(w.text()).toContain('budi@pppoe')
    expect(w.text()).toContain('Nonaktif')
    expect(w.text()).toContain('Jl. Mawar 1')
    expect(w.text()).toContain('Budi')
  })
})
