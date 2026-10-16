import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getForms = vi.fn()
const createForm = vi.fn()
const replaceFormFields = vi.fn()
const updateForm = vi.fn()
const deleteForm = vi.fn()
vi.mock('../../shared/api/landing.api', () => ({
  landingApi: {
    getForms: (...a: unknown[]) => getForms(...a),
    createForm: (...a: unknown[]) => createForm(...a),
    replaceFormFields: (...a: unknown[]) => replaceFormFields(...a),
    updateForm: (...a: unknown[]) => updateForm(...a),
    deleteForm: (...a: unknown[]) => deleteForm(...a),
  },
}))
const members = vi.fn()
vi.mock('@/features/crm/leads/api/leads.api', () => ({
  leadsApi: { members: (...a: unknown[]) => members(...a) },
}))

import { useTenantStore } from '@/stores/tenant.store'
import { LEAD_FORM_BASE, presetFields } from './lead-form-presets'
import GrapesLeadFormPanel from './GrapesLeadFormPanel.vue'

function form(over: Record<string, unknown> = {}) {
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
    fields: [],
    ...over,
  }
}

function useOrg(organizationType: string) {
  useTenantStore().hydrate([
    { id: 't1', name: 'Org', slug: 'org', plan: 'trial', status: 'active', organizationType },
  ])
}

async function setup(attrs: Record<string, string> = {}) {
  const addAttributes = vi.fn()
  const component = { getAttributes: () => attrs, addAttributes }
  const wrapper = mount(GrapesLeadFormPanel, { props: { component, pageId: 'p1' } })
  await flushPromises()
  return { wrapper, addAttributes }
}

describe('GrapesLeadFormPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    useOrg('customer')
    getForms.mockResolvedValue({ data: [form()] })
    members.mockResolvedValue([{ user_id: 'u1', name: 'Budi', email: 'b@x.id' }])
    updateForm.mockImplementation((_p: string, _id: string, body: object) =>
      Promise.resolve({ data: { ...form(), ...body } }),
    )
  })

  const clickCreate = async (wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) => {
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Buat form baru')!
      .trigger('click')
    await flushPromises()
  }

  it('Buat form baru memakai preset Ringkas secara default: createForm -> replaceFormFields -> form_id baru', async () => {
    getForms.mockResolvedValue({ data: [form({ id: 'old' })] })
    createForm.mockResolvedValue({ data: form({ id: 'new', key: 'konsultasi-2' }) })
    replaceFormFields.mockResolvedValue({ data: presetFields('ringkas') })
    const { wrapper, addAttributes } = await setup()
    expect(
      (wrapper.get('select[aria-label="Preset form baru"]').element as HTMLSelectElement).value,
    ).toBe('ringkas')

    await clickCreate(wrapper)

    expect(createForm).toHaveBeenCalledWith('p1', { ...LEAD_FORM_BASE, key: 'konsultasi-2' })
    expect(replaceFormFields).toHaveBeenCalledWith('p1', 'new', { fields: presetFields('ringkas') })
    expect(createForm.mock.invocationCallOrder[0]!).toBeLessThan(
      replaceFormFields.mock.invocationCallOrder[0]!,
    )
    expect(JSON.parse(addAttributes.mock.calls.at(-1)![0]['data-zyad-config'])).toMatchObject({
      form_id: 'new',
    })
    expect(wrapper.emitted('forms-change')!.at(-1)![0]).toHaveLength(2)
  })

  it('Buat form baru memakai preset yang dipilih', async () => {
    createForm.mockResolvedValue({ data: form({ id: 'new' }) })
    replaceFormFields.mockResolvedValue({ data: presetFields('lengkap') })
    const { wrapper } = await setup()
    await wrapper.get('select[aria-label="Preset form baru"]').setValue('lengkap')
    await clickCreate(wrapper)
    expect(replaceFormFields).toHaveBeenCalledWith('p1', 'new', { fields: presetFields('lengkap') })
  })

  it('gagal mengisi field -> form yang baru dibuat dihapus dan pesan error tampil', async () => {
    createForm.mockResolvedValue({ data: form({ id: 'new' }) })
    replaceFormFields.mockRejectedValue(new Error('boom'))
    deleteForm.mockResolvedValue({})
    const { wrapper, addAttributes } = await setup()
    await clickCreate(wrapper)
    expect(deleteForm).toHaveBeenCalledWith('p1', 'new')
    expect(addAttributes).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Gagal membuat form')
  })

  it('withFormId keeps presentation: mengganti form tidak menghapus gaya', async () => {
    getForms.mockResolvedValue({ data: [form(), form({ id: 'f2', key: 'k2' })] })
    const { wrapper, addAttributes } = await setup({
      'data-zyad-config': '{"form_id":"f1","style":"glass","accent":"#112233"}',
    })
    await wrapper.get('select[aria-label="Form"]').setValue('f2')
    expect(JSON.parse(addAttributes.mock.calls.at(-1)![0]['data-zyad-config'])).toMatchObject({
      form_id: 'f2',
      style: 'glass',
      accent: '#112233',
    })
  })

  it('memilih form menulis form_id ke atribut', async () => {
    const { wrapper, addAttributes } = await setup()
    await wrapper.get('select[aria-label="Form"]').setValue('f1')
    expect(JSON.parse(addAttributes.mock.calls.at(-1)![0]['data-zyad-config'])).toMatchObject({
      form_id: 'f1',
    })
  })

  it('toggle CRM memanggil updateForm(pageId, formId, { create_crm_lead })', async () => {
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    await wrapper.get('input[aria-label="Buat lead di CRM"]').setValue(false)
    expect(updateForm).toHaveBeenCalledWith('p1', 'f1', { create_crm_lead: false })
  })

  it('PIC lead dipilih dari members() dan disimpan lewat updateForm', async () => {
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    await wrapper.get('select[aria-label="PIC lead"]').setValue('u1')
    expect(updateForm).toHaveBeenCalledWith('p1', 'f1', { lead_owner_user_id: 'u1' })
  })

  it('members() gagal pada org non-platform: toggle nonaktif + teks fitur', async () => {
    members.mockRejectedValue(new Error('403'))
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    expect(wrapper.get('input[aria-label="Buat lead di CRM"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Butuh fitur Lead Form CRM di paket Anda')
  })

  it('members() gagal pada org platform: toggle tetap aktif', async () => {
    useOrg('platform')
    members.mockRejectedValue(new Error('403'))
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    expect(
      wrapper.get('input[aria-label="Buat lead di CRM"]').attributes('disabled'),
    ).toBeUndefined()
    expect(wrapper.text()).not.toContain('Butuh fitur Lead Form CRM')
  })

  it('judul tombol, pesan sukses dan aksi setelah kirim disimpan lewat updateForm', async () => {
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    await wrapper.get('input[aria-label="Judul tombol"]').setValue('Kirim sekarang')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', { submit_label: 'Kirim sekarang' })

    await wrapper.get('textarea[aria-label="Pesan sukses"]').setValue('Makasih')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', { success_message: 'Makasih' })

    await wrapper.get('input[type="radio"][value="redirect"]').setValue(true)
    await wrapper.get('input[aria-label="URL redirect"]').setValue('/terima-kasih')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', {
      redirect_url: '/terima-kasih',
      after_submit: 'redirect',
    })
  })

  it('field yang tersimpan memperbarui daftar form dan memberi tahu kanvas', async () => {
    replaceFormFields.mockImplementation((_p: string, _f: string, body: { fields: unknown[] }) =>
      Promise.resolve({ data: body.fields }),
    )
    getForms.mockResolvedValue({ data: [form({ fields: presetFields('ringkas') })] })
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    vi.useFakeTimers()
    try {
      await wrapper
        .get('[data-field="company"] [role="radiogroup"]')
        .findAll('[role="radio"]')
        .find((r) => r.text() === 'Tampil')!
        .trigger('click')
      vi.advanceTimersByTime(600)
    } finally {
      vi.useRealTimers()
    }
    await flushPromises()
    const lastForms = wrapper.emitted('forms-change')!.at(-1)![0] as Array<{
      fields: Array<{ key: string; type: string }>
    }>
    expect(lastForms[0]!.fields.find((f) => f.key === 'company')!.type).toBe('text')
  })
})
