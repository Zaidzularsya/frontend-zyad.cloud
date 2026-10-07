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
    const { w } = mountSlot(makeForm({ redirectUrl: '/terima-kasih' }))
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
      const { w } = mountSlot(makeForm({ redirectUrl: 'https://example.com/x' }))
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
        const { w } = mountSlot(makeForm({ redirectUrl }))
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
