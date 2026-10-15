import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import type { WhatsAppSession } from '@/features/whatsapp/types'
import type { Permission } from '@/types/auth'

const listSessions = vi.fn()
const deleteSession = vi.fn()
vi.mock('@/features/whatsapp/api/whatsapp.api', () => ({
  whatsappApi: {
    listSessions: (...a: unknown[]) => listSessions(...a),
    deleteSession: (...a: unknown[]) => deleteSession(...a),
    sessionStatus: vi.fn(),
    sessionQR: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    startSession: vi.fn(),
    stopSession: vi.fn(),
    logoutSession: vi.fn(),
    requestPairingCode: vi.fn(),
  },
}))

import WhatsAppConnectionsPage from '@/features/whatsapp/pages/WhatsAppConnectionsPage.vue'
import { useAuthStore } from '@/stores/auth.store'

const working: WhatsAppSession = {
  id: 's1',
  display_name: 'Sales Jakarta',
  phone: '6281234567890',
  status: 'WORKING',
  is_default: true,
  purpose: 'sales',
  auto_create_lead: true,
  created_at: '2026-09-24T00:00:00Z',
  updated_at: '2026-09-24T00:00:00Z',
}

function mountPage(permissions: Permission[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.$patch((state) => {
    ;(state as { user: unknown }).user = { id: 'u1', name: 'Ani', email: 'a@x.test', permissions }
  })
  return mount(WhatsAppConnectionsPage, {
    attachTo: document.body,
    global: {
      plugins: [
        pinia,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
}

describe('WhatsAppConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('shows an empty state with a connect action for managers', async () => {
    listSessions.mockResolvedValue([])
    const wrapper = mountPage(['whatsapp.session.read', 'whatsapp.session.manage'])
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada nomor terhubung')
    expect(wrapper.text()).toContain('Hubungkan nomor pertama')
  })

  it('hides manage actions without whatsapp.session.manage', async () => {
    listSessions.mockResolvedValue([working])
    const wrapper = mountPage(['whatsapp.session.read'])
    await flushPromises()
    expect(wrapper.text()).toContain('Sales Jakarta')
    expect(wrapper.text()).toContain('Terhubung')
    expect(wrapper.text()).toContain('+62 812-3456-7890')
    expect(wrapper.text()).not.toContain('Hapus')
    expect(wrapper.text()).not.toContain('Logout')
  })

  it('shows the error state with a retry', async () => {
    listSessions.mockRejectedValue({ response: { data: { code: 'FEATURE_NOT_ENABLED' } } })
    const wrapper = mountPage(['whatsapp.session.read'])
    await flushPromises()
    expect(wrapper.text()).toContain('belum mencakup fitur WhatsApp')
    expect(wrapper.text()).toContain('Muat ulang')
  })

  it('deletes a session only after confirming in the dialog', async () => {
    listSessions.mockResolvedValue([working])
    deleteSession.mockResolvedValue(undefined)
    const wrapper = mountPage(['whatsapp.session.read', 'whatsapp.session.manage'])
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((button) => button.text() === 'Hapus')
    await deleteButton!.trigger('click')
    expect(deleteSession).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Hapus koneksi WhatsApp?')

    const confirm = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hapus koneksi',
    )
    confirm!.click()
    await flushPromises()
    expect(deleteSession).toHaveBeenCalledWith('s1')
  })
})
