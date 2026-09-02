import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ColorField from './ColorField.vue'
import SpacingField from './SpacingField.vue'

describe('ColorField', () => {
  it('emits the typed hex value', async () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#123456' } })
    const text = wrapper.find('input[type="text"]')
    await text.setValue('#abcdef')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['#abcdef'])
  })

  it('falls back to white for the swatch when value is not a hex', () => {
    const wrapper = mount(ColorField, { props: { modelValue: 'not-a-color' } })
    expect((wrapper.find('input[type="color"]').element as HTMLInputElement).value).toBe('#ffffff')
  })
})

describe('SpacingField', () => {
  it('merges the edited edge into the object', async () => {
    const wrapper = mount(SpacingField, { props: { modelValue: { top: 10 } } })
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[1]!.setValue('24')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ top: 10, bottom: 24 }])
  })

  it('drops an edge back to undefined when cleared', async () => {
    const wrapper = mount(SpacingField, { props: { modelValue: { top: 10, bottom: 24 } } })
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0]!.setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ top: undefined, bottom: 24 }])
  })
})
