import type { Editor } from 'grapesjs'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'
import {
  DEFAULT_CATALOG_PRICING_CONFIG,
  parseCatalogPricingConfig,
  serializeCatalogPricingConfig,
  type CatalogPricingConfig,
} from '../../renderer/catalog-pricing/catalog-pricing-config'
import {
  buildCards,
  defaultFrequency,
  frequenciesOf,
} from '../../renderer/sections/pricing/pricing-view'

/**
 * `zyad-catalog-pricing` — GrapesJS component for the platform's public
 * catalog pricing (Sales → Produk). Platform organization only: the block is
 * registered by GrapesEditor.vue only when `isPlatformOrganization`.
 *
 * In the canvas it renders an inline-styled preview (the canvas is not a
 * shadow DOM and does not receive the public slot CSS). On export it is just
 * the sentinel `<div data-zyad-slot="catalog-pricing" data-zyad-config="…">`;
 * prices are never stored in the page and are re-filled by CatalogPricingSlot.vue.
 */

export const CATALOG_PRICING_TYPE = 'zyad-catalog-pricing'
export const CATALOG_PRICING_BLOCK_ID = 'zy-catalog-pricing'

const FONT = "font-family:'Inter','Segoe UI',system-ui,sans-serif"

function esc(value: string): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/** Pratinjau kanvas: harga memakai frekuensi default kategori pertama yang terpilih. */
export function buildCatalogPricingPreview(
  cfg: CatalogPricingConfig,
  categories: PublicListingCategory[],
): string {
  const withListings = categories.filter((c) => c.listings.length > 0)
  const picked = cfg.categoryIds.length
    ? withListings.filter((c) => cfg.categoryIds.includes(c.id))
    : withListings
  const category = picked[0] ?? withListings[0]
  if (!category) {
    return `<div style="padding:48px 24px;text-align:center;background:#f8fafc;${FONT}"><span style="color:#94a3b8;font-size:13px;font-style:italic">Belum ada produk publik — publikasikan di Sales → Produk</span></div>`
  }

  const freqs = frequenciesOf(category)
  const preferred = cfg.defaultFrequency
  const frequency = freqs.includes(preferred) ? preferred : defaultFrequency(freqs)

  const cards = buildCards(category, frequency)
    .map((card) => {
      const featured = card.code === cfg.featuredCode
      const border = featured ? '2px solid #465fff' : '1px solid #e2e8f0'
      const shadow = featured ? 'box-shadow:0 12px 32px rgba(70,95,255,.16);' : ''
      const badge = featured
        ? `<span style="display:inline-block;margin:0 0 12px;padding:4px 10px;border-radius:999px;background:#465fff;color:#fff;font-size:12px;font-weight:600">Populer</span>`
        : ''
      const benefits = card.benefits.length
        ? `<ul style="list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px;color:#334155">${card.benefits
            .map((b) => `<li>${esc(b)}</li>`)
            .join('')}</ul>`
        : ''
      return `<div style="padding:32px 28px;border:${border};border-radius:16px;background:#fff;${shadow}">${badge}<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a">${esc(card.name)}</p><p style="margin:0 0 16px;font-size:28px;font-weight:800;color:#0f172a">${esc(card.priceLabel)}</p>${benefits}<span style="display:block;text-align:center;padding:11px 20px;border-radius:10px;background:#465fff;color:#fff;font-weight:600">${esc(card.ctaLabel)}</span></div>`
    })
    .join('')

  const enterprise = cfg.enterpriseCard.enabled
    ? `<div style="padding:32px 28px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc"><p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a">${esc(cfg.enterpriseCard.title)}</p><ul style="list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px;color:#334155">${cfg.enterpriseCard.points
        .map((p) => `<li>${esc(p)}</li>`)
        .join(
          '',
        )}</ul><span style="display:block;text-align:center;padding:11px 20px;border-radius:10px;border:1px solid #465fff;color:#465fff;font-weight:600">Hubungi sales</span></div>`
    : ''

  return `<div style="padding:64px 24px;${FONT}"><div style="text-align:center;margin:0 0 32px"><p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#0f172a">${esc(cfg.title)}</p><p style="margin:0;font-size:15px;color:#64748b">${esc(cfg.subtitle)}</p></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">${cards}${enterprise}</div></div>`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function registerCatalogPricing(
  editor: Editor,
  getCategories: () => PublicListingCategory[],
): void {
  editor.Components.addType(CATALOG_PRICING_TYPE, {
    isComponent: (el: HTMLElement) =>
      el.tagName === 'DIV' && el.getAttribute?.('data-zyad-slot') === 'catalog-pricing'
        ? { type: CATALOG_PRICING_TYPE }
        : undefined,
    model: {
      defaults: {
        name: 'Pricing Katalog',
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
          'data-zyad-slot': 'catalog-pricing',
          'data-zyad-config': serializeCatalogPricingConfig(DEFAULT_CATALOG_PRICING_CONFIG),
        },
      },
      init(this: any) {
        // Panel mengubah atribut → render ulang pratinjau kanvas.
        this.on('change:attributes', () => this.view?.render())
      },
    },
    view: {
      onRender(this: any) {
        const cfg = parseCatalogPricingConfig(this.model.getAttributes()['data-zyad-config'])
        this.el.innerHTML = buildCatalogPricingPreview(cfg, getCategories())
        this.el.style.display = 'block'
      },
    },
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */
