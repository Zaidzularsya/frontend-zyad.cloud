import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import type { WhatsAppSession } from '@/features/whatsapp/types'

const sessionStatus = vi.fn()
const sessionQR = vi.fn()
const requestPairingCode = vi.fn()
vi.mock('@/features/whatsapp/api/whatsapp.api', () => ({
  whatsappApi: {
    sessionStatus: (...a: unknown[]) => sessionStatus(...a),
    sessionQR: (...a: unknown[]) => sessionQR(...a),
    requestPairingCode: (...a: unknown[]) => requestPairingCode(...a),
    startSession: vi.fn(),
  },
}))

import ConnectSessionModal from '@/features/whatsapp/components/ConnectSessionModal.vue'

const scanning: WhatsAppSession = {
  id: 's1',
  status: 'SCAN_QR_CODE',
  is_default: true,
  purpose: 'sales',
  auto_create_lead: false,
  created_at: '2026-09-24T00:00:00Z',
  updated_at: '2026-09-24T00:00:00Z',
}

function mountModal() {
  return mount(ConnectSessionModal, {
    props: { open: true, session: scanning },
    attachTo: document.body,
    global: {
      plugins: [
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
    },
  })
}

function bodyButton(label: string) {
  return Array.from(document.body.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  )
}

describe('ConnectSessionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders the QR data URL while waiting for a scan', async () => {
    sessionStatus.mockResolvedValue(scanning)
    sessionQR.mockResolvedValue({ qr: 'data:image/png;base64,QUJD', status: 'SCAN_QR_CODE' })
    mountModal()
    await flushPromises()

    const img = document.body.querySelector('img')
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,QUJD')
    expect(sessionQR).toHaveBeenCalledWith('s1')
  })

  it('validates the phone before requesting a pairing code', async () => {
    sessionStatus.mockResolvedValue(scanning)
    sessionQR.mockResolvedValue({ qr: 'data:image/png;base64,QUJD', status: 'SCAN_QR_CODE' })
    requestPairingCode.mockResolvedValue('ABCD-EFGH')
    const wrapper = mountModal()
    await flushPromises()

    bodyButton('Kode pairing')!.click()
    await flushPromises()
    const input = document.body.querySelector<HTMLInputElement>('input[name="pairing_phone"]')!

    input.value = '0812'
    input.dispatchEvent(new Event('input'))
    bodyButton('Minta kode pairing')!.click()
    await flushPromises()
    expect(requestPairingCode).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Masukkan nomor WhatsApp yang valid')

    input.value = '0812 3456 7890'
    input.dispatchEvent(new Event('input'))
    bodyButton('Minta kode pairing')!.click()
    await flushPromises()
    expect(requestPairingCode).toHaveBeenCalledWith('s1', '0812 3456 7890')
    expect(document.body.textContent).toContain('ABCD-EFGH')
    wrapper.unmount()
  })

  it('shows the connected number and emits connected', async () => {
    sessionStatus.mockResolvedValue({ ...scanning, status: 'WORKING', phone: '6281234567890' })
    const wrapper = mountModal()
    await flushPromises()

    expect(document.body.textContent).toContain('Terhubung')
    expect(document.body.textContent).toContain('+62 812-3456-7890')
    expect(wrapper.emitted('connected')?.[0]?.[0]).toMatchObject({ id: 's1', status: 'WORKING' })
  })
})
