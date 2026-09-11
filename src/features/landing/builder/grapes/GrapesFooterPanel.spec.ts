import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getMenus = vi.fn()
const getDefaultBranding = vi.fn()
const getMenuItems = vi.fn()
const createMenu = vi.fn()
const createMenuItem = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getMenus: (...a: unknown[]) => getMenus(...a),
    getDefaultBranding: (...a: unknown[]) => getDefaultBranding(...a),
    getMenuItems: (...a: unknown[]) => getMenuItems(...a),
    createMenu: (...a: unknown[]) => createMenu(...a),
    createMenuItem: (...a: unknown[]) => createMenuItem(...a),
  },
}))

import { useLandingChromeStore } from '@/stores/landingChrome'
import GrapesFooterPanel from './GrapesFooterPanel.vue'

describe('GrapesFooterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    getMenus.mockResolvedValue({ data: [] })
    getDefaultBranding.mockResolvedValue({ data: { company_name: 'Acme', colors: {} } })
    getMenuItems.mockResolvedValue({ data: [] })
  })

  it('shows the empty state and a hint that removing the block disables the footer', async () => {
    const wrapper = mount(GrapesFooterPanel)
    await useLandingChromeStore().load()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Belum ada item navigasi footer')
    expect(wrapper.text()).toContain('Hapus block ini')
  })

  it('lists existing footer nav items from the footer-location menu', async () => {
    getMenus.mockResolvedValue({
      data: [{ id: 'm-footer', name: 'Footer Menu', location: 'footer', is_active: true }],
    })
    getMenuItems.mockResolvedValue({
      data: [
        {
          id: 'i1',
          label: 'Kebijakan',
          link_type: 'internal_page',
          destination: 'privacy',
          target: 'self',
          is_enabled: true,
          parent_id: null,
          sort_order: 10,
        },
      ],
    })

    const wrapper = mount(GrapesFooterPanel)
    await useLandingChromeStore().load()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Kebijakan')
  })

  it('adding an item creates the footer menu (location=footer) on first use', async () => {
    createMenu.mockResolvedValue({
      data: { id: 'm-new', name: 'Footer Menu', location: 'footer', is_active: true },
    })
    createMenuItem.mockResolvedValue({ data: {} })

    const wrapper = mount(GrapesFooterPanel)
    await useLandingChromeStore().load()
    await wrapper.vm.$nextTick()

    await wrapper.get('button.hp-btn').trigger('click') // "Tambah item"
    await wrapper.get('input[placeholder="Kebijakan"]').setValue('Privasi')
    await wrapper.get('input[type="text"].hp-input').setValue('Privasi')
    const slugInput = wrapper
      .findAll('input')
      .find((i) => i.attributes('placeholder') === 'privacy')
    await slugInput!.setValue('privacy')
    await wrapper.get('button:not(.hp-btn--ghost)').trigger('click')

    expect(createMenu).toHaveBeenCalledWith({
      name: 'Footer Menu',
      location: 'footer',
      is_active: true,
    })
  })
})
