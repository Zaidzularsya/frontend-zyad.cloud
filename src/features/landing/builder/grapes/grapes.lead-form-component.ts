import type { Editor } from 'grapesjs'
import { createApp } from 'vue'

import { chromeFormFromAdmin } from '../../renderer/grapes/chrome'
import leadFormCss from '../../renderer/shadow/slots/lead-form.slot.css?inline'
import LeadFormView from '../../renderer/lead-form/LeadFormView.vue'
import { readLeadFormPresentation } from '../../renderer/lead-form/lead-form-presentation'
import type { LandingFormWithFields } from '../../shared/types/landing.types'

/**
 * `zyad-lead-form` — blok "Form Konsultasi". Tersedia untuk semua organisasi.
 *
 * Di kanvas: `LeadFormView` (komponen yang sama dengan halaman publik, nonaktif) di-mount
 * dengan createApp ke elemen komponen. Saat export hanya sentinel
 * `<div data-zyad-slot="lead-form" data-zyad-config='{"form_id":"…","style":"…"}'>`;
 * field diisi ulang oleh LeadFormSlot.vue dari data form di server.
 */

export const LEAD_FORM_TYPE = 'zyad-lead-form'
export const LEAD_FORM_BLOCK_ID = 'zy-lead-form'
export const LEAD_FORM_EMPTY_TEXT = 'Pilih atau buat form di panel kanan'

const EMPTY_STYLE =
  "padding:40px 24px;text-align:center;background:#f8fafc;font-family:'Inter','Segoe UI',system-ui,sans-serif"
const CSS_ELEMENT_ID = 'zy-lead-form-css'
const POPUP_HINT = 'Mode popup · tampil sebagai tombol di pojok halaman'

/** Baca form_id dari atribut data-zyad-config; '' bila tidak valid. */
export function parseLeadFormId(raw: string | undefined): string {
  return readLeadFormPresentation(raw).formId
}

/** Suntik CSS form ke dokumen kanvas (sekali per dokumen); sama dengan CSS slot di halaman publik. */
export function ensureLeadFormCanvasCss(doc: Document): void {
  if (doc.getElementById(CSS_ELEMENT_ID)) return
  const style = doc.createElement('style')
  style.id = CSS_ELEMENT_ID
  style.textContent = leadFormCss
  doc.head.appendChild(style)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function unmountApp(view: any): void {
  view.leadFormApp?.unmount()
  view.leadFormApp = null
}

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
        // Render ulang: lepas app Vue sebelumnya supaya tidak bocor.
        unmountApp(this)
        const presentation = readLeadFormPresentation(
          this.model.getAttributes()['data-zyad-config'],
        )
        const form = presentation.formId
          ? getForms().find((f) => f.id === presentation.formId)
          : undefined
        this.el.style.display = 'block'
        if (!form) {
          this.el.innerHTML = `<div style="${EMPTY_STYLE}"><span style="color:#94a3b8;font-size:13px;font-style:italic">${LEAD_FORM_EMPTY_TEXT}</span></div>`
          return
        }
        ensureLeadFormCanvasCss(this.el.ownerDocument)
        this.el.innerHTML = ''
        // Komponen yang sama dengan halaman publik, nonaktif: pratinjau identik dengan hasil publish.
        // Mode popup di kanvas tetap tampil sebagai kartu form agar bisa dipilih dan diedit.
        this.leadFormApp = createApp(LeadFormView, {
          form: chromeFormFromAdmin(form),
          presentation,
          values: {},
          errors: {},
          state: 'idle',
          submitError: '',
          successHref: '',
          disabled: true,
          hint: presentation.display === 'popup' ? POPUP_HINT : '',
        })
        this.leadFormApp.mount(this.el)
      },
      removed(this: any) {
        unmountApp(this)
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
