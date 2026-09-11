import type { Editor } from 'grapesjs'

import type { CanvasNavItem } from '@/stores/landingChrome'

/**
 * `zyad-tenant-footer` — a locked GrapesJS component for the tenant footer.
 *
 * Mirrors `grapes.header-component.ts`: in the canvas it renders a LIVE preview
 * (brand + nav links) built from the tenant's footer menu + branding, so the
 * author sees the real thing while building. On export it collapses to a
 * sentinel `<div data-zyad-slot="tenant-footer">` — the columns / brand / copy
 * stay tenant-wide and are re-filled at render time (GrapesPageFrame.vue /
 * document_ssr.go). There is no per-page presentation to store: dropping the
 * "Footer tenant" block onto the canvas means "use the footer", removing it
 * means "don't" — same on/off model as the header.
 *
 * Note: the real publish/public render (`fillFooter` in GrapesPageFrame.vue,
 * `buildFooterMarkup` in document_ssr.go) can group footer links into several
 * named columns from multiple `location=footer` menus. This canvas preview
 * only edits a single flat list (the builder doesn't yet manage multiple
 * footer columns) — a simplification of the preview, not of the real render.
 */

export const TENANT_FOOTER_TYPE = 'zyad-tenant-footer'

export interface TenantFooterData {
  nav: CanvasNavItem[]
  brandName: string
  logoUrl: string
}

function esc(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

export function safeFooterHref(raw: string): string {
  const href = (raw || '').trim()
  if (!href || href.startsWith('//')) return '#'
  return /^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href) ? href : '#'
}

/**
 * Self-contained canvas preview markup (inline styles — it lives in the GrapesJS
 * canvas iframe which doesn't get our chrome CSS). The public render uses its
 * own class-based markup in GrapesPageFrame.vue / document_ssr.go.
 */
export function buildFooterPreview(data: TenantFooterData): string {
  const logo = data.logoUrl
    ? `<img src="${esc(data.logoUrl)}" alt="${esc(data.brandName)}" style="height:28px;width:auto;display:block">`
    : ''
  const brand = `<div style="display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:16px">${logo}<span>${esc(data.brandName || 'Brand')}</span></div>`

  const links = data.nav.length
    ? data.nav
        .map(
          (item) =>
            `<a href="${esc(safeFooterHref(item.href))}" style="color:#cbd5e1;text-decoration:none;font-size:14px">${esc(item.label)}</a>`,
        )
        .join('')
    : `<span style="color:#64748b;font-size:13px;font-style:italic">Belum ada item navigasi footer</span>`
  const nav = `<nav style="display:flex;flex-wrap:wrap;gap:8px 20px">${links}</nav>`

  // Copyright/columns come from page settings + other footer menus, not
  // edited here — omitted from this simplified preview (see file doc-comment).
  return `<div style="padding:32px 24px;background:#0f172a;color:#cbd5e1;font-family:'Inter','Segoe UI',system-ui,sans-serif"><div style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between">${brand}${nav}</div></div>`
}

/** Serialise the export sentinel. */
export function footerSentinelHTML(): string {
  return `<div data-zyad-slot="tenant-footer"></div>`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function registerTenantFooter(editor: Editor, getData: () => TenantFooterData): void {
  editor.Components.addType(TENANT_FOOTER_TYPE, {
    isComponent: (el: HTMLElement) =>
      el.tagName === 'DIV' && el.getAttribute?.('data-zyad-slot') === 'tenant-footer'
        ? { type: TENANT_FOOTER_TYPE }
        : undefined,
    model: {
      defaults: {
        name: 'Footer tenant',
        tagName: 'div',
        draggable: true,
        droppable: false,
        editable: false,
        copyable: false,
        removable: true,
        selectable: true,
        highlightable: true,
        attributes: {
          'data-zyad-slot': 'tenant-footer',
        },
      },
      toHTML() {
        return footerSentinelHTML()
      },
    },
    view: {
      onRender(this: any) {
        this.el.innerHTML = buildFooterPreview(getData())
        this.el.style.display = 'block'
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
