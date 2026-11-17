import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

vi.mock('@/features/crm/contacts/api/contacts.api', () => ({
  contactsApi: { list: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }) },
}))

import DealContactField from '@/features/crm/components/DealContactField.vue'

const PickerStub = {
  emits: ['pick'],
  template:
    "<button data-testid=\"picker\" @click=\"$emit('pick', { id: 'c1', name: 'Budi', email: '', phone: '0812' })\">pick</button>",
}

describe('DealContactField', () => {
  it('form deal mengirim contact_id dari kontak terpilih', async () => {
    const w = mount(DealContactField, {
      props: { modelValue: '', contactName: '' },
      global: {
        plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: { ContactPicker: PickerStub },
      },
    })
    await w.get('[data-testid="picker"]').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['c1'])
    await w.setProps({ modelValue: 'c1' })
    expect(w.text()).toContain('Budi')
    await w.get('button[data-testid="clear-contact"]').trigger('click')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })
})
