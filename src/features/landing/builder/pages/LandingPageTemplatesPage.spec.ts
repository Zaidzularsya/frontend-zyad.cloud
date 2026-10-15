import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const listAll = vi.fn()
const update = vi.fn()
const copyToPage = vi.fn()
const getTemplate = vi.fn()
vi.mock('@/features/landing/shared/api/page-templates.api', () => ({
  pageTemplatesApi: {
    listAll: () => listAll(),
    update: (...a: unknown[]) => update(...a),
    copyToPage: (...a: unknown[]) => copyToPage(...a),
    get: (...a: unknown[]) => getTemplate(...a),
  },
}))
vi.mock('@/stores/landingChrome', () => ({
  useLandingChromeStore: () => ({
    load: vi.fn(),
    canvasNav: [],
    canvasFooterNav: [],
    canvasBranding: { companyName: '', logoUrl: '' },
  }),
}))
vi.mock('@/stores/landingPricing', () => ({
  useLandingPricingStore: () => ({ load: vi.fn(), canvasPlans: [] }),
}))
vi.mock('@/stores/tenant.store', () => ({
  useTenantStore: () => ({ isPlatformOrganization: true }),
}))

const loadPages = vi.fn()
const selectedPageId = { value: '' }
vi.mock('../composables/usePageSelection', () => ({
  usePageSelection: () => ({ selectedPageId, loadPages: () => loadPages() }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

import LandingPageTemplatesPage from './LandingPageTemplatesPage.vue'

const row = (over: Record<string, unknown>) => ({
  id: 'x',
  slug: 'x',
  name: 'X',
  description: '',
  category: 'dasar',
  sort_order: 100,
  platform_only: false,
  updated_at: '2026-10-01T00:00:00Z',
  status: 'draft',
  source: 'admin',
  seed_modified: false,
  source_page_id: null,
  ...over,
})

const CardStub = {
  name: 'TemplateCard',
  props: ['template', 'chrome', 'queue', 'loadDetail', 'compact'],
  template: '<div class="card-stub" />',
}
const ConfirmStub = {
  name: 'ConfirmDialog',
  props: ['open', 'title', 'message'],
  emits: ['confirm', 'cancel'],
  template: '<div class="confirm-stub" :data-open="open" />',
}
const StubbedModal = { props: ['open'], template: '<div v-if="open"><slot /></div>' }

function mountPage() {
  return mount(LandingPageTemplatesPage, {
    global: {
      stubs: {
        TemplateCard: CardStub,
        ConfirmDialog: ConfirmStub,
        BaseModal: StubbedModal,
        TemplatePreviewPane: true,
        SaveAsTemplateDialog: true,
      },
    },
  })
}

const rowEl = (w: ReturnType<typeof mountPage>, id: string) => w.get(`tr[data-template-id="${id}"]`)
const action = (w: ReturnType<typeof mountPage>, id: string, a: string) =>
  rowEl(w, id).find(`button[data-action="${a}"]`)

describe('LandingPageTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    selectedPageId.value = ''
    update.mockResolvedValue({})
    loadPages.mockResolvedValue(undefined)
    getTemplate.mockResolvedValue({ html: '<p/>' })
    listAll.mockResolvedValue([
      row({ id: 'seed', name: 'SaaS', source: 'seed', seed_modified: true, status: 'published' }),
      row({ id: 'arch', name: 'Lama', status: 'archived', source_page_id: 'src-1' }),
      row({ id: 'draft', name: 'Draft', status: 'draft', source_page_id: 'src-2' }),
    ])
  })

  it('baris seed yang diedit menampilkan "Bawaan" dan "diedit"', async () => {
    const w = mountPage()
    await flushPromises()
    expect(rowEl(w, 'seed').text()).toContain('Bawaan')
    expect(rowEl(w, 'seed').text()).toContain('diedit')
    expect(rowEl(w, 'draft').text()).toContain('Admin')
  })

  it('filter status Arsip hanya menampilkan baris archived', async () => {
    const w = mountPage()
    await flushPromises()
    await w.get('select[name="status-filter"]').setValue('archived')
    expect(w.findAll('tr[data-template-id]').map((r) => r.attributes('data-template-id'))).toEqual([
      'arch',
    ])
  })

  it('Pulihkan → update ke draft (bukan terbit) lalu daftar dimuat ulang', async () => {
    const w = mountPage()
    await flushPromises()
    await action(w, 'arch', 'restore').trigger('click')
    await flushPromises()
    expect(update).toHaveBeenCalledWith('arch', { status: 'draft' })
    expect(listAll).toHaveBeenCalledTimes(2)
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('tanpa source_page_id: tidak ada "Buka halaman sumber", ada "Salin ke halaman untuk diedit"', async () => {
    const w = mountPage()
    await flushPromises()
    expect(action(w, 'seed', 'open-source').exists()).toBe(false)
    expect(action(w, 'seed', 'copy-to-page').text()).toBe('Salin ke halaman untuk diedit')
    expect(action(w, 'draft', 'open-source').text()).toBe('Buka halaman sumber')
  })

  it('Salin ke halaman → copyToPage, pilih halaman baru, muat ulang daftar halaman, buka Content', async () => {
    copyToPage.mockResolvedValue({ page_id: 'new-page', slug: 'template-saas' })
    const w = mountPage()
    await flushPromises()
    await action(w, 'seed', 'copy-to-page').trigger('click')
    await flushPromises()
    expect(copyToPage).toHaveBeenCalledWith('seed')
    expect(loadPages).toHaveBeenCalled()
    expect(selectedPageId.value).toBe('new-page')
    expect(push).toHaveBeenCalledWith({ name: 'platform-landing-pages-content' })
  })

  it('Buka halaman sumber memilih halaman sumber dan membuka Content', async () => {
    const w = mountPage()
    await flushPromises()
    await action(w, 'draft', 'open-source').trigger('click')
    await flushPromises()
    expect(selectedPageId.value).toBe('src-2')
    expect(push).toHaveBeenCalledWith({ name: 'platform-landing-pages-content' })
  })

  it('Arsipkan meminta konfirmasi; Batal tidak memanggil update', async () => {
    const w = mountPage()
    await flushPromises()
    await action(w, 'draft', 'archive').trigger('click')
    const confirm = w.findComponent(ConfirmStub)
    expect(confirm.props('open')).toBe(true)
    confirm.vm.$emit('cancel')
    await flushPromises()
    expect(update).not.toHaveBeenCalled()

    await action(w, 'draft', 'archive').trigger('click')
    w.findComponent(ConfirmStub).vm.$emit('confirm')
    await flushPromises()
    expect(update).toHaveBeenCalledWith('draft', { status: 'archived' })
  })

  it('error dari server ditampilkan lewat toast', async () => {
    update.mockRejectedValue({ response: { data: { message: 'Tidak diizinkan' } } })
    const w = mountPage()
    await flushPromises()
    await action(w, 'draft', 'publish').trigger('click')
    await flushPromises()
    expect(toastError).toHaveBeenCalledWith('Tidak diizinkan')
  })
})
