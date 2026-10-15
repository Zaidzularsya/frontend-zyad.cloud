import type { Editor } from 'grapesjs'

import type { LandingFormWithFields } from '../../shared/types/landing.types'

/**
 * `zyad-lead-form` — blok "Form Konsultasi". Tersedia untuk semua organisasi.
 *
 * Di kanvas: pratinjau inline statis (label + input dari field form, tombol
 * `submit_label`). Saat export hanya sentinel
 * `<div data-zyad-slot="lead-form" data-zyad-config='{"form_id":"…"}'>`;
 * field diisi ulang oleh LeadFormSlot.vue dari data form di server.
 */

export const LEAD_FORM_TYPE = 'zyad-lead-form'
export const LEAD_FORM_BLOCK_ID = 'zy-lead-form'
export const LEAD_FORM_EMPTY_TEXT = 'Pilih atau buat form di panel kanan'

const FONT = "font-family:'Inter','Segoe UI',system-ui,sans-serif"
const INPUT_STYLE =
  'display:block;box-sizing:border-box;width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#94a3b8;font-size:14px;min-height:40px'

function esc(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/** Baca form_id dari atribut data-zyad-config; '' bila tidak valid. */
export function parseLeadFormId(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as { form_id?: unknown }
    return typeof parsed.form_id === 'string' ? parsed.form_id : ''
  } catch {
    return ''
  }
}

/** Pratinjau kanvas: label + kontrol statis per field, lalu tombol submit. */
export function buildLeadFormPreview(form: LandingFormWithFields | undefined): string {
  if (!form) {
    return `<div style="padding:40px 24px;text-align:center;background:#f8fafc;${FONT}"><span style="color:#94a3b8;font-size:13px;font-style:italic">${LEAD_FORM_EMPTY_TEXT}</span></div>`
  }
  const rows = [...form.fields]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((f) => f.type !== 'hidden')
    .map((f) => {
      const star = f.required ? '<span style="color:#dc2626"> *</span>' : ''
      if (f.type === 'checkbox') {
        return `<div style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#475569"><span style="flex:none;width:16px;height:16px;margin-top:2px;border:1px solid #94a3b8;border-radius:4px;background:#fff"></span><span>${esc(f.label)}${star}</span></div>`
      }
      const label = `<span style="display:block;margin:0 0 6px;font-size:13px;font-weight:600;color:#334155">${esc(f.label)}${star}</span>`
      const control =
        f.type === 'textarea'
          ? `<span style="${INPUT_STYLE};min-height:84px">${esc(f.placeholder ?? '')}</span>`
          : f.type === 'select'
            ? `<span style="${INPUT_STYLE}">${esc(f.options?.[0] ?? f.placeholder ?? '')}</span>`
            : `<span style="${INPUT_STYLE}">${esc(f.placeholder ?? '')}</span>`
      return `<div>${label}${control}</div>`
    })
    .join('')
  const label = esc(form.submit_label || 'Kirim')
  return `<div style="padding:40px 24px;${FONT}"><div style="display:flex;flex-direction:column;gap:16px;max-width:560px;margin:0 auto">${rows}<span style="display:block;text-align:center;padding:12px 20px;border-radius:10px;background:#465fff;color:#fff;font-weight:600">${label}</span></div></div>`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function registerLeadForm(editor: Editor, getForms: () => LandingFormWithFields[]): void {
  editor.Components.addType(LEAD_FORM_TYPE, {
    isComponent: (el: HTMLElement) =>
      el.tagName === 'DIV' && el.getAttribute?.('data-zyad-slot') === 'lead-form'
        ? { type: LEAD_FORM_TYPE }
        : undefined,
    model: {
      defaults: {
        name: 'Form Konsultasi',
        tagName: 'div',
        draggable: true,
        droppable: false,
        editable: false,
        copyable: false,
        removable: true,
        selectable: true,
        highlightable: true,
        stylable: true,
        attributes: {
          'data-zyad-slot': 'lead-form',
          'data-zyad-config': '{}',
        },
      },
      init(this: any) {
        // Panel memilih form → render ulang pratinjau kanvas.
        this.on('change:attributes', () => this.view?.render())
      },
    },
    view: {
      onRender(this: any) {
        const formId = parseLeadFormId(this.model.getAttributes()['data-zyad-config'])
        const form = formId ? getForms().find((f) => f.id === formId) : undefined
        this.el.innerHTML = buildLeadFormPreview(form)
        this.el.style.display = 'block'
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
