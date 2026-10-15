import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

const stage = vi.hoisted(() => (id: string, position: number, extra = {}) => ({
  id,
  name: id,
  position,
  probability: '0',
  is_won: false,
  is_lost: false,
  ...extra,
}))
vi.mock('@/features/crm/deals/api/deals.api', () => ({
  dealsApi: {
    detail: vi.fn().mockResolvedValue({
      id: 'd1',
      title: 'Internet kantor',
      value: '15000000',
      currency: 'IDR',
      status: 'open',
      pipeline_id: 'p1',
      stage_id: 's2',
      contact_id: null,
      company_id: null,
      description: '50 Mbps',
      decision_maker: 'Bu Rina',
      created_at: '',
      updated_at: '',
      pipeline: {
        id: 'p1',
        name: 'Rumah',
        is_default: true,
        stages: [stage('s1', 0), stage('s2', 1), stage('won', 2, { is_won: true })],
        created_at: '',
        updated_at: '',
      },
      source_lead: { id: 'l1', contact_name: 'Budi' },
    }),
  },
}))
vi.mock('@/features/crm/components/EntityTimeline.vue', () => ({
  default: { template: '<div />' },
}))

import DealDetailPage from './DealDetailPage.vue'

describe('DealDetailPage', () => {
  it('shows deal summary, requirements, stage track and source lead', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/crm/deals/:id', component: DealDetailPage },
        { path: '/crm/leads/:id', component: { template: '<div />' } },
      ],
    })
    await router.push('/crm/deals/d1')
    const w = mount(DealDetailPage, {
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
        // Setup test men-stub RouterLink tanpa slot; render slot agar teks link bisa dicek.
        stubs: { RouterLink: { props: ['to'], template: '<a :href="String(to)"><slot /></a>' } },
      },
    })
    await flushPromises()
    expect(w.text()).toContain('Internet kantor')
    expect(w.text()).toContain('50 Mbps')
    expect(w.text()).toContain('Bu Rina')
    expect(w.text()).toContain('Budi')
    expect(w.find('[aria-current="step"]').text()).toContain('s2')
  })
})
