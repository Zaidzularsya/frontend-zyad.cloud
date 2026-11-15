import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import RouterLiveCards from '@/features/mikrotik/components/overview/RouterLiveCards.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import type { RouterStats } from '@/features/mikrotik/types'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { routers: { stats: vi.fn() } },
}))

function stats(over: Partial<RouterStats> = {}): RouterStats {
  return {
    identity: 'Core-1',
    board_name: 'CCR2004',
    version: '7.15.3',
    architecture: 'arm64',
    uptime: '2d3h4m',
    cpu_load: 23,
    memory_total: 4 * 1024 ** 3,
    memory_free: 3 * 1024 ** 3,
    ppp_active: 142,
    fetched_at: new Date().toISOString(),
    ...over,
  }
}

function httpError(status: number, code: string) {
  return Object.assign(new Error(code), { response: { status, data: { code } } })
}

async function mountCards(secretsTotal: number | undefined = 180) {
  const w = mount(RouterLiveCards, {
    props: { routerId: 'r1', secretsTotal },
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  await flushPromises()
  return w
}

describe('RouterLiveCards', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.routers.stats).mockReset()
  })

  it('shows the rate-limit message on HTTP 429', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockRejectedValue(httpError(429, 'RATE_LIMITED'))
    const w = await mountCards()
    expect(w.text()).toContain('Terlalu sering, coba lagi sebentar.')
    expect(w.text()).not.toContain('Router tidak bisa dihubungi.')
  })

  it('shows the unreachable message with the reason on other errors', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockRejectedValue(httpError(502, 'MIKROTIK_UNREACHABLE'))
    const w = await mountCards()
    expect(w.text()).toContain('Router tidak bisa dihubungi.')
    expect(w.text()).toContain('Router tidak terjangkau.')
    expect(w.text()).toContain('Coba lagi')
  })

  it('retries on "Coba lagi"', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockRejectedValueOnce(
      httpError(502, 'MIKROTIK_UNREACHABLE'),
    )
    const w = await mountCards()
    vi.mocked(mikrotikApi.routers.stats).mockResolvedValue(stats())
    const retry = w.findAll('button').find((b) => b.text() === 'Coba lagi')
    await retry!.trigger('click')
    await flushPromises()
    expect(mikrotikApi.routers.stats).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('142 online dari 180 secret')
  })

  it('shows "-" for null values', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockResolvedValue(
      stats({ cpu_load: null, memory_total: null, memory_free: null }),
    )
    const w = await mountCards()
    expect(w.get('[data-stat="cpu"]').text()).toContain('-')
    expect(w.get('[data-stat="cpu"]').text()).not.toContain('%')
    expect(w.get('[data-stat="memory"]').text()).toContain('-')
  })

  it('shows active PPPoE sessions against the secret count', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockResolvedValue(stats())
    const w = await mountCards()
    expect(w.text()).toContain('142 online dari 180 secret')
    expect(w.get('[data-stat="cpu"]').text()).toContain('23%')
    expect(w.get('[data-stat="memory"]').text()).toContain('1 GiB')
    expect(w.get('[data-stat="memory"]').text()).toContain('4 GiB')
    expect(w.text()).toContain('Diperbarui')
    expect(w.text()).toContain('Segarkan')
  })

  it('shows a skeleton while loading', async () => {
    vi.mocked(mikrotikApi.routers.stats).mockReturnValue(new Promise(() => {}))
    const w = await mountCards()
    expect(w.find('[data-state="loading"]').exists()).toBe(true)
  })
})
