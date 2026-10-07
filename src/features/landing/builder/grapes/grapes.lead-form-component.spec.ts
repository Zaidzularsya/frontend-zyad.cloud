import { describe, expect, it, vi } from 'vitest'

import type { LandingFormWithFields } from '../../shared/types/landing.types'
import {
  buildLeadFormPreview,
  LEAD_FORM_BLOCK_ID,
  LEAD_FORM_TYPE,
  parseLeadFormId,
  registerLeadForm,
} from './grapes.lead-form-component'

const form = {
  id: 'f1',
  submit_label: 'Kirim <sekarang>',
  fields: [
    { key: 'email', type: 'email', label: 'Email kerja', required: true, sort_order: 2 },
    { key: 'name', type: 'text', label: 'Nama lengkap', required: true, sort_order: 1 },
    { key: 'utm', type: 'hidden', label: 'Rahasia', required: false, sort_order: 3 },
    { key: 'consent', type: 'checkbox', label: 'Saya setuju', required: true, sort_order: 4 },
  ],
} as unknown as LandingFormWithFields

describe('buildLeadFormPreview', () => {
  it('tanpa form menampilkan petunjuk panel', () => {
    expect(buildLeadFormPreview(undefined)).toContain('Pilih atau buat form di panel kanan')
  })

  it('merender label berurutan, melewati hidden, dan tombol submit_label (di-escape)', () => {
    const html = buildLeadFormPreview(form)
    expect(html.indexOf('Nama lengkap')).toBeLessThan(html.indexOf('Email kerja'))
    expect(html).toContain('Saya setuju')
    expect(html).not.toContain('Rahasia')
    expect(html).toContain('Kirim &lt;sekarang&gt;')
  })
})

describe('parseLeadFormId', () => {
  it('membaca form_id dan toleran terhadap JSON rusak', () => {
    expect(parseLeadFormId('{"form_id":"f1"}')).toBe('f1')
    expect(parseLeadFormId('{')).toBe('')
    expect(parseLeadFormId(undefined)).toBe('')
    expect(parseLeadFormId('{"form_id":5}')).toBe('')
  })
})

describe('registerLeadForm', () => {
  it('mendaftarkan tipe sebagai sentinel tanpa anak', () => {
    const addType = vi.fn()
    registerLeadForm({ Components: { addType } } as never, () => [form])
    expect(LEAD_FORM_BLOCK_ID).toBe('zy-lead-form')
    expect(addType).toHaveBeenCalledTimes(1)
    const [type, def] = addType.mock.calls[0]!
    expect(type).toBe(LEAD_FORM_TYPE)
    const d = def.model.defaults
    expect(d.attributes['data-zyad-slot']).toBe('lead-form')
    expect(d.tagName).toBe('div')
    expect(d.droppable).toBe(false)
    expect(d.components).toBeUndefined()
    const el = {
      tagName: 'DIV',
      getAttribute: (k: string) => (k === 'data-zyad-slot' ? 'lead-form' : null),
    }
    expect(def.isComponent(el)).toEqual({ type: LEAD_FORM_TYPE })
    expect(def.isComponent({ tagName: 'DIV', getAttribute: () => 'pricing-plans' })).toBeUndefined()
  })

  it('pratinjau kanvas memakai form sesuai form_id; tanpa form_id menampilkan petunjuk', () => {
    const addType = vi.fn()
    registerLeadForm({ Components: { addType } } as never, () => [form])
    const { view } = addType.mock.calls[0]![1]
    const mk = (cfg: string) => ({
      el: { innerHTML: '', style: {} as Record<string, string> },
      model: { getAttributes: () => ({ 'data-zyad-config': cfg }) },
    })
    const withForm = mk('{"form_id":"f1"}')
    view.onRender.call(withForm)
    expect(withForm.el.innerHTML).toContain('Nama lengkap')
    const empty = mk('{}')
    view.onRender.call(empty)
    expect(empty.el.innerHTML).toContain('Pilih atau buat form di panel kanan')
  })
})
