import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@/features/crm/activities/api/activities.api', () => ({
  activitiesApi: { create: (...args: unknown[]) => create(...args) },
}))

import ActivityQuickActions from './ActivityQuickActions.vue'

function mountActions() {
  return mount(ActivityQuickActions, {
    props: { relatedEntityType: 'lead', relatedEntityId: 'l1', defaultAssigneeId: 'u1' },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
}

describe('ActivityQuickActions', () => {
  beforeEach(() => create.mockReset().mockResolvedValue({ id: 'a1' }))

  it('records a note as already completed', async () => {
    const wrapper = mountActions()
    await wrapper.find('button[aria-label="Tambah catatan"]').trigger('click')
    await wrapper.find('[data-test="subject"]').setValue('Hubungi lagi minggu depan')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'note', status: 'completed', due_at: undefined }),
    )
  })

  it('requires a future due date for a follow-up and assigns the owner', async () => {
    const wrapper = mountActions()
    await wrapper.find('button[aria-label="Jadwalkan follow-up"]').trigger('click')
    await wrapper.find('[data-test="subject"]').setValue('Kirim penawaran')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Pilih waktu yang akan datang.')
    expect(create).not.toHaveBeenCalled()

    await wrapper.find('[data-test="when"]').setValue('2099-01-01T09:00')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', assignee_user_id: 'u1', type: 'call' }),
    )
  })

  it('logs an interaction that already happened without a schedule', async () => {
    const wrapper = mountActions()
    await wrapper.find('button[aria-label="Log aktivitas"]').trigger('click')
    expect(wrapper.find('[data-test="when"]').exists()).toBe(false)
    await wrapper.find('[data-test="subject"]').setValue('Telepon singkat')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', type: 'call', assignee_user_id: undefined }),
    )
  })
})
