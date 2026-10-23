import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const getUsage = vi.hoisted(() => vi.fn())
const list = vi.hoisted(() => vi.fn())
const upload = vi.hoisted(() => vi.fn())
const del = vi.hoisted(() => vi.fn())
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('@/features/storage/api/storage.api', () => ({
  storageApi: { list, getUsage, upload, delete: del },
}))

import StorageManagementPage from './StorageManagementPage.vue'

const MB = 1024 * 1024
const storageItem = (over: Record<string, unknown> = {}) => ({
  feature_key: 'storage.max_bytes',
  module: 'storage',
  name: 'Storage',
  state: 'quota',
  limit: 500 * MB,
  used: 999 * MB, // sengaja berbeda: used harus dari endpoint usage halaman ini
  remaining: 0,
  reset_strategy: 'never',
  at_limit: false,
  ...over,
})

async function mountPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const w = mount(StorageManagementPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: {
        PageHeader: true,
        StorageUploader: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
  await flushPromises()
  return { w, client }
}

describe('StorageManagementPage usage indicator', () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([])
    upload.mockReset()
    del.mockReset()
  })

  it('shows used from the page usage endpoint and limit from the summary', async () => {
    getUsage.mockResolvedValue({ used_bytes: 120 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    const { w } = await mountPage()
    expect(w.text().replace(/\s+/g, ' ')).toContain('120.0 MB / 500.0 MB')
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('24')
    expect(w.text()).not.toContain('penuh')
  })

  it('marks the indicator as full when the summary says at_limit', async () => {
    getUsage.mockResolvedValue({ used_bytes: 500 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem({ at_limit: true })])
    const { w } = await mountPage()
    expect(w.text()).toContain('penuh')
  })

  it('shows no limit or bar when storage is unlimited or absent', async () => {
    getUsage.mockResolvedValue({ used_bytes: 120 * MB, limit_bytes: null })
    summary.mockResolvedValue([])
    const { w } = await mountPage()
    expect(w.text()).toContain('tanpa batas')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('shows "penuh" when used >= limit even if the summary is stale', async () => {
    getUsage.mockResolvedValue({ used_bytes: 500 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem({ at_limit: false })])
    const { w } = await mountPage()
    expect(w.text()).toContain('penuh')
  })

  it('invalidates entitlements after a successful upload', async () => {
    getUsage.mockResolvedValue({ used_bytes: 1 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    upload.mockResolvedValue({})
    const { w, client } = await mountPage()
    const spy = vi.spyOn(client, 'invalidateQueries')
    w.findComponent({ name: 'StorageUploader' }).vm.$emit('upload', new File(['a'], 'a.txt'), {
      class: 'private',
    })
    await flushPromises()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['entitlements'] })
  })

  it('invalidates entitlements after a successful delete', async () => {
    getUsage.mockResolvedValue({ used_bytes: 1 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    list.mockResolvedValue([
      {
        id: 'o1',
        filename: 'a.txt',
        size_bytes: 10,
        class: 'private',
        created_at: '2026-10-01T00:00:00Z',
      },
    ])
    del.mockResolvedValue({})
    const { w, client } = await mountPage()
    const spy = vi.spyOn(client, 'invalidateQueries')
    await w.find('button[title="Hapus"]').trigger('click')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith({ queryKey: ['entitlements'] })
  })

  it('shows the full-quota banner in bytes with an upgrade link', async () => {
    getUsage.mockResolvedValue({ used_bytes: 500 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem({ at_limit: true, used: null })])
    const { w } = await mountPage()
    const banner = w.get('[role="status"]')
    expect(banner.text()).toContain('500.0 MB dari 500.0 MB')
    expect(banner.text()).toContain('Upgrade plan')
  })

  it('shows no banner when there is room', async () => {
    getUsage.mockResolvedValue({ used_bytes: 120 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    const { w } = await mountPage()
    expect(w.find('[role="status"]').exists()).toBe(false)
  })

  it('turns the bar red only when full, not at 90%', async () => {
    getUsage.mockResolvedValue({ used_bytes: 460 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    const { w } = await mountPage()
    const fill = w.get('[role="progressbar"] > div')
    expect(fill.classes()).toContain('bg-brand-500')
    expect(fill.classes()).not.toContain('bg-red-500')
  })
})
