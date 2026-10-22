import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const summary = vi.hoisted(() => vi.fn())
const getUsage = vi.hoisted(() => vi.fn())
vi.mock('@/features/entitlements/api/entitlements.api', () => ({ entitlementsApi: { summary } }))
vi.mock('@/features/storage/api/storage.api', () => ({
  storageApi: { list: vi.fn().mockResolvedValue([]), getUsage },
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
  return w
}

describe('StorageManagementPage usage indicator', () => {
  it('shows used from the page usage endpoint and limit from the summary', async () => {
    getUsage.mockResolvedValue({ used_bytes: 120 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem()])
    const w = await mountPage()
    expect(w.text().replace(/\s+/g, ' ')).toContain('120.0 MB / 500.0 MB')
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('24')
    expect(w.text()).not.toContain('penuh')
  })

  it('marks the indicator as full when the summary says at_limit', async () => {
    getUsage.mockResolvedValue({ used_bytes: 500 * MB, limit_bytes: null })
    summary.mockResolvedValue([storageItem({ at_limit: true })])
    const w = await mountPage()
    expect(w.text()).toContain('penuh')
  })

  it('shows no limit or bar when storage is unlimited or absent', async () => {
    getUsage.mockResolvedValue({ used_bytes: 120 * MB, limit_bytes: null })
    summary.mockResolvedValue([])
    const w = await mountPage()
    expect(w.text()).toContain('tanpa batas')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })
})
