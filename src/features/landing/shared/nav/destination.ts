import type { LandingMenuItem } from '@/features/landing/shared/types/landing.types'

/**
 * Safe destination builder for landing navigation items. Shared between the
 * old standalone Navigation page (removed) and the visual builder's Header
 * panel so both encode/decode `landing_menu_items.destination` identically.
 *
 * Backend stores an internal-page destination as a bare slug; the frontend
 * renders it as the public Vue route `/slug` (with `public-marketing` / empty
 * meaning the tenant homepage `/`).
 */

export type NavLinkType = 'internal_page' | 'external_link' | 'anchor' | 'button'

export interface NavDestinationForm {
  link_type: NavLinkType
  /** Slug for internal_page / button. */
  slug: string
  /** Anchor without the leading `#`. */
  anchor: string
  /** Full external URL. */
  externalUrl: string
}

export function normalizeLinkType(value: string): NavLinkType {
  if (value === 'external_link' || value === 'anchor' || value === 'button') return value
  return 'internal_page'
}

/** Human-facing route preview, e.g. `/pricing`, `#faq`, `https://…`. */
export function buildDestination(form: NavDestinationForm): string {
  if (form.link_type === 'anchor') {
    const anchor = form.anchor.trim().replace(/^#/, '')
    return anchor ? `#${anchor}` : ''
  }
  if (form.link_type === 'external_link') return form.externalUrl.trim()
  const slug = form.slug.trim().replace(/^\//, '')
  if (!slug || slug === 'public-marketing') return '/'
  return `/${slug}`
}

/** Value to send to the API for `landing_menu_items.destination`. */
export function destinationForApi(form: NavDestinationForm): string {
  const destination = buildDestination(form)
  if (form.link_type === 'internal_page' || form.link_type === 'button') {
    return destination === '/' ? 'public-marketing' : destination.replace(/^\//, '')
  }
  return destination
}

/** Public href for a persisted menu item (for previews / the canvas header). */
export function hrefForItem(item: Pick<LandingMenuItem, 'link_type' | 'destination'>): string {
  if (item.link_type === 'anchor') {
    return item.destination.startsWith('#') ? item.destination : `#${item.destination}`
  }
  if (item.link_type === 'internal_page' || item.link_type === 'button') {
    const slug = item.destination.replace(/^\//, '')
    return !slug || slug === 'public-marketing' ? '/' : `/${slug}`
  }
  return item.destination || '#'
}

/** Seed a form from a persisted item (inverse of destinationForApi). */
export function formFromItem(
  item: Pick<LandingMenuItem, 'link_type' | 'destination'>,
): NavDestinationForm {
  const link_type = normalizeLinkType(item.link_type)
  const form: NavDestinationForm = { link_type, slug: '', anchor: '', externalUrl: '' }
  if (link_type === 'anchor') form.anchor = item.destination.replace(/^#/, '')
  else if (link_type === 'external_link') form.externalUrl = item.destination
  else form.slug = item.destination.replace(/^\//, '')
  return form
}
