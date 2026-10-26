import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const success = vi.fn()
const error = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success, error }) }))

import ActivationLinksPanel from './ActivationLinksPanel.vue'

const props = {
  buyerName: 'Budi',
  buyerContact: '081234567890',
  pageTitle: 'Undangan Budi',
  previewUrl: 'https://reseller.zyad.cloud/preview/TOKEN',
  paymentUrl: 'https://zyad.cloud/i/PAY',
}

function mountPanel(extra: Record<string, unknown> = {}) {
  return mount(ActivationLinksPanel, { props: { ...props, ...extra } })
}

beforeEach(() => {
  success.mockReset()
  error.mockReset()
})

describe('ActivationLinksPanel', () => {
  it('menampilkan kedua link', () => {
    const w = mountPanel()
    expect((w.get('input[name="preview_url"]').element as HTMLInputElement).value).toBe(
      props.previewUrl,
    )
    expect((w.get('input[name="payment_url"]').element as HTMLInputElement).value).toBe(
      props.paymentUrl,
    )
  })

  it('tanpa link preview (mis. hanya tagihan) bagian preview tidak tampil', () => {
    const w = mountPanel({ previewUrl: undefined })
    expect(w.find('input[name="preview_url"]').exists()).toBe(false)
    expect(w.find('[data-testid="share-whatsapp-preview"]').exists()).toBe(false)
    expect(w.find('input[name="payment_url"]').exists()).toBe(true)
  })

  it('menyalin link ke clipboard dan memberi tahu', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const w = mountPanel()
    await w.get('[data-testid="copy-payment"]').trigger('click')
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith(props.paymentUrl)
    expect(success).toHaveBeenCalled()
  })

  it('gagal menyalin → pesan galat, bukan sukses palsu', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('x')) },
    })
    const w = mountPanel()
    await w.get('[data-testid="copy-preview"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    expect(error).toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

  it('tombol WhatsApp menargetkan nomor pelanggan', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const w = mountPanel()
    await w.get('[data-testid="share-whatsapp-all"]').trigger('click')
    const url = open.mock.calls[0]?.[0] as string
    expect(url.startsWith('https://wa.me/6281234567890?text=')).toBe(true)
    const text = decodeURIComponent(url.split('?text=')[1] ?? '')
    expect(text).toContain(props.previewUrl)
    expect(text).toContain(props.paymentUrl)
    open.mockRestore()
  })

  it('nomor tidak valid → galat, WhatsApp tidak dibuka', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const w = mountPanel({ buyerContact: '0812' })
    await w.get('[data-testid="share-whatsapp-all"]').trigger('click')
    expect(open).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('tidak valid'))
    open.mockRestore()
  })
})
