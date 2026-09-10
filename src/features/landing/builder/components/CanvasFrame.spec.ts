import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

vi.mock('@/features/landing/shared/api/landing.api', () => ({ landingApi: {} }))

import CanvasFrame from './CanvasFrame.vue'

function mountFrame(deviceWidth: number | null) {
  setActivePinia(createPinia())
  return mount(CanvasFrame, { props: { deviceWidth } })
}

describe('CanvasFrame — device width', () => {
  it('sizes the iframe to the device width so section media queries fire', () => {
    const wrapper = mountFrame(390)
    const style = wrapper.find('iframe').attributes('style') ?? ''
    expect(style).toContain('width: 390px')
  })

  it('falls back to full width on desktop (null)', () => {
    const wrapper = mountFrame(null)
    const style = wrapper.find('iframe').attributes('style') ?? ''
    expect(style).toContain('width: 100%')
  })

  it('reacts to a device-width prop change', async () => {
    const wrapper = mountFrame(null)
    await wrapper.setProps({ deviceWidth: 834 })
    expect(wrapper.find('iframe').attributes('style')).toContain('width: 834px')
  })
})
