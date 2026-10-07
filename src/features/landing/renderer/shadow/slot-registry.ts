import type { Component } from 'vue'

import type { GrapesChrome } from '../grapes/chrome'
import CatalogPricingSlot from './slots/CatalogPricingSlot.vue'
import catalogPricingCss from './slots/catalog-pricing.slot.css?inline'
import FooterSlot from './slots/FooterSlot.vue'
import footerCss from './slots/footer.slot.css?inline'
import HeaderSlot from './slots/HeaderSlot.vue'
import headerCss from './slots/header.slot.css?inline'
import TenantPricingSlot from './slots/TenantPricingSlot.vue'
import pricingCss from './slots/tenant-pricing.slot.css?inline'

export interface SlotProps {
  /** Sentinel element (already emptied). */
  host: HTMLElement
  chrome: GrapesChrome
  /** Copy of the sentinel's data-* attributes (e.g. zyadHeader, zyadConfig). */
  dataset: Record<string, string>
}

export interface SlotDefinition {
  component: Component
  css: string
}

export const SLOT_REGISTRY: Record<string, SlotDefinition> = {
  'tenant-nav': { component: HeaderSlot, css: headerCss },
  'tenant-footer': { component: FooterSlot, css: footerCss },
  'catalog-pricing': { component: CatalogPricingSlot, css: catalogPricingCss },
  'pricing-plans': { component: TenantPricingSlot, css: pricingCss },
}

/** All slot CSS concatenated, ordered by registry key. */
export function slotStyles(): string {
  return Object.keys(SLOT_REGISTRY)
    .sort()
    .map((key) => SLOT_REGISTRY[key]!.css)
    .join('\n')
}
