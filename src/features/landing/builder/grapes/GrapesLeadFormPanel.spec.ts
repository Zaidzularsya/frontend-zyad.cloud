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
import { STANDARD_LEAD_FORM } from './lead-form-presets'
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

  it('Buat form standar: createForm -> replaceFormFields(preset) -> addAttributes form_id baru', async () => {
    getForms.mockResolvedValue({ data: [form({ id: 'old' })] })
    createForm.mockResolvedValue({ data: form({ id: 'new', key: 'konsultasi-2' }) })
    replaceFormFields.mockResolvedValue({ data: STANDARD_LEAD_FORM.fields })
    const { wrapper, addAttributes } = await setup()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Buat form standar')!
      .trigger('click')
    await flushPromises()

    expect(createForm).toHaveBeenCalledWith('p1', {
      ...STANDARD_LEAD_FORM.form,
      key: 'konsultasi-2',
    })
    expect(replaceFormFields).toHaveBeenCalledWith('p1', 'new', {
      fields: STANDARD_LEAD_FORM.fields,
    })
    expect(createForm.mock.invocationCallOrder[0]!).toBeLessThan(
      replaceFormFields.mock.invocationCallOrder[0]!,
    )
    expect(JSON.parse(addAttributes.mock.calls.at(-1)![0]['data-zyad-config'])).toEqual({
      form_id: 'new',
    })
    expect(wrapper.emitted('forms-change')!.at(-1)![0]).toHaveLength(2)
  })

  it('gagal mengisi field -> form yang baru dibuat dihapus dan pesan error tampil', async () => {
    createForm.mockResolvedValue({ data: form({ id: 'new' }) })
    replaceFormFields.mockRejectedValue(new Error('boom'))
    deleteForm.mockResolvedValue({})
    const { wrapper, addAttributes } = await setup()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Buat form standar')!
      .trigger('click')
    await flushPromises()
    expect(deleteForm).toHaveBeenCalledWith('p1', 'new')
    expect(addAttributes).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Gagal membuat form standar')
  })

  it('memilih form menulis form_id ke atribut', async () => {
    const { wrapper, addAttributes } = await setup()
    await wrapper.get('select[aria-label="Form"]').setValue('f1')
    expect(JSON.parse(addAttributes.mock.calls.at(-1)![0]['data-zyad-config'])).toEqual({
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

  it('judul tombol, pesan sukses dan redirect disimpan lewat updateForm', async () => {
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    await wrapper.get('input[aria-label="Judul tombol"]').setValue('Kirim sekarang')
    await wrapper.get('input[aria-label="Judul tombol"]').trigger('change')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', { submit_label: 'Kirim sekarang' })

    await wrapper.get('textarea[aria-label="Pesan sukses"]').setValue('Makasih')
    await wrapper.get('textarea[aria-label="Pesan sukses"]').trigger('change')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', { success_message: 'Makasih' })

    await wrapper.get('input[aria-label="URL redirect"]').setValue('/terima-kasih')
    await wrapper.get('input[aria-label="URL redirect"]').trigger('change')
    expect(updateForm).toHaveBeenLastCalledWith('p1', 'f1', { redirect_url: '/terima-kasih' })
  })

  it('judul tombol kosong dan URL redirect tidak aman ditolak tanpa updateForm', async () => {
    const { wrapper } = await setup({ 'data-zyad-config': '{"form_id":"f1"}' })
    await wrapper.get('input[aria-label="Judul tombol"]').setValue('  ')
    await wrapper.get('input[aria-label="Judul tombol"]').trigger('change')
    expect(wrapper.text()).toContain('Judul tombol wajib diisi.')

    for (const bad of ['javascript:alert(1)', '//evil.test', 'mailto:a@b.id']) {
      await wrapper.get('input[aria-label="URL redirect"]').setValue(bad)
      await wrapper.get('input[aria-label="URL redirect"]').trigger('change')
    }
    expect(wrapper.text()).toContain('URL tidak valid')
    expect(updateForm).not.toHaveBeenCalled()
  })
})
