import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LandingFormWithFields } from '../../shared/types/landing.types'
import {
  ensureLeadFormCanvasCss,
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

  it('model init: perubahan atribut merender ulang view', () => {
    const addType = vi.fn()
    registerLeadForm({ Components: { addType } } as never, () => [form])
    const { model } = addType.mock.calls[0]![1]
    const render = vi.fn()
    let handler: () => void = () => undefined
    const ctx = {
      view: { render },
      on: (_event: string, fn: () => void) => {
        handler = fn
      },
    }
    model.init.call(ctx)
    handler()
    expect(render).toHaveBeenCalledTimes(1)
  })
})

describe('canvas view', () => {
  function setup(forms = [form]) {
    const addType = vi.fn()
    registerLeadForm({ Components: { addType } } as never, () => forms)
    const { view } = addType.mock.calls[0]![1]
    const mk = (cfg: string) => {
      const el = document.createElement('div')
      document.body.appendChild(el)
      return {
        el,
        model: { getAttributes: () => ({ 'data-zyad-config': cfg }) },
        leadFormApp: null as { unmount: () => void } | null,
      }
    }
    return { view, mk }
  }

  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('mounts LeadFormView into the component element with the configured style class', () => {
    const { view, mk } = setup()
    const ctx = mk('{"form_id":"f1","style":"glass"}')
    view.onRender.call(ctx)
    const root = ctx.el.querySelector('section.zy-slot-lead-form')!
    expect(root.classList.contains('zy-slot-lead-form--glass')).toBe(true)
    expect(ctx.el.textContent).toContain('Nama lengkap')
    expect(ctx.el.textContent).not.toContain('Rahasia')
    expect(ctx.el.querySelector('button[type="submit"]')!.hasAttribute('disabled')).toBe(true)
  })

  it('legacy config {"form_id":...} renders the kartu style', () => {
    const { view, mk } = setup()
    const ctx = mk('{"form_id":"f1"}')
    view.onRender.call(ctx)
    expect(ctx.el.querySelector('section')!.classList.contains('zy-slot-lead-form--kartu')).toBe(
      true,
    )
  })

  it('canvas shows the popup mode label above the form', () => {
    const { view, mk } = setup()
    const ctx = mk('{"form_id":"f1","display":"popup"}')
    view.onRender.call(ctx)
    const label = ctx.el.querySelector('[data-zy-popup-label]')!
    expect(label.textContent).toBe('Mode popup · tampil sebagai tombol di pojok')
    expect(ctx.el.firstElementChild).toBe(label)
    expect(ctx.el.querySelector('section.zy-slot-lead-form')).not.toBeNull()
    const inline = mk('{"form_id":"f1"}')
    view.onRender.call(inline)
    expect(inline.el.querySelector('[data-zy-popup-label]')).toBeNull()
  })

  it('without a form shows the panel hint and no app', () => {
    const { view, mk } = setup()
    const ctx = mk('{}')
    view.onRender.call(ctx)
    expect(ctx.el.innerHTML).toContain('Pilih atau buat form di panel kanan')
    expect(ctx.leadFormApp).toBeNull()
  })

  it('re-renders when the config changes and unmounts the previous app', () => {
    const { view, mk } = setup()
    const ctx = mk('{"form_id":"f1","style":"kartu"}')
    view.onRender.call(ctx)
    const first = ctx.leadFormApp!
    const unmount = vi.spyOn(first, 'unmount')
    ctx.model.getAttributes = () => ({ 'data-zyad-config': '{"form_id":"f1","style":"minimal"}' })
    view.onRender.call(ctx)
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(ctx.el.querySelectorAll('section.zy-slot-lead-form')).toHaveLength(1)
    expect(ctx.el.querySelector('section')!.classList.contains('zy-slot-lead-form--minimal')).toBe(
      true,
    )
  })

  it('unmounts the app on removal', () => {
    const { view, mk } = setup()
    const ctx = mk('{"form_id":"f1"}')
    view.onRender.call(ctx)
    const unmount = vi.spyOn(ctx.leadFormApp!, 'unmount')
    view.removed.call(ctx)
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(ctx.leadFormApp).toBeNull()
    expect(ctx.el.querySelector('section')).toBeNull()
  })

  it('injects the lead form css into the canvas document once', () => {
    const { view, mk } = setup()
    view.onRender.call(mk('{"form_id":"f1"}'))
    view.onRender.call(mk('{"form_id":"f1"}'))
    expect(document.head.querySelectorAll('#zy-lead-form-css')).toHaveLength(1)
    ensureLeadFormCanvasCss(document)
    expect(document.head.querySelectorAll('#zy-lead-form-css')).toHaveLength(1)
    expect(document.getElementById('zy-lead-form-css')!.textContent).toContain('.zy-slot-lead-form')
  })
})
