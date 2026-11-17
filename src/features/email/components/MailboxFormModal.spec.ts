import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/features/email/api/email.api', () => ({
  emailApi: {
    microsoftOAuthStatus: vi.fn(),
    startMicrosoftOAuth: vi.fn(),
    createMailbox: vi.fn(),
    updateMailbox: vi.fn(),
  },
}))

import MailboxFormModal from '@/features/email/components/MailboxFormModal.vue'
import { emailApi } from '@/features/email/api/email.api'
import type { Mailbox } from '@/features/email/types'

const api = vi.mocked(emailApi, true)

async function mountModal(enabled: boolean, mailbox: Mailbox | null = null) {
  setActivePinia(createPinia())
  api.microsoftOAuthStatus.mockResolvedValue(enabled)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/platform/email-accounts',
        name: 'platform-email-accounts',
        component: { template: '<i/>' },
      },
    ],
  })
  await router.push('/platform/email-accounts')
  const wrapper = mount(MailboxFormModal, {
    props: { open: true, mailbox },
    attachTo: document.body,
    global: {
      plugins: [
        router,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
  await flushPromises()
  return wrapper
}

function selectProvider(value: string) {
  const select = document.body.querySelector('select') as HTMLSelectElement
  select.value = value
  select.dispatchEvent(new Event('change'))
}

function button(label: string) {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)
}

describe('MailboxFormModal — Microsoft', () => {
  const assign = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    sessionStorage.clear()
    Object.defineProperty(window, 'location', { value: { assign }, writable: true })
  })

  it('replaces the password form with Microsoft sign-in for Outlook', async () => {
    api.startMicrosoftOAuth.mockResolvedValue('https://login.microsoftonline.com/authorize?x=1')
    const wrapper = await mountModal(true)
    selectProvider('outlook')
    await flushPromises()

    expect(document.body.querySelector('input[name="password"]')).toBeNull()
    button('Masuk dengan Microsoft')?.click()
    await flushPromises()

    expect(api.startMicrosoftOAuth).toHaveBeenCalledWith({
      mailbox_id: undefined,
      display_name: undefined,
    })
    expect(assign).toHaveBeenCalledWith('https://login.microsoftonline.com/authorize?x=1')
    expect(sessionStorage.getItem('zyad.mailbox-oauth.return')).toBe('platform-email-accounts')
    expect(api.createMailbox).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the password form when the server has no Microsoft app', async () => {
    const wrapper = await mountModal(false)
    selectProvider('outlook')
    await flushPromises()

    expect(document.body.querySelector('input[name="password"]')).not.toBeNull()
    expect(button('Masuk dengan Microsoft')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers reconnect for an OAuth mailbox', async () => {
    api.startMicrosoftOAuth.mockResolvedValue('https://login.example/authorize')
    const wrapper = await mountModal(true, {
      id: 'mb-1',
      email_address: 'lisa@outlook.com',
      display_name: 'Lisa',
      username: 'lisa@outlook.com',
      auth_method: 'microsoft_oauth',
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      smtp_security: 'starttls',
      imap_host: 'outlook.office365.com',
      imap_port: 993,
      imap_security: 'ssl',
      status: 'error',
      last_error: 'microsoft authorization expired',
      has_inbox_sync: true,
      last_synced_at: null,
      created_at: '',
      updated_at: '',
    })

    expect(document.body.querySelector('input[name="password"]')).toBeNull()
    button('Hubungkan ulang')?.click()
    await flushPromises()
    expect(api.startMicrosoftOAuth).toHaveBeenCalledWith({
      mailbox_id: 'mb-1',
      display_name: 'Lisa',
    })
    wrapper.unmount()
  })
})
