import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// jsdom cannot lay out GrapesJS' iframe canvas — mock the library and assert we
// hand it the right config + lifecycle. Real drag behaviour is covered by e2e.
const initMock = vi.fn()
const assetManagerStub = {
  add: vi.fn(),
  getConfig: vi.fn(() => ({}) as Record<string, unknown>),
}
const editorStub = {
  getProjectData: vi.fn(() => ({ pages: [] })),
  getHtml: vi.fn(() => '<body></body>'),
  getCss: vi.fn(() => ''),
  loadProjectData: vi.fn(),
  setComponents: vi.fn(),
  setStyle: vi.fn(),
  setDevice: vi.fn(),
  runCommand: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  AssetManager: assetManagerStub,
  Components: { addType: vi.fn() },
  Blocks: { add: vi.fn() },
  getWrapper: vi.fn(() => ({ find: vi.fn(() => []) })),
}

vi.mock('grapesjs', () => ({
  default: {
    init: (...args: unknown[]) => {
      initMock(...args)
      return editorStub
    },
  },
}))
vi.mock('grapesjs/dist/css/grapes.min.css', () => ({}))
vi.mock('grapesjs-blocks-basic', () => ({ default: vi.fn() }))
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))

const getDocument = vi.fn()
const saveDocument = vi.fn()
const publishPage = vi.fn()
const getMedia = vi.fn()
const uploadMedia = vi.fn()
const deleteMedia = vi.fn()
const getMenus = vi.fn()
const getDefaultBranding = vi.fn()
const getMenuItems = vi.fn()
const getPricingPlans = vi.fn()
const getForms = vi.fn()
vi.mock('@/features/landing/shared/api/landing.api', () => ({
  landingApi: {
    getDocument: (...a: unknown[]) => getDocument(...a),
    saveDocument: (...a: unknown[]) => saveDocument(...a),
    publishPage: (...a: unknown[]) => publishPage(...a),
    getMedia: (...a: unknown[]) => getMedia(...a),
    uploadMedia: (...a: unknown[]) => uploadMedia(...a),
    deleteMedia: (...a: unknown[]) => deleteMedia(...a),
    getMenus: (...a: unknown[]) => getMenus(...a),
    getDefaultBranding: (...a: unknown[]) => getDefaultBranding(...a),
    getMenuItems: (...a: unknown[]) => getMenuItems(...a),
    getPricingPlans: (...a: unknown[]) => getPricingPlans(...a),
    getForms: (...a: unknown[]) => getForms(...a),
    createForm: vi.fn(),
    updateForm: vi.fn(),
    replaceFormFields: vi.fn(),
    deleteForm: vi.fn(),
  },
}))
vi.mock('@/features/crm/leads/api/leads.api', () => ({
  leadsApi: { members: vi.fn(() => Promise.resolve([])) },
}))

const listListings = vi.fn()
vi.mock('@/features/public/api/public-catalog.api', () => ({
  publicCatalogApi: { listListings: (...a: unknown[]) => listListings(...a) },
}))

import { useTenantStore } from '@/stores/tenant.store'
import GrapesEditor from './GrapesEditor.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('GrapesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // vi.clearAllMocks() resets call history but not a mockReturnValue set by
    // an earlier test — reset the wrapper query to its harmless default so
    // tests that don't care about it (e.g. the singleton-dedup ones) can't
    // leak a stubbed find() into an unrelated test.
    editorStub.getWrapper.mockReturnValue({ find: () => [] } as never)
    setActivePinia(createPinia())
    getDocument.mockResolvedValue({
      data: { landing_page_id: 'p1', project: {}, html: '', css: '', updated_at: '' },
    })
    saveDocument.mockResolvedValue({ data: { updated_at: '2026-09-10T00:00:00Z' } })
    publishPage.mockResolvedValue({ data: {} })
    getMedia.mockResolvedValue({ data: [] })
    uploadMedia.mockResolvedValue({ data: { public_url: 'https://cdn.test/a.png', id: 'm1' } })
    deleteMedia.mockResolvedValue({ data: null })
    getMenus.mockResolvedValue({ data: [] })
    getPricingPlans.mockResolvedValue({ data: [] })
    getDefaultBranding.mockResolvedValue({ data: { company_name: 'Acme', colors: {} } })
    getMenuItems.mockResolvedValue({ data: [] })
    listListings.mockResolvedValue([])
    getForms.mockResolvedValue({ data: [] })
  })

  function useOrg(organizationType: string) {
    useTenantStore().hydrate([
      {
        id: 't1',
        name: 'Org',
        slug: 'org',
        plan: 'trial',
        status: 'active',
        organizationType,
      },
    ])
  }

  it('initialises grapesjs once with our config on mount', () => {
    mount(GrapesEditor, { props: { pageId: 'p1' } })
    expect(initMock).toHaveBeenCalledTimes(1)
    const cfg = initMock.mock.calls[0]![0] as Record<string, unknown> & {
      storageManager: unknown
      i18n: { locale: string }
      deviceManager: { devices: unknown[] }
      container: unknown
      blockManager: { appendTo: unknown }
    }
    expect(cfg.storageManager).toEqual({ type: 'none' })
    expect(cfg.i18n.locale).toBe('id')
    expect(cfg.deviceManager.devices).toHaveLength(3)
    expect(cfg.container).toBeInstanceOf(HTMLElement)
    expect(cfg.blockManager.appendTo).toBeInstanceOf(HTMLElement)
  })

  it('loads the page document on mount', async () => {
    mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    expect(getDocument).toHaveBeenCalledWith('p1')
  })

  it('cleans up a tenant-nav duplicate already saved in the document on load, and autosaves the fix', async () => {
    const remove1 = vi.fn()
    const remove2 = vi.fn()
    editorStub.getWrapper.mockReturnValue({
      find: (selector: string) =>
        selector === '[data-zyad-slot="tenant-nav"]'
          ? [{ remove: remove1 }, { remove: remove2 }]
          : [],
    } as never)

    mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    // Only the extra (2nd) instance is removed — the first survives.
    expect(remove1).not.toHaveBeenCalled()
    expect(remove2).toHaveBeenCalledTimes(1)

    const { useLandingDocumentStore } = await import('@/stores/landingDocument')
    expect(useLandingDocumentStore().dirty).toBe(true)
  })

  it('destroys the editor on unmount', () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    wrapper.unmount()
    expect(editorStub.destroy).toHaveBeenCalledTimes(1)
  })

  it('switches device from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await wrapper.findAll('.grapes-dev-btn')[1]!.trigger('click')
    expect(editorStub.setDevice).toHaveBeenCalledWith('Tablet')
  })

  it('runs undo/redo core commands from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    const [undoBtn, redoBtn] = wrapper.findAll('.grapes-icon-btn')
    await undoBtn!.trigger('click')
    await redoBtn!.trigger('click')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:undo')
    expect(editorStub.runCommand).toHaveBeenCalledWith('core:redo')
  })

  it('publishes via the store from the top bar', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    await wrapper.find('.grapes-publish').trigger('click')
    await flush()
    expect(publishPage).toHaveBeenCalledWith('p1')
  })

  it('wires the asset manager to the media API on mount', async () => {
    const cfg: Record<string, unknown> = {}
    assetManagerStub.getConfig.mockReturnValue(cfg)
    getMedia.mockResolvedValue({
      data: [
        {
          id: 'm1',
          public_url: 'https://cdn.test/a.png',
          filename: 'a.png',
          mime_type: 'image/png',
        },
      ],
    })

    mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    expect(getMedia).toHaveBeenCalled()
    expect(typeof cfg.uploadFile).toBe('function')
    expect(assetManagerStub.add).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'image', src: 'https://cdn.test/a.png', mediaId: 'm1' }),
    ])
  })

  it('offers starter templates for a blank document and applies one', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    const options = wrapper.findAll('.grapes-starter-option')
    expect(options.length).toBeGreaterThan(0)

    await options[1]!.trigger('click')
    expect(editorStub.setComponents).toHaveBeenCalled()
    expect(editorStub.setStyle).toHaveBeenCalled()
    expect(wrapper.find('.grapes-starter').exists()).toBe(false)
  })

  it('hides the starter picker when the document already has content', async () => {
    getDocument.mockResolvedValue({
      data: {
        landing_page_id: 'p1',
        project: {},
        html: '<body><h1>Hi</h1></body>',
        css: '',
        updated_at: '',
      },
    })
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    expect(wrapper.find('.grapes-starter').exists()).toBe(false)
  })

  function onHandler(event: string) {
    const call = editorStub.on.mock.calls.find((c) => c[0] === event)
    return call?.[1] as ((...args: unknown[]) => void) | undefined
  }

  it('removes a second "Header tenant" / "Footer tenant" the instant it is added, and warns', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    // Simulate the wrapper already containing one instance of the sentinel.
    editorStub.getWrapper.mockReturnValue({ find: () => [{}, {}] } as never)
    const onAdd = onHandler('component:add')!
    const remove = vi.fn()
    onAdd({ get: (k: string) => (k === 'type' ? 'zyad-tenant-header' : undefined), remove })

    expect(remove).toHaveBeenCalledTimes(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Header tenant sudah ada di halaman ini')
  })

  it('does not remove the only instance of the header/footer component', async () => {
    mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    editorStub.getWrapper.mockReturnValue({ find: () => [{}] } as never)
    const onAdd = onHandler('component:add')!
    const remove = vi.fn()
    onAdd({ get: (k: string) => (k === 'type' ? 'zyad-tenant-footer' : undefined), remove })

    expect(remove).not.toHaveBeenCalled()
  })

  it('swaps the right pane to the header/footer panel on selection', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    const onSelect = onHandler('component:selected')!

    onSelect({
      get: (k: string) => (k === 'type' ? 'zyad-tenant-header' : undefined),
      getAttributes: () => ({}),
      addAttributes: vi.fn(),
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Action & Tampilan') // GrapesHeaderPanel-only section

    onSelect({
      get: (k: string) => (k === 'type' ? 'zyad-tenant-footer' : undefined),
      getAttributes: () => ({}),
      addAttributes: vi.fn(),
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Action & Tampilan')
    expect(wrapper.text()).toContain('Hapus block ini') // GrapesFooterPanel-only hint

    onSelect({
      get: (k: string) => (k === 'type' ? 'zyad-pricing-plans' : undefined),
      getAttributes: () => ({}),
      addAttributes: vi.fn(),
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Belum ada paket harga') // GrapesPricingPanel-only empty state
  })

  it('keeps Style/Setelan reachable for a selected header — GrapesJS Style Manager still customizes it', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()
    const onSelect = onHandler('component:selected')!

    onSelect({
      get: (k: string) => (k === 'type' ? 'zyad-tenant-header' : undefined),
      getAttributes: () => ({}),
      addAttributes: vi.fn(),
      getClasses: () => [],
      addClass: vi.fn(),
      removeClass: vi.fn(),
    })
    await wrapper.vm.$nextTick()

    // Defaults to the custom "Konten" panel, but Style/Setelan tabs are there too
    // — previously the whole tab bar (and the native Style Manager pane) was
    // hidden outright whenever a tenant header/footer was selected.
    const tabButtons = () => wrapper.find('.grapes-right').findAll('.grapes-tabs button')
    expect(tabButtons().map((b) => b.text())).toEqual(['Konten', 'Style', 'Setelan', 'Animasi'])

    expect(wrapper.get('.hp').attributes('style') ?? '').not.toContain('display: none')

    await tabButtons()
      .find((b) => b.text() === 'Style')!
      .trigger('click')
    expect(wrapper.get('.hp').attributes('style') ?? '').toContain('display: none')
  })

  describe('tab Animasi', () => {
    const tabLabels = (wrapper: ReturnType<typeof mount>) =>
      wrapper
        .find('.grapes-right')
        .findAll('.grapes-tabs button')
        .map((b) => b.text())

    function plainComponent(classes: string[] = []) {
      return {
        get: () => 'default',
        getClasses: () => classes,
        addClass: vi.fn(),
        removeClass: vi.fn(),
      }
    }

    it('muncul saat komponen dipilih, hilang saat deselect', async () => {
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      expect(tabLabels(wrapper)).toEqual(['Style', 'Setelan'])

      onHandler('component:selected')!(plainComponent())
      await wrapper.vm.$nextTick()
      expect(tabLabels(wrapper)).toEqual(['Style', 'Setelan', 'Animasi'])

      await wrapper
        .find('.grapes-right')
        .findAll('.grapes-tabs button')
        .find((b) => b.text() === 'Animasi')!
        .trigger('click')
      expect(wrapper.text()).toContain('Efek masuk')

      onHandler('component:deselected')!()
      await wrapper.vm.$nextTick()
      expect(tabLabels(wrapper)).toEqual(['Style', 'Setelan'])
    })

    it('tidak menggantikan tab Konten untuk komponen tenant', async () => {
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      onHandler('component:selected')!({
        ...plainComponent(),
        get: (k: string) => (k === 'type' ? 'zyad-tenant-header' : undefined),
        getAttributes: () => ({}),
        addAttributes: vi.fn(),
      })
      await wrapper.vm.$nextTick()
      expect(tabLabels(wrapper)).toEqual(['Konten', 'Style', 'Setelan', 'Animasi'])
    })
  })

  describe('blok Pricing Katalog (platform-only)', () => {
    it('org non-platform: block zy-catalog-pricing tidak terdaftar dan listing tidak diambil', async () => {
      useOrg('customer')
      mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      const ids = editorStub.Blocks.add.mock.calls.map((c) => c[0])
      expect(ids).not.toContain('zy-catalog-pricing')
      expect(listListings).not.toHaveBeenCalled()
      const types = editorStub.Components.addType.mock.calls.map((c) => c[0])
      expect(types).not.toContain('zyad-catalog-pricing')
    })

    it('org platform: block terdaftar dengan kategori Conversion dan listing diambil sekali', async () => {
      useOrg('platform')
      mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      const call = editorStub.Blocks.add.mock.calls.find((c) => c[0] === 'zy-catalog-pricing')
      expect(call).toBeTruthy()
      expect(call![1]).toMatchObject({
        category: 'Conversion',
        content: { type: 'zyad-catalog-pricing' },
      })
      expect(listListings).toHaveBeenCalledTimes(1)
    })

    it('guard duplikat: blok catalog-pricing kedua dihapus dan penulis diberi tahu', async () => {
      useOrg('platform')
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      editorStub.getWrapper.mockReturnValue({ find: () => [{}, {}] } as never)
      const onAdd = onHandler('component:add')!
      const remove = vi.fn()
      onAdd({ get: (k: string) => (k === 'type' ? 'zyad-catalog-pricing' : undefined), remove })
      expect(remove).toHaveBeenCalledTimes(1)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Pricing Katalog sudah ada di halaman ini')
    })

    it('seleksi blok membuka panel Pricing Katalog di tab Konten', async () => {
      useOrg('platform')
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      onHandler('component:selected')!({
        get: (k: string) => (k === 'type' ? 'zyad-catalog-pricing' : undefined),
        getAttributes: () => ({}),
        addAttributes: vi.fn(),
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Harga dan fitur diambil dari Sales → Produk.')
    })
  })
  describe('blok Form Konsultasi (semua org)', () => {
    it.each(['customer', 'platform'])(
      'org %s: block zy-lead-form kategori Conversion dan tipe terdaftar',
      async (org) => {
        useOrg(org)
        mount(GrapesEditor, { props: { pageId: 'p1' } })
        await flush()
        const call = editorStub.Blocks.add.mock.calls.find((c) => c[0] === 'zy-lead-form')
        expect(call).toBeTruthy()
        expect(call![1]).toMatchObject({
          label: 'Form Konsultasi',
          category: 'Conversion',
          content: { type: 'zyad-lead-form' },
        })
        const types = editorStub.Components.addType.mock.calls.map((c) => c[0])
        expect(types).toContain('zyad-lead-form')
        expect(getForms).toHaveBeenCalledWith('p1')
      },
    )

    it('guard duplikat: blok lead-form kedua dihapus dengan label Form Konsultasi', async () => {
      useOrg('customer')
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      editorStub.getWrapper.mockReturnValue({ find: () => [{}, {}] } as never)
      const remove = vi.fn()
      onHandler('component:add')!({
        get: (k: string) => (k === 'type' ? 'zyad-lead-form' : undefined),
        remove,
      })
      expect(remove).toHaveBeenCalledTimes(1)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Form Konsultasi sudah ada di halaman ini')
    })

    it('seleksi blok membuka panel Form Konsultasi di tab Konten', async () => {
      useOrg('customer')
      const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
      await flush()
      onHandler('component:selected')!({
        get: (k: string) => (k === 'type' ? 'zyad-lead-form' : undefined),
        getAttributes: () => ({}),
        addAttributes: vi.fn(),
      })
      await flush()
      expect(wrapper.text()).toContain('Buat form standar')
    })
  })
})
