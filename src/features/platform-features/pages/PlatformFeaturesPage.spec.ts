import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlatformFeature } from '@/features/platform-features/api/platform-features.api'

const features = ref<PlatformFeature[]>([])
const createFeature = vi.fn()
const updateFeature = vi.fn()
const refetch = vi.fn()

vi.mock('@/features/platform-features/api/platform-features.queries', () => ({
  usePlatformFeaturesQuery: () => ({
    data: ref({ data: features.value, meta: {} }),
    isLoading: ref(false),
    isFetching: ref(false),
    refetch,
  }),
  useCreatePlatformFeatureMutation: () => ({ mutateAsync: createFeature, isPending: ref(false) }),
  useUpdatePlatformFeatureMutation: () => ({ mutateAsync: updateFeature, isPending: ref(false) }),
}))

import PlatformFeaturesPage from './PlatformFeaturesPage.vue'

const feature = (over: Partial<PlatformFeature> = {}): PlatformFeature => ({
  id: 'f1',
  feature_key: 'crm.enabled',
  module: 'crm',
  name: 'CRM',
  description: 'Akses modul CRM',
  value_type: 'boolean',
  unit: '',
  reset_strategy: 'never',
  is_active: true,
  created_at: '',
  updated_at: '',
  ...over,
})

function mountPage() {
  return mount(PlatformFeaturesPage, {
    global: {
      stubs: {
        PermissionGate: { template: '<div><slot /></div>' },
        FeatureFormModal: {
          name: 'FeatureFormModal',
          props: ['isOpen', 'mode', 'featureToEdit'],
          emits: ['create', 'update', 'close'],
          template: '<div v-if="isOpen" data-test="modal" :data-mode="mode" />',
        },
      },
    },
  })
}

describe('PlatformFeaturesPage', () => {
  beforeEach(() => {
    features.value = [
      feature(),
      feature({
        id: 'f2',
        feature_key: 'user.max',
        module: 'user',
        name: 'Maks pengguna',
        value_type: 'integer',
        unit: 'users',
        is_active: false,
      }),
    ]
    createFeature.mockReset().mockResolvedValue({})
    updateFeature.mockReset().mockResolvedValue({})
  })

  it('menampilkan key, modul, tipe, unit, dan status tiap fitur', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('crm.enabled')
    expect(text).toContain('Maks pengguna')
    expect(text).toContain('integer')
    expect(text).toContain('users')
    expect(text).toContain('active')
    expect(text).toContain('inactive')
    expect(text).not.toContain('Product Catalog')
  })

  it('membuka modal tambah lalu mengirim fitur baru', async () => {
    const wrapper = mountPage()
    await wrapper.get('[data-test="add-feature"]').trigger('click')
    expect(wrapper.get('[data-test="modal"]').attributes('data-mode')).toBe('create')

    const payload = { feature_key: 'x.y', module: 'x', name: 'XY', value_type: 'boolean' }
    wrapper.findComponent({ name: 'FeatureFormModal' }).vm.$emit('create', payload)
    await flushPromises()
    expect(createFeature).toHaveBeenCalledWith(payload)
  })

  it('mengubah fitur lewat modal edit', async () => {
    const wrapper = mountPage()
    await wrapper.get('[data-test="edit-feature-f1"]').trigger('click')
    expect(wrapper.get('[data-test="modal"]').attributes('data-mode')).toBe('edit')

    wrapper.findComponent({ name: 'FeatureFormModal' }).vm.$emit('update', { name: 'CRM Baru' })
    await flushPromises()
    expect(updateFeature).toHaveBeenCalledWith({ id: 'f1', payload: { name: 'CRM Baru' } })
  })

  it('menonaktifkan fitur aktif dengan is_active=false', async () => {
    const wrapper = mountPage()
    await wrapper.get('[data-test="toggle-feature-f1"]').trigger('click')
    await flushPromises()
    expect(updateFeature).toHaveBeenCalledWith({ id: 'f1', payload: { is_active: false } })
  })
})
