import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppSession,
} from '@/features/whatsapp/types'
import type { Permission } from '@/types/auth'

const api = vi.hoisted(() => ({
  listSessions: vi.fn(),
  listConversations: vi.fn(),
  startConversation: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  retryMessage: vi.fn(),
  markConversationRead: vi.fn(),
}))
vi.mock('@/features/whatsapp/api/whatsapp.api', () => ({ whatsappApi: api }))
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/app/crm/leads/l1' }) }))

import ConversationPanel from '@/features/whatsapp/components/ConversationPanel.vue'
import { useAuthStore } from '@/stores/auth.store'

const working: WhatsAppSession = {
  id: 's1',
  display_name: 'Sales',
  phone: '6289999999999',
  status: 'WORKING',
  is_default: true,
  purpose: 'sales',
  auto_create_lead: false,
  created_at: '',
  updated_at: '',
}

const conversation: WhatsAppConversation = {
  id: 'c1',
  session_id: 's1',
  phone: '6281234567890',
  contact_name: 'Budi',
  related_entity_type: 'lead',
  related_entity_id: 'l1',
  unread_count: 0,
  status: 'open',
  created_at: '',
  updated_at: '',
}

const msg = (over: Partial<WhatsAppMessage>): WhatsAppMessage => ({
  id: 'm1',
  conversation_id: 'c1',
  direction: 'in',
  body: 'Halo',
  has_media: false,
  status: 'delivered',
  sent_at: new Date().toISOString(),
  ...over,
})

const ALL: Permission[] = [
  'whatsapp.conversation.read',
  'whatsapp.message.send',
  'whatsapp.session.read',
]

function mountPanel(permissions: Permission[] = ALL, phone = '0812-3456-7890') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().$patch((state) => {
    ;(state as { user: unknown }).user = { id: 'u1', name: 'Ani', email: 'a@x.test', permissions }
  })
  return mount(ConversationPanel, {
    props: {
      relatedEntityType: 'lead',
      relatedEntityId: 'l1',
      phone,
      entityName: 'Budi',
      active: true,
    },
    global: {
      plugins: [
        pinia,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

const button = (wrapper: ReturnType<typeof mountPanel>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))

describe('ConversationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listSessions.mockResolvedValue([working])
    api.listConversations.mockResolvedValue([])
    api.listMessages.mockResolvedValue({ messages: [] })
  })

  it('points to the WhatsApp page when no number is connected', async () => {
    api.listSessions.mockResolvedValue([{ ...working, status: 'STOPPED' }])
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada nomor WhatsApp yang terhubung')
    expect(wrapper.text()).toContain('Buka halaman WhatsApp')
  })

  it('asks to fix an invalid lead phone', async () => {
    const wrapper = mountPanel(ALL, '-')
    await flushPromises()
    expect(wrapper.text()).toContain('belum valid untuk WhatsApp')
    await button(wrapper, 'Ubah nomor')!.trigger('click')
    expect(wrapper.emitted('edit-phone')).toHaveLength(1)
  })

  it('starts a conversation for the lead', async () => {
    api.startConversation.mockResolvedValue(conversation)
    const wrapper = mountPanel()
    await flushPromises()
    api.listConversations.mockResolvedValue([conversation])
    await button(wrapper, 'Mulai chat ke +62 812-3456-7890')!.trigger('click')
    await flushPromises()
    expect(api.startConversation).toHaveBeenCalledWith({
      session_id: 's1',
      related_entity_type: 'lead',
      related_entity_id: 'l1',
    })
    expect(wrapper.text()).toContain('Belum ada pesan')
  })

  it('renders incoming and outgoing bubbles with delivery status', async () => {
    api.listConversations.mockResolvedValue([conversation])
    api.listMessages.mockResolvedValue({
      messages: [
        msg({ id: 'm1', body: 'Mau tanya harga' }),
        msg({ id: 'm2', direction: 'out', body: 'Siap, saya kirim', status: 'read' }),
      ],
    })
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.find('[data-direction="in"]').text()).toContain('Mau tanya harga')
    expect(wrapper.find('[data-direction="out"]').text()).toContain('Siap, saya kirim')
    expect(wrapper.find('[aria-label="Dibaca"]').exists()).toBe(true)
  })

  it('sends on Enter but not on Shift+Enter', async () => {
    api.listConversations.mockResolvedValue([conversation])
    api.sendMessage.mockResolvedValue(
      msg({ id: 'm9', direction: 'out', body: 'Halo Budi', status: 'sent' }),
    )
    const wrapper = mountPanel()
    await flushPromises()

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Halo Budi')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(api.sendMessage).not.toHaveBeenCalled()

    await textarea.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(api.sendMessage).toHaveBeenCalledWith('c1', 'Halo Budi')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('is read-only without whatsapp.message.send', async () => {
    api.listConversations.mockResolvedValue([conversation])
    const wrapper = mountPanel(['whatsapp.conversation.read', 'whatsapp.session.read'])
    await flushPromises()
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.text()).toContain('Anda hanya bisa membaca chat ini')
  })

  it('retries a failed message and marks unread conversations as read', async () => {
    api.listConversations.mockResolvedValue([{ ...conversation, unread_count: 2 }])
    api.listMessages.mockResolvedValue({
      messages: [
        msg({ id: 'm3', direction: 'out', status: 'failed', error: 'WhatsApp provider timed out' }),
      ],
    })
    api.retryMessage.mockResolvedValue(msg({ id: 'm3', direction: 'out', status: 'sent' }))
    const wrapper = mountPanel()
    await flushPromises()

    expect(api.markConversationRead).toHaveBeenCalledWith('c1')
    expect(wrapper.text()).toContain('WhatsApp provider timed out')
    await button(wrapper, 'Kirim ulang')!.trigger('click')
    await flushPromises()
    expect(api.retryMessage).toHaveBeenCalledWith('m3')
  })
})
