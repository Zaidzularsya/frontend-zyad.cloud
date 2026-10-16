import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const replaceFormFields = vi.fn()
vi.mock('../../shared/api/landing.api', () => ({
  landingApi: { replaceFormFields: (...a: unknown[]) => replaceFormFields(...a) },
}))

import type { LandingFormWithFields } from '../../shared/types/landing.types'
import { presetFields } from './lead-form-presets'
import GrapesLeadFormFields from './GrapesLeadFormFields.vue'

function makeForm(fields = presetFields('ringkas')): LandingFormWithFields {
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
    fields,
  }
}

function mountFields(form = makeForm()) {
  return mount(GrapesLeadFormFields, { props: { pageId: 'p1', form }, attachTo: document.body })
}

const radio = (w: ReturnType<typeof mountFields>, key: string, text: string) =>
  w
    .get(`[data-field="${key}"] [role="radiogroup"]`)
    .findAll('[role="radio"]')
    .find((r) => r.text() === text)!

const sentFields = (call = 0) =>
  (replaceFormFields.mock.calls[call]![2] as { fields: Array<Record<string, unknown>> }).fields

describe('GrapesLeadFormFields', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    replaceFormFields.mockReset()
    replaceFormFields.mockImplementation((_p: string, _f: string, body: { fields: unknown[] }) =>
      Promise.resolve({ data: body.fields }),
    )
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows lock icons and no status control for name/email/phone/consent', () => {
    const w = mountFields()
    for (const key of ['name', 'email', 'phone', 'consent']) {
      const row = w.get(`[data-field="${key}"]`)
      expect(row.find('[aria-label="Terkunci"]').exists()).toBe(true)
      expect(row.find('[role="radiogroup"]').exists()).toBe(false)
    }
    for (const key of ['company', 'company_size', 'interest', 'message']) {
      const row = w.get(`[data-field="${key}"]`)
      expect(row.find('[role="radiogroup"]').exists()).toBe(true)
      expect(row.find('[aria-label="Terkunci"]').exists()).toBe(false)
    }
  })

  it('renders fields ordered by sort_order and marks the current status', () => {
    const w = mountFields()
    expect(w.findAll('[data-field]').map((r) => r.attributes('data-field'))).toEqual([
      'name',
      'email',
      'phone',
      'company',
      'company_size',
      'interest',
      'message',
      'consent',
    ])
    expect(radio(w, 'company', 'Sembunyi').attributes('aria-checked')).toBe('true')
  })

  it('changing status to Sembunyi reveals the default value input', async () => {
    const w = mountFields(makeForm(presetFields('lengkap')))
    await w.get('[data-field="interest"] [data-action="toggle"]').trigger('click')
    expect(w.find('[data-field="interest"] [aria-label="Nilai default"]').exists()).toBe(false)
    await radio(w, 'interest', 'Sembunyi').trigger('click')
    expect(w.find('[data-field="interest"] [aria-label="Nilai default"]').exists()).toBe(true)
  })

  it('uses a dropdown of the options for the default value of a hidden select', async () => {
    const w = mountFields()
    await w.get('[data-field="company_size"] [data-action="toggle"]').trigger('click')
    const select = w.get('[data-field="company_size"] select[aria-label="Nilai default"]')
    expect(select.findAll('option').map((o) => o.text())).toEqual([
      '(kosong)',
      '1–10',
      '11–50',
      '51–200',
      '201–1000',
      '>1000',
    ])
  })

  it('debounces edits into one replaceFormFields call after 600ms', async () => {
    const w = mountFields()
    await radio(w, 'company', 'Tampil').trigger('click')
    await radio(w, 'message', 'Wajib').trigger('click')
    vi.advanceTimersByTime(599)
    expect(replaceFormFields).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(replaceFormFields).toHaveBeenCalledTimes(1)
    expect(replaceFormFields.mock.calls[0]!.slice(0, 2)).toEqual(['p1', 'f1'])
    const sent = sentFields()
    expect(sent).toHaveLength(8)
    expect(sent.find((f) => f.key === 'company')).toMatchObject({ type: 'text', required: false })
    expect(sent.find((f) => f.key === 'message')).toMatchObject({
      type: 'textarea',
      required: true,
    })
    expect(w.text()).toContain('Tersimpan')
    expect(w.emitted('saved')).toHaveLength(1)
  })

  it('sends hidden fields with original_type and default_value', async () => {
    const w = mountFields(makeForm(presetFields('lengkap')))
    await w.get('[data-field="interest"] [data-action="toggle"]').trigger('click')
    await radio(w, 'interest', 'Sembunyi').trigger('click')
    await w
      .get('[data-field="interest"] input[aria-label="Nilai default"]')
      .setValue('Paket 20 Mbps')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(sentFields().find((f) => f.key === 'interest')).toMatchObject({
      type: 'hidden',
      required: false,
      default_value: 'Paket 20 Mbps',
      validation: { original_type: 'text' },
    })
  })

  it('ignores stale save responses', async () => {
    const resolvers: Array<(v: unknown) => void> = []
    replaceFormFields.mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve as (v: unknown) => void)),
    )
    const w = mountFields()
    await radio(w, 'company', 'Tampil').trigger('click')
    vi.advanceTimersByTime(600)
    await radio(w, 'message', 'Tampil').trigger('click')
    vi.advanceTimersByTime(600)
    expect(replaceFormFields).toHaveBeenCalledTimes(2)

    resolvers[1]!({ data: sentFields(1) })
    await flushPromises()
    expect(w.emitted('saved')).toHaveLength(1)
    resolvers[0]!({ data: sentFields(0) })
    await flushPromises()
    expect(w.emitted('saved')).toHaveLength(1)
    expect(w.text()).toContain('Tersimpan')
  })

  it('flushes pending save on unmount', async () => {
    const w = mountFields()
    await radio(w, 'company', 'Tampil').trigger('click')
    expect(replaceFormFields).not.toHaveBeenCalled()
    w.unmount()
    expect(replaceFormFields).toHaveBeenCalledTimes(1)
    expect(sentFields().find((f) => f.key === 'company')).toMatchObject({ type: 'text' })
  })

  it('reverts to last saved fields and shows the core-fields message on 422', async () => {
    replaceFormFields.mockRejectedValueOnce({
      response: {
        status: 422,
        data: { code: 'LANDING_FORM_CORE_FIELDS', message: 'Nama, Email, dan No. WA wajib…' },
      },
    })
    const w = mountFields()
    await radio(w, 'company', 'Tampil').trigger('click')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(w.text()).toContain('Nama, Email, dan No. WA wajib untuk form yang meneruskan ke CRM.')
    expect(radio(w, 'company', 'Sembunyi').attributes('aria-checked')).toBe('true')
    expect(w.emitted('saved')).toBeUndefined()
  })

  it('shows retry state on network error and resends current fields on retry', async () => {
    replaceFormFields.mockRejectedValueOnce(new Error('network'))
    const w = mountFields()
    await radio(w, 'company', 'Tampil').trigger('click')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(w.text()).toContain('Gagal menyimpan · Coba lagi')
    // State panel dipertahankan, tidak ditimpa data server.
    expect(radio(w, 'company', 'Tampil').attributes('aria-checked')).toBe('true')

    await w.get('[data-action="retry"]').trigger('click')
    await flushPromises()
    expect(replaceFormFields).toHaveBeenCalledTimes(2)
    expect(sentFields(1).find((f) => f.key === 'company')).toMatchObject({ type: 'text' })
    expect(w.text()).toContain('Tersimpan')
  })

  it('preset button asks for confirmation before applying', async () => {
    const w = mountFields()
    await w.get('[data-preset="lengkap"]').trigger('click')
    expect(w.text()).toContain('Status field akan diganti sesuai preset. Lanjutkan?')
    expect(radio(w, 'company', 'Sembunyi').attributes('aria-checked')).toBe('true')

    await w.get('[data-action="preset-cancel"]').trigger('click')
    expect(w.text()).not.toContain('Status field akan diganti')
    vi.advanceTimersByTime(1000)
    expect(replaceFormFields).not.toHaveBeenCalled()

    await w.get('[data-preset="lengkap"]').trigger('click')
    await w.get('[data-action="preset-confirm"]').trigger('click')
    expect(radio(w, 'company', 'Tampil').attributes('aria-checked')).toBe('true')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(replaceFormFields).toHaveBeenCalledTimes(1)
  })

  it('moves a field with the arrow buttons and renumbers sort_order', async () => {
    const w = mountFields()
    await w.get('[data-field="company"] [data-action="down"]').trigger('click')
    expect(
      w
        .findAll('[data-field]')
        .map((r) => r.attributes('data-field'))
        .slice(3, 5),
    ).toEqual(['company_size', 'company'])
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(sentFields().map((f) => f.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('edits options one per line and clears a default that is no longer an option', async () => {
    const w = mountFields(makeForm(presetFields('lengkap')))
    await w.get('[data-field="company_size"] [data-action="toggle"]').trigger('click')
    await radio(w, 'company_size', 'Sembunyi').trigger('click')
    await w.get('[data-field="company_size"] select[aria-label="Nilai default"]').setValue('11–50')
    await w.get('[data-field="company_size"] textarea[aria-label="Opsi"]').setValue('1–5\n6–20')
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(sentFields().find((f) => f.key === 'company_size')).toMatchObject({
      options: ['1–5', '6–20'],
      default_value: '',
    })
  })

  it('does not save a blank label', async () => {
    const w = mountFields()
    await w.get('[data-field="name"] [data-action="toggle"]').trigger('click')
    await w.get('[data-field="name"] input[aria-label="Label"]').setValue('  ')
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(replaceFormFields).not.toHaveBeenCalled()
    expect(w.text()).toContain('Label wajib diisi.')
  })
})
