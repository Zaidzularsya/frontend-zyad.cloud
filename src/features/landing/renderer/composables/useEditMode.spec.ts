import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'

import { LANDING_EDIT_MODE, useEditMode } from './useEditMode'

const Probe = defineComponent({
  setup() {
    const editMode = useEditMode()
    return () => h('span', String(editMode.value))
  },
})

function mountWith(provided?: unknown) {
  return mount(Probe, {
    global: provided === undefined ? {} : { provide: { [LANDING_EDIT_MODE]: provided } },
  })
}

describe('useEditMode', () => {
  it('defaults to false with no provider', () => {
    expect(mountWith().text()).toBe('false')
  })

  it('reads a boolean provider', () => {
    expect(mountWith(true).text()).toBe('true')
  })

  it('unwraps a ref provider and stays reactive', async () => {
    const flag = ref(false)
    const wrapper = mountWith(flag)
    expect(wrapper.text()).toBe('false')
    flag.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('true')
  })
})
