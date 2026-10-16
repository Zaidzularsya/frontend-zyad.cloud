import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import type { GrapesChrome, GrapesChromeForm } from '../../grapes/chrome'
import { LANDING_PAGE_CONTEXT } from '../page-context'

const push = vi.fn()
const submitPublicForm = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../../shared/api/landing.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/landing.api')>()),
  landingApi: { submitPublicForm: (...a: unknown[]) => submitPublicForm(...a) },
}))

import { SubmitFormError } from '../../../shared/api/landing.api'
import { SLOT_REGISTRY } from '../slot-registry'
import LeadFormSlot from './LeadFormSlot.vue'

const FORM_ID = 'form-1'

function makeForm(over: Partial<GrapesChromeForm> = {}): GrapesChromeForm {
  return {
    id: FORM_ID,
    submitLabel: 'Kirim',
    successMessage: 'Terima kasih!',
    redirectUrl: '',
    afterSubmit: 'message',
    whatsappNumber: '',
    whatsappMessage: '',
    fields: [
      {
        key: 'name',
        type: 'text',
        label: 'Nama lengkap',
        placeholder: '',
        options: [],
        required: true,
      },
      {
        key: 'email',
        type: 'email',
        label: 'Email kerja',
        placeholder: '',
        options: [],
        required: true,
      },
      {
        key: 'phone',
        type: 'phone',
        label: 'No. WhatsApp',
        placeholder: '',
        options: [],
        required: true,
      },
      {
        key: 'company_size',
        type: 'select',
        label: 'Jumlah karyawan',
        placeholder: '',
        options: ['1–10', '11–50'],
        required: false,
      },
      {
        key: 'interest',
        type: 'text',
        label: 'Minat',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        key: 'message',
        type: 'textarea',
        label: 'Pesan',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        key: 'consent',
        type: 'checkbox',
        label: 'Saya setuju',
        placeholder: '',
        options: [],
        required: true,
      },
    ],
    ...over,
  }
}

function mountSlot(
  form: GrapesChromeForm | null = makeForm(),
  config: unknown = { form_id: FORM_ID },
) {
  const interest = ref('')
  const ctx = {
    orgType: computed(() => 'platform'),
    interest,
    scrollToId: vi.fn(),
  }
  const chrome: GrapesChrome = { forms: form ? [form] : [] }
  const w = mount(LeadFormSlot, {
    attachTo: document.body,
    props: {
      host: document.createElement('div'),
      chrome,
      dataset: { zyadConfig: JSON.stringify(config) },
    },
    global: { provide: { [LANDING_PAGE_CONTEXT as symbol]: ctx } },
  })
  return { w, ctx, interest }
}

async function fillValid(w: ReturnType<typeof mountSlot>['w']) {
  await w.find('input[name="name"]').setValue('Budi')
  await w.find('input[name="email"]').setValue('budi@acme.co')
  await w.find('input[name="phone"]').setValue('0812 3456 7890')
  await w.find('input[name="consent"]').setValue(true)
}

beforeEach(() => {
  push.mockReset()
  submitPublicForm.mockReset()
  window.history.replaceState({}, '', '/')
})

describe('LeadFormSlot — previewForm', () => {
  function mountPreview(withPreview: boolean) {
    const ctx = { orgType: computed(() => 'platform'), interest: ref(''), scrollToId: vi.fn() }
    const chrome: GrapesChrome = {
      forms: [],
      previewForm: withPreview ? makeForm({ id: 'preview', submitLabel: 'Kirim' }) : undefined,
    }
    return mount(LeadFormSlot, {
      attachTo: document.body,
      props: { host: document.createElement('div'), chrome, dataset: { zyadConfig: '{}' } },
      global: { provide: { [LANDING_PAGE_CONTEXT as symbol]: ctx } },
    })
  }

  it('merender form contoh dengan input dan tombol kirim nonaktif', async () => {
    const w = mountPreview(true)
    expect(w.find('form').exists()).toBe(true)
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(w.findAll('input[name="name"]')[0]!.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain(
      'Contoh form — hubungkan form di panel Konten setelah template dipakai.',
    )
    await w.get('form').trigger('submit')
    expect(submitPublicForm).not.toHaveBeenCalled()
  })

  it('tanpa previewForm dan tanpa form → tidak merender apa pun', () => {
    expect(mountPreview(false).find('form').exists()).toBe(false)
  })
})

describe('LeadFormSlot', () => {
  it('is registered under the lead-form key', () => {
    expect(SLOT_REGISTRY['lead-form']).toBeTruthy()
  })

  it('renders nothing when the configured form is missing', () => {
    const { w } = mountSlot(null)
    expect(w.html()).not.toContain('zy-slot-lead-form')
    const other = mountSlot(makeForm(), { form_id: 'unknown' })
    expect(other.w.html()).not.toContain('zy-slot-lead-form')
  })

  it('renders fields by type and the consent link', () => {
    const { w } = mountSlot()
    expect(w.find('input[name="name"]').attributes('type')).toBe('text')
    expect(w.find('input[name="email"]').attributes('type')).toBe('email')
    expect(w.find('input[name="phone"]').attributes('type')).toBe('tel')
    expect(w.findAll('select[name="company_size"] option').map((o) => o.text())).toContain('11–50')
    expect(w.find('textarea[name="message"]').exists()).toBe(true)
    expect(w.find('input[name="consent"]').attributes('type')).toBe('checkbox')
    const link = w.find('.zy-slot-lead-form__consent a')
    expect(link.attributes('href')).toBe('/legal/privacy')
    expect(link.text()).toBe('Kebijakan Privasi')
    // label is wired to the input
    const input = w.find('input[name="name"]')
    expect(w.find(`label[for="${input.attributes('id')}"]`).text()).toContain('Nama lengkap')
  })

  it('renders a hidden honeypot that is off-screen, not display:none', () => {
    const { w } = mountSlot()
    const hp = w.find('input[name="website"]')
    expect(hp.attributes('tabindex')).toBe('-1')
    expect(hp.attributes('autocomplete')).toBe('off')
    expect(hp.attributes('style') ?? '').not.toContain('display')
    expect(hp.element.closest('.zy-slot-lead-form__hp')).not.toBeNull()
  })

  it('shows a built-in consent checkbox when the form has no consent field', async () => {
    const form = makeForm({
      fields: makeForm().fields.filter((f) => f.key !== 'consent'),
    })
    const { w } = mountSlot(form)
    expect(w.find('.zy-slot-lead-form__consent a').attributes('href')).toBe('/legal/privacy')
    await w.find('input[name="name"]').setValue('Budi')
    await w.find('input[name="email"]').setValue('budi@acme.co')
    await w.find('input[name="phone"]').setValue('08123456789')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(submitPublicForm).not.toHaveBeenCalled()
    expect(w.text()).toContain('Mohon setujui pemrosesan data untuk melanjutkan.')

    submitPublicForm.mockResolvedValue(undefined)
    await w.find('input[name="consent"]').setValue(true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(submitPublicForm).toHaveBeenCalledTimes(1)
    expect(submitPublicForm.mock.calls[0]![1].consent).toBe(true)
  })

  it('prefills interest from page context', async () => {
    const { w, interest } = mountSlot()
    interest.value = 'Business · Bulanan'
    await flushPromises()
    expect((w.find('input[name="interest"]').element as HTMLInputElement).value).toBe(
      'Business · Bulanan',
    )
  })

  it('shows validation errors and does not submit', async () => {
    const { w } = mountSlot()
    await w.find('input[name="email"]').setValue('bukan-email')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(submitPublicForm).not.toHaveBeenCalled()
    const alerts = w.findAll('[role="alert"]')
    expect(alerts.length).toBeGreaterThan(0)
    expect(w.text()).toContain('Wajib diisi.')
    expect(w.text()).toContain('Format email tidak valid.')
    const name = w.find('input[name="name"]')
    expect(name.attributes('aria-invalid')).toBe('true')
    expect(name.attributes('aria-describedby')).toBeTruthy()
    expect(document.activeElement).toBe(name.element)
  })

  it('submits once even when the button is clicked twice', async () => {
    let resolve!: () => void
    submitPublicForm.mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await w.find('form').trigger('submit')
    const btn = w.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toBe('Mengirim…')
    expect(w.find('form').attributes('aria-busy')).toBe('true')
    resolve()
    await flushPromises()
    expect(submitPublicForm).toHaveBeenCalledTimes(1)
  })

  it('reuses the idempotency key when retrying after a network error', async () => {
    submitPublicForm
      .mockRejectedValueOnce(new SubmitFormError(0, ''))
      .mockResolvedValueOnce(undefined)
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Pesan belum terkirim. Coba lagi sebentar lagi.')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(submitPublicForm).toHaveBeenCalledTimes(2)
    const k1 = submitPublicForm.mock.calls[0]![2]
    expect(k1).toMatch(/^[0-9a-f-]{36}$/)
    expect(submitPublicForm.mock.calls[1]![2]).toBe(k1)
  })

  it('uses a new idempotency key when the input changed after an error', async () => {
    submitPublicForm
      .mockRejectedValueOnce(new SubmitFormError(500, 'X'))
      .mockResolvedValueOnce(undefined)
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    await w.find('input[name="name"]').setValue('Budi S')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(submitPublicForm.mock.calls[1]![2]).not.toBe(submitPublicForm.mock.calls[0]![2])
  })

  it('shows success message inline', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    const ok = w.find('.zy-slot-lead-form__success')
    expect(ok.text()).toContain('Terima kasih!')
    expect(ok.classes()).toContain('zy-anim-fade-up')
    expect(ok.classes()).toContain('is-in')
    expect(w.find('form').exists()).toBe(false)
  })

  it('redirects through the router for same-origin paths', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot(makeForm({ redirectUrl: '/terima-kasih', afterSubmit: 'redirect' }))
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/terima-kasih')
  })

  it('redirects to external http(s) urls via location.assign', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    try {
      const { w } = mountSlot(
        makeForm({ redirectUrl: 'https://example.com/x', afterSubmit: 'redirect' }),
      )
      await fillValid(w)
      await w.find('form').trigger('submit')
      await flushPromises()
      expect(assign).toHaveBeenCalledWith('https://example.com/x')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'mailto:a@b.id'])(
    'ignores unsafe redirect %s and still shows success',
    async (redirectUrl) => {
      submitPublicForm.mockResolvedValue(undefined)
      const assign = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign })
      try {
        const { w } = mountSlot(makeForm({ redirectUrl, afterSubmit: 'redirect' }))
        await fillValid(w)
        await w.find('form').trigger('submit')
        await flushPromises()
        expect(assign).not.toHaveBeenCalled()
        expect(push).not.toHaveBeenCalled()
        expect(w.find('.zy-slot-lead-form__success').text()).toContain('Terima kasih!')
      } finally {
        vi.unstubAllGlobals()
      }
    },
  )

  it('shows the 429 message and keeps values', async () => {
    submitPublicForm.mockRejectedValue(new SubmitFormError(429, 'RATE_LIMITED'))
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe(
      'Terlalu banyak percobaan, coba lagi sebentar lagi.',
    )
    expect((w.find('input[name="name"]').element as HTMLInputElement).value).toBe('Budi')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('shows a generic error (not success) when the form is gone (404)', async () => {
    submitPublicForm.mockRejectedValue(new SubmitFormError(404, 'LANDING_FORM_NOT_FOUND'))
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Pesan belum terkirim. Coba lagi sebentar lagi.')
    expect(w.find('.zy-slot-lead-form__success').exists()).toBe(false)
  })

  it('sends page_url and utm from location', async () => {
    window.history.replaceState({}, '', '/harga?utm_source=ig&utm_campaign=okt&foo=1')
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot()
    await fillValid(w)
    await w.find('input[name="website"]').setValue('')
    await w.find('form').trigger('submit')
    await flushPromises()
    const [formId, body] = submitPublicForm.mock.calls[0]!
    expect(formId).toBe(FORM_ID)
    expect(body.fields.page_url).toBe(window.location.href)
    expect(body.fields.name).toBe('Budi')
    expect(body.consent).toBe(true)
    expect(body.website).toBe('')
    expect(body.context.utm_source).toBe('ig')
    expect(body.context.utm_campaign).toBe('okt')
    expect(body.context.utm_medium).toBeUndefined()
  })
})

describe('LeadFormSlot — setelah kirim & field wajib dari server', () => {
  const waForm = (over: Partial<GrapesChromeForm> = {}) =>
    makeForm({ afterSubmit: 'whatsapp', whatsappNumber: '6281234567890', ...over })

  async function submit(w: ReturnType<typeof mountSlot>['w']) {
    await w.find('form').trigger('submit')
    await flushPromises()
  }

  it('shows the WhatsApp button with a prefilled message after success', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot(waForm({ whatsappMessage: 'Halo, saya {nama}. Soal {minat}.' }))
    await fillValid(w)
    await w.find('input[name="interest"]').setValue('Paket 20 Mbps')
    await submit(w)
    const link = w.get('a.zy-slot-lead-form__wa')
    expect(link.text()).toBe('Lanjut chat di WhatsApp')
    expect(link.attributes('href')).toBe(
      'https://wa.me/6281234567890?text=' +
        encodeURIComponent('Halo, saya Budi. Soal Paket 20 Mbps.'),
    )
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(w.get('.zy-slot-lead-form__success').text()).toContain('Terima kasih!')
    expect(push).not.toHaveBeenCalled()
  })

  it('uses the default template and "layanan Anda" when interest is empty', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot(waForm())
    await fillValid(w)
    await submit(w)
    expect(w.get('a.zy-slot-lead-form__wa').attributes('href')).toBe(
      'https://wa.me/6281234567890?text=' +
        encodeURIComponent('Halo, saya Budi. Saya tertarik dengan layanan Anda.'),
    )
  })

  it('falls back to the success message when whatsapp number is empty', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot(waForm({ whatsappNumber: '' }))
    await fillValid(w)
    await submit(w)
    expect(w.find('a.zy-slot-lead-form__wa').exists()).toBe(false)
    expect(w.get('.zy-slot-lead-form__success').text()).toContain('Terima kasih!')
  })

  it('redirects only when afterSubmit is redirect', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountSlot(makeForm({ afterSubmit: 'message', redirectUrl: '/terima-kasih' }))
    await fillValid(w)
    await submit(w)
    expect(push).not.toHaveBeenCalled()
    expect(w.find('a.zy-slot-lead-form__wa').exists()).toBe(false)
  })

  it('maps missing_fields to per-field errors', async () => {
    submitPublicForm.mockRejectedValue(
      new SubmitFormError(422, 'VALIDATION_ERROR', 'x', ['email', 'phone']),
    )
    const { w } = mountSlot()
    await fillValid(w)
    await submit(w)
    expect(w.text()).toContain('Wajib diisi.')
    expect(w.find('#' + w.get('input[name="email"]').attributes('aria-describedby')).text()).toBe(
      'Wajib diisi.',
    )
    expect(w.find('input[name="email"]').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(w.get('input[name="email"]').element)
    expect(w.find('.zy-slot-lead-form__alert').exists()).toBe(false)
    expect((w.get('input[name="name"]').element as HTMLInputElement).value).toBe('Budi')
  })

  it('stale page message when missing field is not on screen', async () => {
    submitPublicForm.mockRejectedValue(
      new SubmitFormError(422, 'VALIDATION_ERROR', 'x', ['company']),
    )
    const { w } = mountSlot()
    await fillValid(w)
    await submit(w)
    expect(w.get('.zy-slot-lead-form__alert').text()).toBe(
      'Form diperbarui. Muat ulang halaman untuk melanjutkan.',
    )
    expect((w.get('input[name="name"]').element as HTMLInputElement).value).toBe('Budi')
  })

  it('sends interest from page context even when the interest field is hidden', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const form = makeForm()
    form.fields = form.fields.map((f) => (f.key === 'interest' ? { ...f, type: 'hidden' } : f))
    const { w, interest } = mountSlot(form)
    interest.value = 'Small Business · Tahunan'
    await flushPromises()
    expect(w.find('input[name="interest"]').exists()).toBe(false)
    await fillValid(w)
    await submit(w)
    const body = submitPublicForm.mock.calls[0]![1] as { fields: Record<string, unknown> }
    expect(body.fields.interest).toBe('Small Business · Tahunan')
  })

  it('does not send an interest key when the form has no interest field', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const form = makeForm()
    form.fields = form.fields.filter((f) => f.key !== 'interest')
    const { w, interest } = mountSlot(form)
    interest.value = 'X'
    await fillValid(w)
    await submit(w)
    const body = submitPublicForm.mock.calls[0]![1] as { fields: Record<string, unknown> }
    expect('interest' in body.fields).toBe(false)
  })
})

describe('LeadFormSlot — mode popup', () => {
  const POPUP_CONFIG = { form_id: FORM_ID, display: 'popup' }
  let overlay: HTMLElement
  let registered: Array<() => void>
  let unregister: ReturnType<typeof vi.fn>

  function mountPopupSlot(
    form: GrapesChromeForm | null = makeForm(),
    config: unknown = POPUP_CONFIG,
  ) {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const ctx = {
      orgType: computed(() => 'platform'),
      interest: ref(''),
      scrollToId: vi.fn(),
      registerLeadPopup: vi.fn((open: () => void) => {
        registered.push(open)
        return unregister
      }),
      openLeadPopup: vi.fn(() => false),
      overlayTarget: ref<HTMLElement | null>(overlay),
    }
    const w = mount(LeadFormSlot, {
      attachTo: document.body,
      props: {
        host,
        chrome: { forms: form ? [form] : [] } as GrapesChrome,
        dataset: { zyadConfig: JSON.stringify(config) },
      },
      global: { provide: { [LANDING_PAGE_CONTEXT as symbol]: ctx } },
    })
    return { w, ctx, host }
  }

  const launcher = () => overlay.querySelector<HTMLButtonElement>('.zy-lf-popup__launcher')
  const dialog = () => overlay.querySelector<HTMLElement>('[role="dialog"]')
  const q = <T extends Element>(sel: string) => overlay.querySelector<T>(sel)!
  async function fillPopup() {
    for (const [name, value] of [
      ['name', 'Budi'],
      ['email', 'budi@acme.co'],
      ['phone', '0812 3456 7890'],
    ] as const) {
      const input = q<HTMLInputElement>(`input[name="${name}"]`)
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const consent = q<HTMLInputElement>('input[name="consent"]')
    consent.checked = true
    consent.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
  }

  beforeEach(() => {
    overlay = document.createElement('div')
    document.body.appendChild(overlay)
    registered = []
    unregister = vi.fn()
  })

  it('renders a launcher in the overlay instead of the inline form', () => {
    const { w, host } = mountPopupSlot()
    expect(launcher()).not.toBeNull()
    expect(w.find('form').exists()).toBe(false)
    expect(w.find('.zy-slot-lead-form').exists()).toBe(false)
    expect(host.classList.contains('zy-slot-lead-form-host--popup')).toBe(true)
  })

  it('renders nothing when the form is missing or inactive', () => {
    mountPopupSlot(null)
    expect(launcher()).toBeNull()
  })

  it('keeps the inline form for the template preview form', () => {
    const ctx = { orgType: computed(() => 'platform'), interest: ref(''), scrollToId: vi.fn() }
    const w = mount(LeadFormSlot, {
      attachTo: document.body,
      props: {
        host: document.createElement('div'),
        chrome: { forms: [], previewForm: makeForm({ id: 'preview' }) } as GrapesChrome,
        dataset: { zyadConfig: JSON.stringify({ display: 'popup' }) },
      },
      global: { provide: { [LANDING_PAGE_CONTEXT as symbol]: ctx } },
    })
    expect(w.find('form').exists()).toBe(true)
  })

  it('registers its opener with the page context; the opener opens the dialog; unregisters on unmount', async () => {
    const { w } = mountPopupSlot()
    expect(registered).toHaveLength(1)
    expect(dialog()).toBeNull()
    registered[0]!()
    await flushPromises()
    expect(dialog()).not.toBeNull()
    w.unmount()
    expect(unregister).toHaveBeenCalled()
  })

  it('does not register when the display is inline', () => {
    const { ctx } = mountPopupSlot(makeForm(), { form_id: FORM_ID })
    expect(ctx.registerLeadPopup).not.toHaveBeenCalled()
    expect(launcher()).toBeNull()
  })

  it('submits from the dialog and keeps the success state when reopened', async () => {
    submitPublicForm.mockResolvedValue(undefined)
    const { w } = mountPopupSlot()
    launcher()!.click()
    await flushPromises()
    await fillPopup()
    q<HTMLFormElement>('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(submitPublicForm).toHaveBeenCalledTimes(1)
    expect(q('.zy-slot-lead-form__success').textContent).toContain('Terima kasih!')
    ;(w.findComponent({ name: 'LeadFormPopup' }).vm as unknown as { close: () => void }).close()
    await flushPromises()
    expect(dialog()).toBeNull()
    launcher()!.click()
    await flushPromises()
    expect(q('.zy-slot-lead-form__success').textContent).toContain('Terima kasih!')
    expect(overlay.querySelector('form')).toBeNull()
    expect(submitPublicForm).toHaveBeenCalledTimes(1)
  })

  it('finishes an in-flight submit after the dialog is closed', async () => {
    let resolve!: () => void
    submitPublicForm.mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { w } = mountPopupSlot()
    launcher()!.click()
    await flushPromises()
    await fillPopup()
    q<HTMLFormElement>('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()
    ;(w.findComponent({ name: 'LeadFormPopup' }).vm as unknown as { close: () => void }).close()
    await flushPromises()
    resolve()
    await flushPromises()
    launcher()!.click()
    await flushPromises()
    expect(q('.zy-slot-lead-form__success').textContent).toContain('Terima kasih!')
    expect(submitPublicForm).toHaveBeenCalledTimes(1)
  })

  it('applies the popup texts from the configuration', () => {
    mountPopupSlot(makeForm(), {
      ...POPUP_CONFIG,
      popup: { label: 'Tanya kami', icon: 'whatsapp', position: 'left', title: 'Ada pertanyaan?' },
    })
    expect(launcher()!.getAttribute('aria-label')).toBe('Tanya kami')
    expect(q('.zy-lf-popup').classList.contains('zy-lf-popup--left')).toBe(true)
  })
})
