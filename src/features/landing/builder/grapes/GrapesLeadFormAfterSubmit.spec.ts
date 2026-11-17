import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { LandingFormWithFields } from '../../shared/types/landing.types'
import GrapesLeadFormAfterSubmit from './GrapesLeadFormAfterSubmit.vue'

function makeForm(over: Partial<LandingFormWithFields> = {}): LandingFormWithFields {
  return {
    id: 'f1',
    name: 'Form Konsultasi',
    key: 'konsultasi',
    submit_label: 'Kirim',
    success_message: 'Terima kasih',
    redirect_url: null,
    is_active: true,
    create_crm_lead: true,
    lead_owner_user_id: null,
    after_submit: 'message',
    whatsapp_number: null,
    whatsapp_message: null,
    created_at: '',
    updated_at: '',
    fields: [],
    ...over,
  }
}

const mountIt = (over: Partial<LandingFormWithFields> = {}) =>
  mount(GrapesLeadFormAfterSubmit, { props: { form: makeForm(over) } })

const patches = (w: ReturnType<typeof mountIt>) =>
  (w.emitted('patch') ?? []).map((e) => e[0] as Record<string, unknown>)

describe('GrapesLeadFormAfterSubmit', () => {
  it('reflects the saved action in the radio group', () => {
    const w = mountIt({ after_submit: 'whatsapp', whatsapp_number: '6281234567890' })
    expect(
      (w.get('input[type="radio"][value="whatsapp"]').element as HTMLInputElement).checked,
    ).toBe(true)
    expect((w.get('input[aria-label="Nomor WhatsApp"]').element as HTMLInputElement).value).toBe(
      '6281234567890',
    )
  })

  it('choosing message emits after_submit message', async () => {
    const w = mountIt({ after_submit: 'redirect', redirect_url: '/ok' })
    await w.get('input[type="radio"][value="message"]').setValue(true)
    expect(patches(w)).toEqual([{ after_submit: 'message' }])
  })

  it('choosing whatsapp with a valid number emits after_submit and normalized number', async () => {
    const w = mountIt({ whatsapp_number: '6281234567890' })
    await w.get('input[type="radio"][value="whatsapp"]').setValue(true)
    expect(patches(w)).toEqual([{ after_submit: 'whatsapp', whatsapp_number: '6281234567890' }])
  })

  it('does not emit after_submit whatsapp until the number is valid', async () => {
    const w = mountIt()
    await w.get('input[type="radio"][value="whatsapp"]').setValue(true)
    expect(patches(w)).toEqual([])

    const input = w.get('input[aria-label="Nomor WhatsApp"]')
    await input.setValue('0812')
    expect(patches(w)).toEqual([])
    expect(w.text()).toContain('Nomor WhatsApp tidak valid.')

    await input.setValue('0812-3456-7890')
    expect(patches(w)).toEqual([{ whatsapp_number: '6281234567890', after_submit: 'whatsapp' }])
    expect(w.text()).not.toContain('Nomor WhatsApp tidak valid.')
  })

  it('does not emit after_submit redirect until the URL is valid; rejects unsafe URLs', async () => {
    const w = mountIt()
    await w.get('input[type="radio"][value="redirect"]').setValue(true)
    expect(patches(w)).toEqual([])

    const input = w.get('input[aria-label="URL redirect"]')
    await input.setValue('javascript:alert(1)')
    expect(patches(w)).toEqual([])
    expect(w.text()).toContain('URL tidak valid')

    await input.setValue('/terima-kasih')
    expect(patches(w)).toEqual([{ redirect_url: '/terima-kasih', after_submit: 'redirect' }])
  })

  it('keeps submit label validation (required, max 100)', async () => {
    const w = mountIt()
    const input = w.get('input[aria-label="Judul tombol"]')
    await input.setValue('  ')
    expect(w.text()).toContain('Judul tombol wajib diisi.')
    await input.setValue('x'.repeat(101))
    expect(w.text()).toContain('Judul tombol maksimal 100 karakter.')
    expect(patches(w)).toEqual([])
    await input.setValue('Kirim sekarang')
    expect(patches(w)).toEqual([{ submit_label: 'Kirim sekarang' }])
  })

  it('limits the whatsapp template to 500 characters and saves it trimmed', async () => {
    const w = mountIt({ after_submit: 'whatsapp', whatsapp_number: '6281234567890' })
    const area = w.get('textarea[aria-label="Template pesan WhatsApp"]')
    await area.setValue('x'.repeat(501))
    expect(w.text()).toContain('maksimal 500 karakter')
    expect(patches(w)).toEqual([])
    await area.setValue('  Halo {nama}  ')
    expect(patches(w)).toEqual([{ whatsapp_message: 'Halo {nama}' }])
  })

  it('hides the success message input when the action is redirect', () => {
    const w = mountIt({ after_submit: 'redirect', redirect_url: '/ok' })
    expect(w.find('textarea[aria-label="Pesan sukses"]').exists()).toBe(false)
    const m = mountIt()
    expect(m.find('textarea[aria-label="Pesan sukses"]').exists()).toBe(true)
  })
})
