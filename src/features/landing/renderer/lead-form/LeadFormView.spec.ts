import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import type { GrapesChromeForm } from '../grapes/chrome'
import LeadFormView from './LeadFormView.vue'
import { DEFAULT_PRESENTATION, type LeadFormPresentation } from './lead-form-presentation'

const f = (key: string, type: string, label: string, required = false, options: string[] = []) => ({
  key,
  type,
  label,
  placeholder: '',
  options,
  required,
})

const FORM: GrapesChromeForm = {
  id: 'f1',
  submitLabel: 'Kirim',
  successMessage: 'Terima kasih!',
  redirectUrl: '',
  afterSubmit: 'message',
  whatsappNumber: '',
  whatsappMessage: '',
  fields: [
    f('name', 'text', 'Nama lengkap', true),
    f('email', 'email', 'Email kerja', true),
    f('phone', 'phone', 'No. WhatsApp', true),
    f('company_size', 'select', 'Jumlah karyawan', false, ['1–10', '11–50']),
    f('message', 'textarea', 'Pesan'),
    f('consent', 'checkbox', 'Saya setuju', true),
  ],
}

function mountView(
  presentation: Partial<LeadFormPresentation> = {},
  props: Record<string, unknown> = {},
) {
  return mount(LeadFormView, {
    props: {
      form: FORM,
      presentation: { ...DEFAULT_PRESENTATION, ...presentation },
      values: {},
      errors: {},
      state: 'idle',
      submitError: '',
      successHref: '',
      disabled: false,
      hint: '',
      ...props,
    },
  })
}

describe('LeadFormView', () => {
  it('applies the style modifier class for each of the five styles', () => {
    for (const style of ['kartu', 'minimal', 'glass', 'split', 'inline'] as const) {
      const root = mountView({ style }).get('section')
      expect(root.classes()).toContain('zy-slot-lead-form')
      expect(root.classes()).toContain(`zy-slot-lead-form--${style}`)
    }
  })

  it('legacy config renders kartu with current colors (no inline custom variables)', () => {
    const root = mountView().get('section')
    expect(root.classes()).toContain('zy-slot-lead-form--kartu')
    expect(root.attributes('style') ?? '').toBe('')
  })

  it('sets custom variables only when custom colors are chosen', () => {
    const root = mountView({ accent: '#1f6f5c', radius: 'lg', inheritFont: false }).get('section')
    const style = root.attributes('style')!
    expect(style).toContain('--zy-lf-accent-custom: #1f6f5c')
    expect(style).toContain('--zy-lf-on-accent-custom: #ffffff')
    expect(style).toContain('--zy-lf-radius-custom: 20px')
    expect(style).toContain('font-family')
    expect(style).not.toContain('--zy-lf-bg-custom')
    expect(style).not.toContain('--zy-lf-fg-custom')
  })

  it('renders split title and points beside the form, only for the split style', () => {
    const split = { title: 'Konsultasi gratis 30 menit', points: ['Cepat', 'Tanpa biaya'] }
    const w = mountView({ style: 'split', split })
    expect(w.get('.zy-slot-lead-form__aside-title').text()).toBe('Konsultasi gratis 30 menit')
    expect(w.findAll('.zy-slot-lead-form__points li').map((li) => li.text())).toEqual([
      'Cepat',
      'Tanpa biaya',
    ])
    expect(mountView({ style: 'kartu', split }).find('.zy-slot-lead-form__aside').exists()).toBe(
      false,
    )
  })

  it('cols-1 class only for styles that support columns', () => {
    expect(mountView({ style: 'kartu', columns: 1 }).get('section').classes()).toContain(
      'zy-slot-lead-form--cols-1',
    )
    expect(mountView({ style: 'glass', columns: 1 }).get('section').classes()).toContain(
      'zy-slot-lead-form--cols-1',
    )
    expect(mountView({ style: 'split', columns: 1 }).get('section').classes()).not.toContain(
      'zy-slot-lead-form--cols-1',
    )
    expect(mountView({ style: 'kartu', columns: 2 }).get('section').classes()).not.toContain(
      'zy-slot-lead-form--cols-1',
    )
  })

  it('success state shows the message and the WhatsApp link when successHref is set', () => {
    const w = mountView({}, { state: 'success', successHref: 'https://wa.me/62812?text=Hi' })
    expect(w.find('form').exists()).toBe(false)
    expect(w.get('.zy-slot-lead-form__success').text()).toContain('Terima kasih!')
    const link = w.get('a.zy-slot-lead-form__wa')
    expect(link.attributes('href')).toBe('https://wa.me/62812?text=Hi')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(mountView({}, { state: 'success' }).find('a.zy-slot-lead-form__wa').exists()).toBe(false)
  })

  it('emits update and submit; disabled blocks submit', async () => {
    const w = mountView()
    await w.get('input[name="name"]').setValue('Budi')
    await w.get('select[name="company_size"]').setValue('11–50')
    await w.get('input[name="consent"]').setValue(true)
    expect(w.emitted('update')).toEqual([
      ['name', 'Budi'],
      ['company_size', '11–50'],
      ['consent', true],
    ])
    await w.get('form').trigger('submit')
    expect(w.emitted('submit')).toHaveLength(1)

    const off = mountView({}, { disabled: true })
    expect(off.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(off.get('input[name="name"]').attributes('disabled')).toBeDefined()
  })

  it('inline style puts textarea, select and consent on their own grid row', () => {
    const w = mountView({ style: 'inline' })
    const full = (name: string) =>
      w
        .get(`[name="${name}"]`)
        .element.closest('.zy-slot-lead-form__field')!
        .classList.contains('zy-slot-lead-form__field--full')
    expect(full('message')).toBe(true)
    expect(full('company_size')).toBe(true)
    expect(full('consent')).toBe(true)
    expect(full('name')).toBe(false)
    // Gaya lain: select company_size setengah lebar.
    const other = mountView({ style: 'kartu' })
    expect(
      other
        .get('[name="company_size"]')
        .element.closest('.zy-slot-lead-form__field')!
        .classList.contains('zy-slot-lead-form__field--full'),
    ).toBe(false)
  })

  it('glass keeps real labels (for screen readers) and uses them as placeholder', () => {
    const w = mountView({ style: 'glass' })
    expect(w.get('label[for]').text()).toContain('Nama lengkap')
    expect(w.get('input[name="name"]').attributes('placeholder')).toBe('Nama lengkap *')
  })

  it('shows field errors with aria-describedby and the honeypot off-screen', () => {
    const w = mountView({}, { errors: { email: 'Wajib diisi.' } })
    const input = w.get('input[name="email"]')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(w.get('#' + input.attributes('aria-describedby')).text()).toBe('Wajib diisi.')
    expect(w.get('.zy-slot-lead-form__hp').attributes('aria-hidden')).toBe('true')
  })

  it('adds the built-in consent when the form has no consent field', () => {
    const w = mountView(
      {},
      { form: { ...FORM, fields: FORM.fields.filter((x) => x.key !== 'consent') } },
    )
    expect(w.find('input[name="consent"]').exists()).toBe(true)
  })

  it('exposes focusField', async () => {
    const w = mount(LeadFormView, {
      attachTo: document.body,
      props: {
        form: FORM,
        presentation: DEFAULT_PRESENTATION,
        values: {},
        errors: {},
        state: 'idle',
        submitError: '',
        successHref: '',
        disabled: false,
        hint: '',
      },
    })
    ;(w.vm as unknown as { focusField: (k: string) => void }).focusField('email')
    expect(document.activeElement).toBe(w.get('input[name="email"]').element)
    w.unmount()
  })
})
