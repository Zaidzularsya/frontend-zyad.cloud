import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const replace = vi.fn()
const logout = vi.fn().mockResolvedValue(undefined)

vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }) }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ logout }) }))
vi.mock('@/config/env', () => ({ env: { VITE_SUPPORT_EMAIL: 'support@zyad.test' } }))

import WorkspaceSuspendedPage from './WorkspaceSuspendedPage.vue'

describe('WorkspaceSuspendedPage', () => {
  beforeEach(() => {
    push.mockReset()
    replace.mockReset()
    logout.mockClear()
  })

  it('menampilkan judul, penjelasan, dan tautan support', () => {
    const wrapper = mount(WorkspaceSuspendedPage)
    expect(wrapper.text()).toContain('Workspace ditangguhkan')
    expect(wrapper.text()).toContain('link pembayaran sudah dikirim ke email owner workspace')
    expect(wrapper.text()).toContain('aktif kembali otomatis setelah tagihan lunas')
    expect(wrapper.get('[data-testid="support-link"]').attributes('href')).toBe(
      'mailto:support@zyad.test',
    )
  })

  it('Ganti workspace → pilih workspace; Keluar → logout lalu login', async () => {
    const wrapper = mount(WorkspaceSuspendedPage)
    const buttons = wrapper.findAll('button')
    await buttons.find((b) => b.text() === 'Ganti workspace')!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'select-tenant' })
    await buttons.find((b) => b.text() === 'Keluar')!.trigger('click')
    await Promise.resolve()
    expect(logout).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith({ name: 'login' })
  })
})
