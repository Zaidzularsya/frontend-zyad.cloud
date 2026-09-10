import type { Editor } from 'grapesjs'

import type { CanvasNavItem } from '@/stores/landingChrome'

/**
 * `zyad-tenant-header` — a locked GrapesJS component for the tenant header.
 *
 * In the canvas it renders a LIVE preview (logo + nav + action) built from the
 * tenant's menu + branding, so the author sees the real thing while building.
 * On export it collapses to a sentinel `<div data-zyad-slot="tenant-nav"
 * data-zyad-header='{…presentation…}'>` — the nav items / logo stay tenant-wide
 * and are re-filled at render time (GrapesPageFrame.vue / document_ssr.go), so
 * editing the tenant menu updates every page without re-publishing. Only the
 * per-page *presentation* (sticky / variant / align / action) lives on the page.
 */

export const TENANT_HEADER_TYPE = 'zyad-tenant-header'

export interface TenantHeaderPresentation {
  sticky: boolean
  variant: 'solid' | 'transparent' | 'glass'
  align: 'left' | 'center' | 'right'
  showAction: boolean
  actionLabel: string
  actionUrl: string
}

export const DEFAULT_HEADER_PRESENTATION: TenantHeaderPresentation = {
  sticky: true,
  variant: 'solid',
  align: 'left',
  showAction: true,
  actionLabel: 'Masuk',
  actionUrl: '/login',
}

const VARIANTS = ['solid', 'transparent', 'glass'] as const
const ALIGNS = ['left', 'center', 'right'] as const

export function parseHeaderPresentation(raw: unknown): TenantHeaderPresentation {
  const d = DEFAULT_HEADER_PRESENTATION
  let p: Partial<TenantHeaderPresentation> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      p = JSON.parse(raw) as Partial<TenantHeaderPresentation>
    } catch {
      p = {}
    }
  } else if (raw && typeof raw === 'object') {
    p = raw as Partial<TenantHeaderPresentation>
  }
  return {
    sticky: typeof p.sticky === 'boolean' ? p.sticky : d.sticky,
    variant: VARIANTS.includes(p.variant as never)
      ? (p.variant as TenantHeaderPresentation['variant'])
      : d.variant,
    align: ALIGNS.includes(p.align as never)
      ? (p.align as TenantHeaderPresentation['align'])
      : d.align,
    showAction: typeof p.showAction === 'boolean' ? p.showAction : d.showAction,
    actionLabel: typeof p.actionLabel === 'string' ? p.actionLabel : d.actionLabel,
    actionUrl: typeof p.actionUrl === 'string' ? p.actionUrl : d.actionUrl,
  }
}

export interface TenantHeaderData {
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

export function safeHeaderHref(raw: string): string {
  const href = (raw || '').trim()
  if (!href || href.startsWith('//')) return '#'
  return /^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href) ? href : '#'
}

/**
 * Self-contained canvas preview markup (inline styles — it lives in the GrapesJS
 * canvas iframe which doesn't get our chrome CSS). The public render uses its
 * own class-based markup in GrapesPageFrame.vue / document_ssr.go.
 */
export function buildHeaderPreview(data: TenantHeaderData, p: TenantHeaderPresentation): string {
  const bg =
    p.variant === 'solid'
      ? '#ffffff'
      : p.variant === 'glass'
        ? 'rgba(255,255,255,.72)'
        : 'transparent'
  const borderBottom = p.variant === 'transparent' ? '1px solid transparent' : '1px solid #e5e7eb'
  const justify =
    p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'space-between'

  const logo = data.logoUrl
    ? `<img src="${esc(data.logoUrl)}" alt="${esc(data.brandName)}" style="height:28px;width:auto;display:block">`
    : ''
  const brand = `<a href="/" style="display:flex;align-items:center;gap:8px;font-weight:700;color:#0f172a;text-decoration:none;font-size:16px">${logo}<span>${esc(data.brandName || 'Brand')}</span></a>`

  const links = data.nav.length
    ? data.nav
        .map(
          (item) =>
            `<a href="${esc(safeHeaderHref(item.href))}" style="color:#475569;text-decoration:none;font-size:14px;font-weight:500">${esc(item.label)}</a>`,
        )
        .join('')
    : `<span style="color:#94a3b8;font-size:13px;font-style:italic">Belum ada item navigasi</span>`
  const nav = `<nav style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">${links}</nav>`

  const action = p.showAction
    ? `<a href="${esc(safeHeaderHref(p.actionUrl))}" style="display:inline-block;padding:9px 18px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap">${esc(p.actionLabel || 'Masuk')}</a>`
    : ''

  return `<div style="display:flex;align-items:center;gap:24px;justify-content:${justify};padding:14px 24px;background:${bg};border-bottom:${borderBottom};font-family:'Inter','Segoe UI',system-ui,sans-serif">${brand}${nav}${action}</div>`
}

/** Serialise presentation into the export sentinel's attribute value. */
export function headerSentinelHTML(presentation: TenantHeaderPresentation): string {
  return `<div data-zyad-slot="tenant-nav" data-zyad-header='${esc(JSON.stringify(presentation))}'></div>`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function registerTenantHeader(editor: Editor, getData: () => TenantHeaderData): void {
  editor.Components.addType(TENANT_HEADER_TYPE, {
    isComponent: (el: HTMLElement) =>
      el.tagName === 'DIV' && el.getAttribute?.('data-zyad-slot') === 'tenant-nav'
        ? { type: TENANT_HEADER_TYPE }
        : undefined,
    model: {
      defaults: {
        name: 'Header tenant',
        tagName: 'div',
        draggable: true,
        droppable: false,
        editable: false,
        copyable: false,
        removable: true,
        selectable: true,
        highlightable: true,
        attributes: {
          'data-zyad-slot': 'tenant-nav',
          'data-zyad-header': JSON.stringify(DEFAULT_HEADER_PRESENTATION),
        },
      },
      toHTML(this: any) {
        const raw = this.getAttributes()['data-zyad-header']
        return headerSentinelHTML(parseHeaderPresentation(raw))
      },
    },
    view: {
      init(this: any) {
        this.listenTo(this.model, 'change:attributes:data-zyad-header', this.render)
      },
      onRender(this: any) {
        const raw = this.model.getAttributes()['data-zyad-header']
        this.el.innerHTML = buildHeaderPreview(getData(), parseHeaderPresentation(raw))
        this.el.style.display = 'block'
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
