import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getMenus = vi.fn()
const getDefaultBranding = vi.fn()
const getMenuItems = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getMenus: (...a: unknown[]) => getMenus(...a),
    getDefaultBranding: (...a: unknown[]) => getDefaultBranding(...a),
    getMenuItems: (...a: unknown[]) => getMenuItems(...a),
    uploadMedia: vi.fn(),
  },
}))

import GrapesHeaderPanel from './GrapesHeaderPanel.vue'
import { DEFAULT_HEADER_PRESENTATION } from './grapes.header-component'

function fakeComponent(attr = JSON.stringify(DEFAULT_HEADER_PRESENTATION)) {
  const attrs: Record<string, string> = { 'data-zyad-header': attr }
  return {
    getAttributes: () => attrs,
    addAttributes: vi.fn((patch: Record<string, string>) => Object.assign(attrs, patch)),
  }
}

describe('GrapesHeaderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getMenus.mockResolvedValue({ data: [] })
    getDefaultBranding.mockResolvedValue({ data: { company_name: 'Acme', colors: {} } })
    getMenuItems.mockResolvedValue({ data: [] })
  })

  it('renders the three areas', () => {
    const wrapper = mount(GrapesHeaderPanel, { props: { component: fakeComponent() } })
    const text = wrapper.text()
    expect(text).toContain('Logo & Brand')
    expect(text).toContain('Navigation')
    expect(text).toContain('Action & Tampilan')
  })

  it('writes presentation onto the component when a select changes', async () => {
    const component = fakeComponent()
    const wrapper = mount(GrapesHeaderPanel, { props: { component } })

    const selects = wrapper.findAll('select')
    const positionSelect = selects.find((s) => {
      const text = s.element.parentElement?.textContent ?? ''
      return text.includes('Posisi') && !text.includes('grup')
    })
    await positionSelect!.setValue('fixed')

    expect(component.addAttributes).toHaveBeenCalled()
    const written = JSON.parse(component.getAttributes()['data-zyad-header']!)
    expect(written.position).toBe('fixed')
  })

  it('hides the container checkbox toggle effect when layout is spread', async () => {
    const component = fakeComponent()
    const wrapper = mount(GrapesHeaderPanel, { props: { component } })

    const layoutSelect = wrapper
      .findAll('select')
      .find((s) => s.element.parentElement?.textContent?.includes('Layout'))
    await layoutSelect!.setValue('spread')

    const written = JSON.parse(component.getAttributes()['data-zyad-header']!)
    expect(written.layout).toBe('spread')
    expect(wrapper.text()).toContain('Spread selalu full-lebar')
  })

  it('hides the action label / url inputs when the action is off', async () => {
    const wrapper = mount(GrapesHeaderPanel, {
      props: {
        component: fakeComponent(
          JSON.stringify({ ...DEFAULT_HEADER_PRESENTATION, showAction: false }),
        ),
      },
    })
    expect(wrapper.text()).not.toContain('Label tombol')
  })
})
