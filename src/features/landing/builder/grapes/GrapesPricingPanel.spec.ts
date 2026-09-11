import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getPricingPlans = vi.fn()
const createPricingPlan = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getPricingPlans: (...a: unknown[]) => getPricingPlans(...a),
    createPricingPlan: (...a: unknown[]) => createPricingPlan(...a),
  },
}))

import { useLandingPricingStore } from '@/stores/landingPricing'
import GrapesPricingPanel from './GrapesPricingPanel.vue'

describe('GrapesPricingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getPricingPlans.mockResolvedValue({ data: [] })
  })

  it('shows the empty state and a hint that removing the block hides pricing', async () => {
    const wrapper = mount(GrapesPricingPanel)
    await useLandingPricingStore().load()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Belum ada paket harga')
    expect(wrapper.text()).toContain('Hapus block ini')
  })

  it('lists existing pricing plans', async () => {
    getPricingPlans.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Starter',
          price_label: 'Rp 199.000',
          interval_label: '/bulan',
          description: '',
          features: ['5 halaman'],
          cta_label: 'Mulai',
          cta_url: '/daftar',
          is_featured: false,
          sort_order: 0,
          is_enabled: true,
          created_at: '',
          updated_at: '',
        },
      ],
    })

    const wrapper = mount(GrapesPricingPanel)
    await useLandingPricingStore().load()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Starter')
    expect(wrapper.text()).toContain('Rp 199.000')
  })

  it('adding a plan calls createPricingPlan with the form payload', async () => {
    createPricingPlan.mockResolvedValue({
      data: {
        id: 'new',
        name: 'Starter',
        price_label: 'Rp 199.000',
        features: [],
        cta_label: 'Pilih paket',
        is_featured: false,
        sort_order: 0,
        is_enabled: true,
      },
    })

    const wrapper = mount(GrapesPricingPanel)
    await useLandingPricingStore().load()
    await wrapper.vm.$nextTick()

    await wrapper.get('button.hp-btn').trigger('click') // "Tambah paket"
    await wrapper.get('input[placeholder="Starter"]').setValue('Starter')
    await wrapper.get('input[placeholder="Rp 199.000"]').setValue('Rp 199.000')
    await wrapper.get('button:not(.hp-btn--ghost)').trigger('click')

    expect(createPricingPlan).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Starter', price_label: 'Rp 199.000' }),
    )
  })
})
