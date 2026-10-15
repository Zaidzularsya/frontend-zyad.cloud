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
// Wrapper GrapesJS palsu: find() untuk slot singleton, components() untuk deteksi kanvas kosong.
type FakeChild = { getAttributes: () => Record<string, string>; get: (k: string) => unknown }
const sectionChild: FakeChild = { getAttributes: () => ({}), get: () => 'default' }
function wrapperStub(find: (selector: string) => unknown[] = () => [], children: FakeChild[] = []) {
  return {
    find,
    components: () => ({ forEach: (fn: (c: FakeChild) => void) => children.forEach(fn) }),
  }
}

const editorStub = {
  getProjectData: vi.fn((): Record<string, unknown> => ({ pages: [] })),
  getHtml: vi.fn(() => '<body></body>'),
  getCss: vi.fn(() => ''),
  loadProjectData: vi.fn(),
  setComponents: vi.fn(),
  setStyle: vi.fn(),
  setDevice: vi.fn(),
  runCommand: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  AssetManager: assetManagerStub,
  Components: { addType: vi.fn() },
  Blocks: { add: vi.fn() },
  getWrapper: vi.fn(() => wrapperStub()),
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

const listAll = vi.fn()
const refreshFromPage = vi.fn()
const createTemplate = vi.fn()
vi.mock('@/features/landing/shared/api/page-templates.api', () => ({
  pageTemplatesApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    listAll: (...a: unknown[]) => listAll(...a),
    refreshFromPage: (...a: unknown[]) => refreshFromPage(...a),
    create: (...a: unknown[]) => createTemplate(...a),
  },
}))

import { useTenantStore } from '@/stores/tenant.store'
import { useLandingDocumentStore } from '@/stores/landingDocument'
import { useAuthStore } from '@/stores/auth.store'
import GrapesEditor from './GrapesEditor.vue'

const GalleryStub = {
  name: 'TemplateGalleryDialog',
  props: ['open', 'busy'],
  emits: ['close', 'apply'],
  template: '<div class="gallery-stub" :data-open="open" />',
}
const ConfirmStub = {
  name: 'ConfirmDialog',
  props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'],
  emits: ['confirm', 'cancel'],
  template: '<div class="confirm-stub" :data-open="open" />',
}
const SaveDialogStub = {
  name: 'SaveAsTemplateDialog',
  props: ['open', 'mode', 'initial', 'submit'],
  emits: ['close'],
  template: '<div class="save-stub" :data-open="open" />',
}
const stubs = {
  TemplateGalleryDialog: GalleryStub,
  ConfirmDialog: ConfirmStub,
  SaveAsTemplateDialog: SaveDialogStub,
}
const mountEditor = (props: Record<string, unknown> = {}) =>
  mount(GrapesEditor, { props: { pageId: 'p1', ...props }, global: { stubs } })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('GrapesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // vi.clearAllMocks() resets call history but not a mockReturnValue set by
    // an earlier test — reset the wrapper query to its harmless default so
    // tests that don't care about it (e.g. the singleton-dedup ones) can't
    // leak a stubbed find() into an unrelated test.
    editorStub.getWrapper.mockReturnValue(wrapperStub() as never)
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
    listAll.mockResolvedValue([])
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
    editorStub.getWrapper.mockReturnValue(
      wrapperStub((selector: string) =>
        selector === '[data-zyad-slot="tenant-nav"]'
          ? [{ remove: remove1 }, { remove: remove2 }]
          : [],
      ) as never,
    )

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

  it('shows the "Putar animasi" button and detaches canvas motion on unmount', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    const btn = wrapper.get('.grapes-motion-btn')
    expect(btn.text()).toContain('Putar animasi')
    await btn.trigger('click') // belum ada frame: no-op, tidak melempar
    wrapper.unmount()
    expect(editorStub.off).toHaveBeenCalledWith('canvas:frame:load', expect.any(Function))
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

  describe('galeri template', () => {
    const TEMPLATE = { name: 'Klinik', html: '<section>K</section>', css: '.k{}' }
    const withContent = () =>
      editorStub.getWrapper.mockReturnValue(wrapperStub(() => [], [sectionChild]) as never)
    const gallery = (w: ReturnType<typeof mountEditor>) => w.findComponent(GalleryStub)
    const confirm = (w: ReturnType<typeof mountEditor>) => w.findComponent(ConfirmStub)

    beforeEach(() => {
      localStorage.clear()
      editorStub.getProjectData.mockReturnValue({ pages: [] })
    })

    it('membuka galeri otomatis saat kanvas kosong', async () => {
      const w = mountEditor()
      await flush()
      expect(gallery(w).props('open')).toBe(true)
    })

    it('galeri tertutup bila kanvas berisi, dan tombol Template tersedia', async () => {
      withContent()
      const w = mountEditor()
      await flush()
      expect(gallery(w).props('open')).toBe(false)
      expect(w.get('.grapes-template-btn').text()).toContain('Template')
    })

    it('tombol Template di toolbar membuka galeri', async () => {
      withContent()
      const w = mountEditor()
      await flush()
      await w.get('.grapes-template-btn').trigger('click')
      expect(gallery(w).props('open')).toBe(true)
    })

    it('banner tampil untuk halaman draft berisi, hilang setelah ditutup', async () => {
      withContent()
      const w = mountEditor({ pageStatus: 'draft' })
      await flush()
      expect(w.get('.grapes-banner').text()).toContain('Ingin mulai dari template?')
      await w.get('.grapes-banner-close').trigger('click')
      expect(w.find('.grapes-banner').exists()).toBe(false)
      expect(localStorage.getItem('zy:tpl-banner-dismissed:p1')).toBe('1')
    })

    it('banner tidak tampil untuk halaman published', async () => {
      withContent()
      const w = mountEditor({ pageStatus: 'published' })
      await flush()
      expect(w.find('.grapes-banner').exists()).toBe(false)
    })

    it('banner "Lihat galeri" membuka galeri', async () => {
      withContent()
      const w = mountEditor({ pageStatus: 'draft' })
      await flush()
      await w.get('.grapes-banner-link').trigger('click')
      expect(gallery(w).props('open')).toBe(true)
    })

    it('menerapkan template langsung pada kanvas kosong, tanpa konfirmasi', async () => {
      const w = mountEditor()
      await flush()
      gallery(w).vm.$emit('apply', TEMPLATE)
      await flush()
      expect(confirm(w).props('open')).toBe(false)
      expect(editorStub.setComponents).toHaveBeenCalledWith('<section>K</section>')
      expect(editorStub.setStyle).toHaveBeenCalledWith('.k{}')
      expect(w.get('.grapes-template-notice').text()).toContain('Template "Klinik" dipakai.')
    })

    it('meminta konfirmasi sebelum mengganti kanvas berisi', async () => {
      withContent()
      const w = mountEditor()
      await flush()
      gallery(w).vm.$emit('apply', TEMPLATE)
      await flush()
      expect(confirm(w).props('open')).toBe(true)
      expect(confirm(w).props('message')).toContain('template "Klinik"')
      expect(editorStub.setComponents).not.toHaveBeenCalled()

      confirm(w).vm.$emit('cancel')
      await flush()
      expect(editorStub.setComponents).not.toHaveBeenCalled()

      gallery(w).vm.$emit('apply', TEMPLATE)
      await flush()
      confirm(w).vm.$emit('confirm')
      await flush()
      expect(editorStub.setComponents).toHaveBeenCalledWith('<section>K</section>')
    })

    it('tombol Batalkan memulihkan isi sebelum template dipakai dan menyimpannya', async () => {
      withContent()
      editorStub.getProjectData.mockReturnValue({ pages: [{ name: 'lama' }] })
      const w = mountEditor()
      await flush()
      gallery(w).vm.$emit('apply', TEMPLATE)
      await flush()
      confirm(w).vm.$emit('confirm')
      await flush()
      editorStub.getProjectData.mockReturnValue({ pages: [{ name: 'baru' }] })
      const store = useLandingDocumentStore()
      store.dirty = false

      await w.get('.grapes-notice-action').trigger('click')

      expect(editorStub.loadProjectData).toHaveBeenLastCalledWith({ pages: [{ name: 'lama' }] })
      expect(store.dirty).toBe(true)
      expect(w.find('.grapes-template-notice').exists()).toBe(false)
    })

    it('tombol Gunakan nonaktif (busy) sampai editor selesai memuat', async () => {
      const w = mountEditor()
      expect(gallery(w).props('busy')).toBe(true)
      await flush()
      expect(gallery(w).props('busy')).toBe(false)
    })

    it('memuat html/css bila project tersimpan tanpa pages', async () => {
      getDocument.mockResolvedValue({
        data: {
          landing_page_id: 'p1',
          project: {},
          html: '<section>A</section>',
          css: '.a{}',
          updated_at: '',
        },
      })
      mountEditor()
      await flush()
      expect(editorStub.setComponents).toHaveBeenCalledWith('<section>A</section>')
      expect(editorStub.setStyle).toHaveBeenCalledWith('.a{}')
    })

    it('tidak memuat html bila dokumen hanya <body></body>', async () => {
      getDocument.mockResolvedValue({
        data: {
          landing_page_id: 'p1',
          project: {},
          html: '<body></body>',
          css: '',
          updated_at: '',
        },
      })
      mountEditor()
      await flush()
      expect(editorStub.setComponents).not.toHaveBeenCalled()
    })
  })

  describe('menu template platform', () => {
    function setPermissions(permissions: string[]) {
      useAuthStore().user = {
        id: 'u1',
        name: 'U',
        email: 'u@x.co',
        permissions,
      } as never
    }
    const moreButton = (w: ReturnType<typeof mountEditor>) =>
      w.find('button[title="Opsi template"]')
    const menuItems = (w: ReturnType<typeof mountEditor>) =>
      w.findAll('.grapes-more-menu [role="menuitem"]').map((b) => b.text())

    it('org customer dengan permission manage tidak melihat menu "⋯"', async () => {
      useOrg('customer')
      setPermissions(['landing.page_template.manage'])
      const w = mountEditor()
      await flush()
      expect(moreButton(w).exists()).toBe(false)
      expect(listAll).not.toHaveBeenCalled()
    })

    it('org platform tanpa permission tidak melihat menu "⋯"', async () => {
      useOrg('platform')
      setPermissions([])
      const w = mountEditor()
      await flush()
      expect(moreButton(w).exists()).toBe(false)
    })

    it('platform + permission tanpa template sumber → "Simpan sebagai template"', async () => {
      useOrg('platform')
      setPermissions(['landing.page_template.manage'])
      const w = mountEditor()
      await flush()
      await moreButton(w).trigger('click')
      expect(menuItems(w)).toEqual(['Simpan sebagai template'])
      await w.get('.grapes-more-menu [role="menuitem"]').trigger('click')
      expect(w.findComponent(SaveDialogStub).props('open')).toBe(true)
    })

    it('template dengan source_page_id = pageId → menu Perbarui template', async () => {
      useOrg('platform')
      setPermissions(['landing.page_template.manage'])
      listAll.mockResolvedValue([{ id: 't1', name: 'Klinik', source_page_id: 'p1' }])
      const w = mountEditor()
      await flush()
      await moreButton(w).trigger('click')
      expect(menuItems(w)).toEqual(['Perbarui template "Klinik"'])
    })

    it('Perbarui menyimpan halaman dulu, baru memanggil refreshFromPage', async () => {
      useOrg('platform')
      setPermissions(['landing.page_template.manage'])
      listAll.mockResolvedValue([{ id: 't1', name: 'Klinik', source_page_id: 'p1' }])
      const order: string[] = []
      saveDocument.mockImplementation(async () => {
        order.push('save')
        return { data: { updated_at: '2026-09-10T00:00:00Z' } }
      })
      refreshFromPage.mockImplementation(async () => {
        order.push('refresh')
        return {}
      })
      const w = mountEditor()
      await flush()
      useLandingDocumentStore().dirty = true // editan belum ter-autosave

      await moreButton(w).trigger('click')
      await w.get('.grapes-more-menu [role="menuitem"]').trigger('click')
      await flush()

      expect(refreshFromPage).toHaveBeenCalledWith('t1')
      expect(order).toEqual(['save', 'refresh'])
    })

    it('penyimpanan halaman gagal → template tidak diperbarui', async () => {
      useOrg('platform')
      setPermissions(['landing.page_template.manage'])
      listAll.mockResolvedValue([{ id: 't1', name: 'Klinik', source_page_id: 'p1' }])
      saveDocument.mockRejectedValue(new Error('gagal'))
      const w = mountEditor()
      await flush()
      useLandingDocumentStore().dirty = true
      await moreButton(w).trigger('click')
      await w.get('.grapes-more-menu [role="menuitem"]').trigger('click')
      await flush()
      expect(refreshFromPage).not.toHaveBeenCalled()
    })
  })

  function onHandler(event: string) {
    const call = editorStub.on.mock.calls.find((c) => c[0] === event)
    return call?.[1] as ((...args: unknown[]) => void) | undefined
  }

  it('removes a second "Header tenant" / "Footer tenant" the instant it is added, and warns', async () => {
    const wrapper = mount(GrapesEditor, { props: { pageId: 'p1' } })
    await flush()

    // Simulate the wrapper already containing one instance of the sentinel.
    editorStub.getWrapper.mockReturnValue(wrapperStub(() => [{}, {}], [sectionChild]) as never)
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

    editorStub.getWrapper.mockReturnValue(wrapperStub(() => [{}], [sectionChild]) as never)
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
      editorStub.getWrapper.mockReturnValue(wrapperStub(() => [{}, {}], [sectionChild]) as never)
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
      editorStub.getWrapper.mockReturnValue(wrapperStub(() => [{}, {}], [sectionChild]) as never)
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
