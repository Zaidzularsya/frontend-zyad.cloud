import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import SetupPlanModal from '@/features/mikrotik/components/SetupPlanModal.vue'
import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import { planFixture, routerFixture } from '@/features/mikrotik/testing/fixtures'

vi.mock('@/features/mikrotik/api/mikrotik.api', () => ({
  mikrotikApi: { setup: { preview: vi.fn(), apply: vi.fn(), cleanup: vi.fn() } },
}))

function findButton(label: string) {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )
}

function mountModal(router = routerFixture()) {
  return mount(SetupPlanModal, {
    props: { open: true, router },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
    attachTo: document.body,
  })
}

describe('SetupPlanModal', () => {
  beforeEach(() => {
    vi.mocked(mikrotikApi.setup.preview).mockReset().mockResolvedValue(planFixture())
    vi.mocked(mikrotikApi.setup.apply).mockReset().mockResolvedValue(routerFixture())
    document.body.innerHTML = ''
  })

  it('renders plan actions verbatim and applies with the preview plan_hash', async () => {
    const w = mountModal()
    await flushPromises()
    expect(mikrotikApi.setup.preview).toHaveBeenCalledWith('r1', { pool_cidr: '10.255.254.0/24' })
    const text = document.body.textContent ?? ''
    expect(text).toContain('/ppp/profile')
    expect(text).toContain('name=zyad-isolir')
    expect(text).toContain('local-address=10.255.254.1')
    expect(text).toContain('/ip/firewall/nat')
    const apply = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Terapkan',
    )
    apply?.click()
    await flushPromises()
    expect(mikrotikApi.setup.apply).toHaveBeenCalledWith('r1', {
      pool_cidr: '10.255.254.0/24',
      plan_hash: 'hash-abc',
    })
    expect(w.emitted('applied')).toHaveLength(1)
  })

  it('re-previews when the plan changed', async () => {
    vi.mocked(mikrotikApi.setup.apply).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_SETUP_PLAN_CHANGED', message: 'berubah' } },
    })
    mountModal()
    await flushPromises()
    const apply = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Terapkan',
    )
    apply?.click()
    await flushPromises()
    expect(mikrotikApi.setup.preview).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).toContain('Rencana berubah')
  })

  it('applies with the NEW hash after a PLAN_CHANGED re-preview', async () => {
    vi.mocked(mikrotikApi.setup.preview)
      .mockReset()
      .mockResolvedValueOnce(planFixture())
      .mockResolvedValueOnce({ ...planFixture(), hash: 'hash-new' })
    vi.mocked(mikrotikApi.setup.apply).mockRejectedValueOnce({
      response: { data: { code: 'MIKROTIK_SETUP_PLAN_CHANGED', message: 'berubah' } },
    })
    mountModal()
    await flushPromises()
    findButton('Terapkan')?.click()
    await flushPromises()
    findButton('Terapkan')?.click()
    await flushPromises()
    expect(vi.mocked(mikrotikApi.setup.apply).mock.calls[1]?.[1]).toEqual({
      pool_cidr: '10.255.254.0/24',
      plan_hash: 'hash-new',
    })
  })

  it('keeps Terapkan disabled until a preview exists', async () => {
    vi.mocked(mikrotikApi.setup.preview)
      .mockReset()
      .mockReturnValue(new Promise(() => {}))
    mountModal()
    await flushPromises()
    expect(findButton('Terapkan')?.disabled).toBe(true)
    expect(mikrotikApi.setup.apply).not.toHaveBeenCalled()
  })

  it('sends the same non-empty advanced payload plus plan_hash', async () => {
    mountModal()
    await flushPromises()
    const input = document.body.querySelector('input[name="profile_name"]') as HTMLInputElement
    input.value = 'isolir-x'
    input.dispatchEvent(new Event('input'))
    const rate = document.body.querySelector('input[name="rate_limit"]') as HTMLInputElement
    rate.value = '512k/512k'
    rate.dispatchEvent(new Event('input'))
    findButton('Pratinjau ulang')?.click()
    await flushPromises()
    const expected = {
      profile_name: 'isolir-x',
      pool_cidr: '10.255.254.0/24',
      rate_limit: '512k/512k',
    }
    expect(mikrotikApi.setup.preview).toHaveBeenLastCalledWith('r1', expected)
    findButton('Terapkan')?.click()
    await flushPromises()
    expect(mikrotikApi.setup.apply).toHaveBeenCalledWith('r1', {
      ...expected,
      plan_hash: 'hash-abc',
    })
  })

  it('disables Terapkan and asks for a new preview when inputs changed since the preview', async () => {
    mountModal()
    await flushPromises()
    expect(findButton('Terapkan')?.disabled).toBe(false)
    const input = document.body.querySelector('input[name="profile_name"]') as HTMLInputElement
    input.value = 'isolir-baru'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(findButton('Terapkan')?.disabled).toBe(true)
    expect(document.body.textContent).toContain(
      'Pratinjau ulang dulu — pengaturan berubah sejak pratinjau.',
    )
    findButton('Pratinjau ulang')?.click()
    await flushPromises()
    expect(findButton('Terapkan')?.disabled).toBe(false)
    expect(document.body.textContent).not.toContain('Pratinjau ulang dulu')
  })

  it('membuka wizard memuat pool_cidr default dan memanggil preview dengan payload tanpa host', async () => {
    mountModal()
    await flushPromises()
    const pool = document.body.querySelector('input[name="pool_cidr"]') as HTMLInputElement
    expect(pool.value).toBe('10.255.254.0/24')
    expect(pool.closest('details')).toBeNull()
    expect(document.body.textContent).toContain(
      'Rentang IP sementara untuk pelanggan terisolir. Aman dibiarkan default.',
    )
    const payload = vi.mocked(mikrotikApi.setup.preview).mock.calls[0]?.[1] ?? {}
    for (const key of ['platform_host', 'doku_hosts', 'tenant_isolir_host']) {
      expect(payload).not.toHaveProperty(key)
    }
    for (const name of ['platform_host', 'doku_hosts', 'tenant_isolir_host']) {
      expect(document.body.querySelector(`input[name="${name}"]`)).toBeNull()
    }
  })

  it.each(['10.0.0.1/24', 'abc', '8.8.8.0/24'])(
    'Pool CIDR tidak valid (%s) menampilkan galat kolom dan tidak memanggil preview',
    async (value) => {
      mountModal()
      await flushPromises()
      vi.mocked(mikrotikApi.setup.preview).mockClear()
      const pool = document.body.querySelector('input[name="pool_cidr"]') as HTMLInputElement
      pool.value = value
      pool.dispatchEvent(new Event('input'))
      await flushPromises()
      findButton('Pratinjau ulang')?.click()
      await flushPromises()
      expect(mikrotikApi.setup.preview).not.toHaveBeenCalled()
      expect(document.body.textContent).toContain(
        'Pool CIDR harus alamat jaringan privat, mis. 10.255.254.0/24',
      )
      expect(findButton('Terapkan')?.disabled).toBe(true)
    },
  )

  it('router.setup.pool_cidr terisi ulang', async () => {
    mountModal(
      routerFixture({
        setup: {
          profile_name: 'zyad-isolir',
          pool_cidr: '10.99.0.0/24',
          rate_limit: '1M/1M',
          redirect_url: '',
        },
      }),
    )
    await flushPromises()
    const pool = document.body.querySelector('input[name="pool_cidr"]') as HTMLInputElement
    expect(pool.value).toBe('10.99.0.0/24')
    expect(mikrotikApi.setup.preview).toHaveBeenCalledWith('r1', {
      profile_name: 'zyad-isolir',
      pool_cidr: '10.99.0.0/24',
      rate_limit: '1M/1M',
    })
  })

  it('tombol Terapkan nonaktif dan berlabel progres selama apply', async () => {
    vi.mocked(mikrotikApi.setup.apply)
      .mockReset()
      .mockReturnValue(new Promise(() => {}))
    mountModal()
    await flushPromises()
    findButton('Terapkan')?.click()
    await flushPromises()
    const btn = findButton('Menerapkan… (bisa sampai 1 menit)')
    expect(btn).toBeDefined()
    expect(btn?.disabled).toBe(true)
  })
})
