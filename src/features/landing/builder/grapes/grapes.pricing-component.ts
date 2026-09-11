import type { Editor } from 'grapesjs'

/**
 * `zyad-pricing-plans` — a locked GrapesJS component for the tenant's own
 * pricing-plan cards (NOT the platform's own subscription plans — see the
 * `landing_pricing_plans` table / `GrapesPricingPanel.vue` doc-comment).
 *
 * Mirrors `grapes.footer-component.ts`: in the canvas it renders a LIVE
 * preview built from the tenant's plan list, so the author sees the real
 * thing while building. On export it collapses to a sentinel
 * `<div data-zyad-slot="pricing-plans">` — the plans stay tenant-wide and are
 * re-filled at render time (GrapesPageFrame.vue / document_ssr.go). No
 * per-page presentation to store: dropping the block means "use pricing",
 * removing it means "don't" — same on/off model as header/footer.
 */

export const TENANT_PRICING_TYPE = 'zyad-pricing-plans'

export interface TenantPricingPlan {
  id: string
  name: string
  priceLabel: string
  intervalLabel?: string
  description?: string
  features: string[]
  ctaLabel: string
  ctaUrl?: string
  isFeatured: boolean
}

export interface TenantPricingData {
  plans: TenantPricingPlan[]
}

function esc(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

export function safePricingHref(raw: string): string {
  const href = (raw || '').trim()
  if (!href || href.startsWith('//')) return '#'
  return /^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href) ? href : '#'
}

/**
 * Self-contained canvas preview markup (inline styles — it lives in the GrapesJS
 * canvas iframe which doesn't get our chrome CSS). The public render uses its
 * own class-based markup in GrapesPageFrame.vue / document_ssr.go.
 */
export function buildPricingPreview(data: TenantPricingData): string {
  if (!data.plans.length) {
    return `<div style="padding:48px 24px;text-align:center;background:#f8fafc;font-family:'Inter','Segoe UI',system-ui,sans-serif"><span style="color:#94a3b8;font-size:13px;font-style:italic">Belum ada paket harga, tambahkan lewat panel di kanan</span></div>`
  }

  const cards = data.plans
    .map((plan) => {
      const featured = plan.isFeatured
      const border = featured ? '2px solid #465fff' : '1px solid #e2e8f0'
      const shadow = featured ? 'box-shadow:0 12px 32px rgba(70,95,255,.16);' : ''
      const badge = featured
        ? `<span style="display:inline-block;margin:0 0 12px;padding:4px 10px;border-radius:999px;background:#465fff;color:#fff;font-size:12px;font-weight:600">Populer</span>`
        : ''
      const interval = plan.intervalLabel
        ? ` <span style="font-size:14px;font-weight:500;color:#64748b">${esc(plan.intervalLabel)}</span>`
        : ''
      const description = plan.description
        ? `<p style="margin:8px 0 20px;font-size:14px;color:#475569">${esc(plan.description)}</p>`
        : ''
      const features = plan.features.length
        ? `<ul style="list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px;color:#334155">${plan.features
            .filter(Boolean)
            .map((f) => `<li>${esc(f)}</li>`)
            .join('')}</ul>`
        : ''
      const ctaBg = featured ? '#2563eb' : '#465fff'
      const cta = plan.ctaLabel
        ? `<a href="${esc(safePricingHref(plan.ctaUrl || ''))}" style="display:block;text-align:center;padding:11px 20px;border-radius:10px;background:${ctaBg};color:#fff;font-weight:600;text-decoration:none">${esc(plan.ctaLabel)}</a>`
        : ''

      return `<div style="padding:32px 28px;border:${border};border-radius:16px;background:#fff;${shadow}">${badge}<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a">${esc(plan.name)}</p><p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#0f172a">${esc(plan.priceLabel)}${interval}</p>${description}${features}${cta}</div>`
    })
    .join('')

  return `<div style="padding:64px 24px;font-family:'Inter','Segoe UI',system-ui,sans-serif"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">${cards}</div></div>`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function registerTenantPricing(editor: Editor, getData: () => TenantPricingData): void {
  editor.Components.addType(TENANT_PRICING_TYPE, {
    isComponent: (el: HTMLElement) =>
      el.tagName === 'DIV' && el.getAttribute?.('data-zyad-slot') === 'pricing-plans'
        ? { type: TENANT_PRICING_TYPE }
        : undefined,
    model: {
      defaults: {
        name: 'Pricing tenant',
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
          'data-zyad-slot': 'pricing-plans',
        },
      },
      // No custom toHTML(): see grapes.header-component.ts — the model never
      // has real children, so GrapesJS's default export already preserves
      // whatever class/style the Style Manager added, instead of discarding it.
    },
    view: {
      onRender(this: any) {
        this.el.innerHTML = buildPricingPreview(getData())
        this.el.style.display = 'block'
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
