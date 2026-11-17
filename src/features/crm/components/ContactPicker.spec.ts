import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: { list: vi.fn() },
}))

import { contactsApi } from '@/features/crm/contacts/api/contacts.api'
import ContactPicker from '@/features/crm/components/ContactPicker.vue'

describe('ContactPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(contactsApi.list)
      .mockReset()
      .mockResolvedValue({
        data: [
          {
            id: 'c1',
            first_name: 'Budi',
            last_name: 'Santoso',
            email: 'budi@b.com',
            phone: '0812',
          },
        ],
        meta: { total: 1 },
      } as never)
  })

  it('mencari kontak CRM dan memancarkan kontak yang dipilih', async () => {
    const w = mount(ContactPicker, {
      global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await w.get('input[name="contact_search"]').setValue('bud')
    vi.advanceTimersByTime(400)
    await flushPromises()
    expect(contactsApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'bud', page: 1 }),
    )
    expect(w.text()).toContain('Budi Santoso')
    expect(w.text()).toContain('0812')
    await w.get('button[data-testid="pick-contact-c1"]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual([
      { id: 'c1', name: 'Budi Santoso', email: 'budi@b.com', phone: '0812' },
    ])
    vi.useRealTimers()
  })
})
