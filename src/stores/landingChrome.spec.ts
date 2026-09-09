import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const getMenus = vi.fn()
const getMenuItems = vi.fn()
const createMenu = vi.fn()
const createMenuItem = vi.fn()
const updateMenuItem = vi.fn()
const deleteMenuItem = vi.fn()
const reorderMenuItems = vi.fn()
const getDefaultBranding = vi.fn()
const updateDefaultBranding = vi.fn()

vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getMenus: (...a: unknown[]) => getMenus(...a),
    getMenuItems: (...a: unknown[]) => getMenuItems(...a),
    createMenu: (...a: unknown[]) => createMenu(...a),
    createMenuItem: (...a: unknown[]) => createMenuItem(...a),
    updateMenuItem: (...a: unknown[]) => updateMenuItem(...a),
    deleteMenuItem: (...a: unknown[]) => deleteMenuItem(...a),
    reorderMenuItems: (...a: unknown[]) => reorderMenuItems(...a),
    getDefaultBranding: (...a: unknown[]) => getDefaultBranding(...a),
    updateDefaultBranding: (...a: unknown[]) => updateDefaultBranding(...a),
  },
}))

import { useLandingChromeStore } from './landingChrome'

const branding = {
  company_name: 'Acme',
  logo_light_url: '/logo.png',
  colors: { primary: '#111827' },
  typography: {},
  contact: {},
  social_links: [],
}

function navItem(over: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    parent_id: null,
    label: 'Pricing',
    link_type: 'internal_page',
    destination: 'pricing',
    target: 'self',
    sort_order: 10,
    is_enabled: true,
    children: [],
    ...over,
  }
}

describe('useLandingChromeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    getDefaultBranding.mockResolvedValue({ data: branding })
    getMenuItems.mockResolvedValue({ data: [navItem()] })
  })

  it('load() picks the active header menu and its items', async () => {
    getMenus.mockResolvedValue({
      data: [
        { id: 'm-foot', location: 'footer', is_active: true },
        { id: 'm-head', location: 'header', is_active: true },
      ],
    })
    const store = useLandingChromeStore()
    await store.load()
    expect(store.headerMenu?.id).toBe('m-head')
    expect(store.navItems).toHaveLength(1)
    expect(store.branding?.company_name).toBe('Acme')
    expect(store.canvasNav[0]).toMatchObject({
      label: 'Pricing',
      href: '/pricing',
      target: '_self',
    })
    expect(store.canvasBranding).toMatchObject({ companyName: 'Acme', primary: '#111827' })
  })

  it('addNavItem() creates the header menu first when none exists', async () => {
    getMenus.mockResolvedValue({ data: [] })
    createMenu.mockResolvedValue({ data: { id: 'new-head', location: 'header', is_active: true } })
    createMenuItem.mockResolvedValue({ data: navItem() })

    const store = useLandingChromeStore()
    await store.load()
    expect(store.headerMenu).toBeNull()

    await store.addNavItem({
      label: 'Home',
      link_type: 'internal_page',
      destination: 'public-marketing',
      target: 'self',
      is_enabled: true,
      parent_id: null,
    })

    expect(createMenu).toHaveBeenCalledWith({
      name: 'Header Menu',
      location: 'header',
      is_active: true,
    })
    expect(createMenuItem).toHaveBeenCalledWith(
      'new-head',
      expect.objectContaining({ label: 'Home', sort_order: 10 }),
    )
  })

  it('saveBranding() forwards the patch and adopts the response', async () => {
    getMenus.mockResolvedValue({ data: [{ id: 'm-head', location: 'header', is_active: true }] })
    updateDefaultBranding.mockResolvedValue({ data: { ...branding, company_name: 'Beta' } })

    const store = useLandingChromeStore()
    await store.load()
    await store.saveBranding({ company_name: 'Beta' })

    expect(updateDefaultBranding).toHaveBeenCalledWith({ company_name: 'Beta' })
    expect(store.branding?.company_name).toBe('Beta')
  })
})
