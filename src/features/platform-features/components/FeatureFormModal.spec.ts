import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { PlatformFeature } from '@/features/platform-features/api/platform-features.api'
import FeatureFormModal from './FeatureFormModal.vue'

const baseFeature: PlatformFeature = {
  id: 'f1',
  feature_key: 'user.max',
  module: 'user',
  name: 'Maks pengguna',
  value_type: 'integer',
  reset_strategy: 'never',
  is_active: true,
  tenant_offerable: false,
  tenant_max: null,
  created_at: '',
  updated_at: '',
}

function mountModal(featureToEdit: PlatformFeature) {
  return mount(FeatureFormModal, {
    props: {
      isOpen: true,
      mode: 'edit',
      featureToEdit,
      isSubmitting: false,
      serverError: '',
    },
    global: {
      stubs: { BaseModal: { template: '<div><slot /></div>' } },
    },
  })
}

describe('FeatureFormModal tenant-offerable', () => {
  it('integer + toggle aktif tanpa angka menampilkan error dan tidak mengirim', async () => {
    const wrapper = mountModal(baseFeature)
    await flushPromises()
    await wrapper.get('[data-test="tenant-offerable"]').setValue(true)
    expect(wrapper.find('[data-test="tenant-max"]').exists()).toBe(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Batas maksimum wajib untuk fitur angka'),
    )
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  it('integer dengan batas valid mengirim tenant_offerable dan tenant_max', async () => {
    const wrapper = mountModal(baseFeature)
    await flushPromises()
    await wrapper.get('[data-test="tenant-offerable"]').setValue(true)
    await wrapper.get('#feature-tenant-max').setValue('25')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.emitted('update')).toBeDefined())
    const payload = wrapper.emitted('update')?.[0]?.[0] as Record<string, unknown>
    expect(payload.tenant_offerable).toBe(true)
    expect(payload.tenant_max).toBe(25)
  })

  it('boolean tidak menampilkan input batas dan mengirim tenant_max null', async () => {
    const wrapper = mountModal({ ...baseFeature, value_type: 'boolean' })
    await flushPromises()
    await wrapper.get('[data-test="tenant-offerable"]').setValue(true)
    expect(wrapper.find('[data-test="tenant-max"]').exists()).toBe(false)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.emitted('update')).toBeDefined())
    const payload = wrapper.emitted('update')?.[0]?.[0] as Record<string, unknown>
    expect(payload.tenant_offerable).toBe(true)
    expect(payload.tenant_max).toBeNull()
  })
})
