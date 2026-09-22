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
 * per-page *presentation* (position / variant / layout / container / action)
 * lives on the page.
 */

export const TENANT_HEADER_TYPE = 'zyad-tenant-header'

export interface TenantHeaderPresentation {
  /** static = normal flow. sticky = pinned while scrolling but still takes up
   * space at the top (hero starts below it). fixed = removed from flow
   * entirely, so the hero starts at y=0 and the header floats over it —
   * combine with variant:'transparent' for a header that blends into a hero. */
  position: 'static' | 'sticky' | 'fixed'
  variant: 'solid' | 'transparent' | 'glass'
  /** grouped = brand+nav+action cluster together as one group, positioned by
   * groupAlign. split = brand pinned left, nav+action grouped together
   * pinned right. spread = classic 3-zone (brand / nav-centered / action)
   * spanning the full width — container is ignored for this layout. */
  layout: 'grouped' | 'split' | 'spread'
  /** Only meaningful when layout === 'grouped'. */
  groupAlign: 'left' | 'center' | 'right'
  /** Constrain content to a centered max-width column (like page content).
   * Ignored (treated as false) when layout === 'spread'. */
  container: boolean
  showAction: boolean
  actionLabel: string
  actionUrl: string
  /** Slide the header out of view on scroll-down, back in on scroll-up.
   * Only animated on the public render (parent-level, real scroll listener) —
   * the canvas preview shows the header statically regardless of this flag. */
  hideOnScroll: boolean
  /** CSS color for the brand text/logo alt text. */
  brandColor: string
  /** CSS color for the nav link text. */
  navColor: string
}

export const DEFAULT_HEADER_PRESENTATION: TenantHeaderPresentation = {
  position: 'sticky',
  variant: 'solid',
  layout: 'grouped',
  groupAlign: 'left',
  container: true,
  showAction: true,
  actionLabel: 'Masuk',
  actionUrl: '/login',
  hideOnScroll: false,
  brandColor: '#0f172a',
  navColor: '#475569',
}

const POSITIONS = ['static', 'sticky', 'fixed'] as const
const VARIANTS = ['solid', 'transparent', 'glass'] as const
const LAYOUTS = ['grouped', 'split', 'spread'] as const
const GROUP_ALIGNS = ['left', 'center', 'right'] as const

// Accepts hex (#0f172a / #fff), rgb(a)()/hsl(a)(), or a bare CSS color
// keyword (e.g. "white", "currentColor") — rejects anything else (no `;`,
// `url(`, etc.) so a stored value can never break out of the single CSS
// property it's substituted into. Keep in sync with GrapesPageFrame.vue's
// `safeColor` and document_ssr.go's `safeSSRColor`.
const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,24}|(?:rgb|rgba|hsl|hsla)\([\d.,%\s/]+\))$/

export function safeHeaderColor(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const v = raw.trim()
  return v && SAFE_COLOR_RE.test(v) ? v : fallback
}

export function parseHeaderPresentation(raw: unknown): TenantHeaderPresentation {
  const d = DEFAULT_HEADER_PRESENTATION
  let p: Record<string, unknown> = {}
  if (typeof raw === 'string' && raw.trim()) {
    try {
      p = JSON.parse(raw) as Record<string, unknown>
    } catch {
      p = {}
    }
  } else if (raw && typeof raw === 'object') {
    p = raw as Record<string, unknown>
  }

  // Legacy migration: presentations saved before this field set only had
  // `sticky: boolean` + `align`. The old behavior (whole bar shifts as one
  // group) is exactly today's 'grouped' layout, so map align -> groupAlign
  // under layout:'grouped' — already-published pages stay visually
  // unchanged (aside from `container` now defaulting to true).
  const legacyAlign = typeof p.align === 'string' ? p.align : undefined
  const legacySticky = typeof p.sticky === 'boolean' ? p.sticky : undefined

  const position: TenantHeaderPresentation['position'] =
    typeof p.position === 'string' && POSITIONS.includes(p.position as never)
      ? (p.position as TenantHeaderPresentation['position'])
      : legacySticky !== undefined
        ? legacySticky
          ? 'sticky'
          : 'static'
        : d.position

  const layout: TenantHeaderPresentation['layout'] =
    typeof p.layout === 'string' && LAYOUTS.includes(p.layout as never)
      ? (p.layout as TenantHeaderPresentation['layout'])
      : 'grouped'

  const groupAlign: TenantHeaderPresentation['groupAlign'] =
    typeof p.groupAlign === 'string' && GROUP_ALIGNS.includes(p.groupAlign as never)
      ? (p.groupAlign as TenantHeaderPresentation['groupAlign'])
      : legacyAlign && GROUP_ALIGNS.includes(legacyAlign as never)
        ? (legacyAlign as TenantHeaderPresentation['groupAlign'])
        : d.groupAlign

  return {
    position,
    variant: VARIANTS.includes(p.variant as never)
      ? (p.variant as TenantHeaderPresentation['variant'])
      : d.variant,
    layout,
    groupAlign,
    container: typeof p.container === 'boolean' ? p.container : d.container,
    showAction: typeof p.showAction === 'boolean' ? p.showAction : d.showAction,
    actionLabel: typeof p.actionLabel === 'string' ? p.actionLabel : d.actionLabel,
    actionUrl: typeof p.actionUrl === 'string' ? p.actionUrl : d.actionUrl,
    hideOnScroll: typeof p.hideOnScroll === 'boolean' ? p.hideOnScroll : d.hideOnScroll,
    brandColor: safeHeaderColor(p.brandColor, d.brandColor),
    navColor: safeHeaderColor(p.navColor, d.navColor),
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
 * canvas iframe, which has no mechanism to load our chrome CSS, so every mode
 * below is expressed as computed inline styles rather than the `zyad-tenant-header--*`
 * classes the public render / SSR use — same visual result, different source).
 */
export function buildHeaderPreview(data: TenantHeaderData, p: TenantHeaderPresentation): string {
  const bg =
    p.variant === 'solid'
      ? '#ffffff'
      : p.variant === 'glass'
        ? 'rgba(255,255,255,.72)'
        : 'transparent'
  const borderBottom = p.variant === 'transparent' ? '1px solid transparent' : '1px solid #e5e7eb'

  const logo = data.logoUrl
    ? `<img src="${esc(data.logoUrl)}" alt="${esc(data.brandName)}" style="height:28px;width:auto;display:block">`
    : ''
  const brand = `<a href="/" style="display:flex;flex:0 0 auto;align-items:center;gap:8px;font-weight:700;color:${p.brandColor};text-decoration:none;font-size:16px">${logo}<span>${esc(data.brandName || 'Brand')}</span></a>`

  const links = data.nav.length
    ? data.nav
        .map(
          (item) =>
            `<a href="${esc(safeHeaderHref(item.href))}" style="color:${p.navColor};text-decoration:none;font-size:14px;font-weight:500">${esc(item.label)}</a>`,
        )
        .join('')
    : `<span style="color:#94a3b8;font-size:13px;font-style:italic">Belum ada item navigasi</span>`

  const navStyle =
    p.layout === 'spread'
      ? 'display:flex;align-items:center;gap:22px;flex-wrap:wrap;flex:1;justify-content:center'
      : p.layout === 'split'
        ? 'display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-left:auto'
        : 'display:flex;align-items:center;gap:22px;flex-wrap:wrap'
  const nav = `<nav style="${navStyle}">${links}</nav>`

  const action = p.showAction
    ? `<a href="${esc(safeHeaderHref(p.actionUrl))}" style="display:inline-block;flex:0 0 auto;padding:9px 18px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap">${esc(p.actionLabel || 'Masuk')}</a>`
    : ''

  const innerJustify =
    p.layout === 'grouped'
      ? p.groupAlign === 'center'
        ? 'center'
        : p.groupAlign === 'right'
          ? 'flex-end'
          : 'flex-start'
      : 'flex-start'
  const containerActive = p.container
  const innerStyle = `display:flex;align-items:center;gap:24px;width:100%;justify-content:${innerJustify}${
    containerActive ? ';max-width:1120px;margin:0 auto' : ''
  }`

  const positionStyle =
    p.position === 'fixed'
      ? 'position:fixed;top:0;left:0;right:0;z-index:50'
      : p.position === 'sticky'
        ? 'position:sticky;top:0;z-index:50'
        : ''

  return `<div style="padding:14px 24px;background:${bg};border-bottom:${borderBottom};font-family:'Inter','Segoe UI',system-ui,sans-serif;${positionStyle}"><div style="${innerStyle}">${brand}${nav}${action}</div></div>`
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
        stylable: true,
        attributes: {
          'data-zyad-slot': 'tenant-nav',
          'data-zyad-header': JSON.stringify(DEFAULT_HEADER_PRESENTATION),
        },
      },
      // No custom toHTML(): the model never has real children (onRender below
      // only mutates the view's live DOM for the canvas preview, never the
      // component tree), so GrapesJS's default export already emits an
      // empty-inside <div> with whatever attributes/classes/inline style the
      // author set — including anything added via the Style Manager (Dekorasi:
      // background/opacity, Posisi: position/z-index — a transparent header
      // pinned over a hero section is just those, no special-casing needed).
      // A custom override here previously rebuilt the tag from scratch with
      // only the two data- attributes, silently discarding all of that.
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
