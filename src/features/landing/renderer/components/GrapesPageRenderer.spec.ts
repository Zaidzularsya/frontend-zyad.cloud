import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const envMock = vi.hoisted(() => ({ VITE_LANDING_RENDERER: 'shadow' as 'shadow' | 'iframe' }))
vi.mock('@/config/env', () => ({ env: envMock }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }) }))

import GrapesPageRenderer from './GrapesPageRenderer.vue'

describe('GrapesPageRenderer', () => {
  beforeEach(() => {
    envMock.VITE_LANDING_RENDERER = 'shadow'
  })

  it('uses the shadow renderer by default', () => {
    const wrapper = mount(GrapesPageRenderer, { props: { html: '<p>a</p>', css: '' } })
    expect(wrapper.find('.zy-page-host').exists()).toBe(true)
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('falls back to the iframe renderer when flagged', () => {
    envMock.VITE_LANDING_RENDERER = 'iframe'
    const wrapper = mount(GrapesPageRenderer, { props: { html: '<p>a</p>', css: '' } })
    expect(wrapper.find('iframe.grapes-page-frame').exists()).toBe(true)
  })
})
