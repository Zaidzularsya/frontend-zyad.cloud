import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { SectionFieldSchema } from '@/features/landing/shared/constants/section-schemas'
import SectionContentForm from './SectionContentForm.vue'

const repeaterSchema: SectionFieldSchema[] = [
  {
    key: 'items',
    label: 'Tombol',
    type: 'repeater',
    itemSchema: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'variant', label: 'Gaya', type: 'select', options: ['primary', 'secondary', 'ghost'] },
      { key: 'gap', label: 'Jarak', type: 'number' },
    ],
  },
]

function mountForm(content: Record<string, unknown>) {
  return mount(SectionContentForm, {
    props: { schema: repeaterSchema, content },
    global: { stubs: { RichTextField: true } },
  })
}

describe('SectionContentForm — repeater item fields', () => {
  it('renders a <select> with the itemField options for a select item field', () => {
    const wrapper = mountForm({ items: [{ label: 'A', variant: 'secondary', gap: 8 }] })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option').map((o) => o.attributes('value'))).toEqual([
      'primary',
      'secondary',
      'ghost',
    ])
    expect((select.element as HTMLSelectElement).value).toBe('secondary')
  })

  it('emits field-change with the whole array when a select item field changes', async () => {
    const wrapper = mountForm({ items: [{ label: 'A', variant: 'primary', gap: 8 }] })
    await wrapper.find('select').setValue('ghost')
    const events = wrapper.emitted('field-change')
    expect(events?.at(-1)).toEqual(['items', [{ label: 'A', variant: 'ghost', gap: 8 }]])
  })

  it('seeds a new repeater item with the first select option and empty strings', async () => {
    const wrapper = mountForm({ items: [] })
    await wrapper.find('button').trigger('click') // "+ Add item"
    const events = wrapper.emitted('field-change')
    expect(events?.at(-1)).toEqual(['items', [{ label: '', variant: 'primary', gap: '' }]])
  })

  it('coerces a number item field to a Number on input', async () => {
    const wrapper = mountForm({ items: [{ label: 'A', variant: 'primary', gap: 8 }] })
    const numberInput = wrapper.find('input[type="number"]')
    await numberInput.setValue('16')
    const events = wrapper.emitted('field-change')
    expect(events?.at(-1)).toEqual(['items', [{ label: 'A', variant: 'primary', gap: 16 }]])
  })
})
