export interface GrapesChromeLink {
  label: string
  href: string
  target?: string
}
export interface GrapesChromePricingPlan {
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
export interface GrapesChrome {
  nav?: GrapesChromeLink[]
  /** Tenant brand for the header sentinel (logo + name next to the nav). */
  brand?: { name?: string; logoUrl?: string }
  footer?: {
    brandName?: string
    logoUrl?: string
    copyright?: string
    columns?: { title: string; links: GrapesChromeLink[] }[]
  }
  /** Tenant's own pricing-plan cards for the pricing-plans sentinel. */
  pricingPlans?: GrapesChromePricingPlan[]
}

export interface HeaderPresentation {
  position: 'static' | 'sticky' | 'fixed'
  variant: 'solid' | 'transparent' | 'glass'
  layout: 'grouped' | 'split' | 'spread'
  groupAlign: 'left' | 'center' | 'right'
  container: boolean
  showAction: boolean
  actionLabel: string
  actionUrl: string
  hideOnScroll: boolean
  brandColor: string
  navColor: string
}

// Accepts hex/rgb(a)()/hsl(a)()/bare CSS color keywords — rejects anything
// else so a stored value can never break out of the single CSS custom
// property it's substituted into. Mirrors grapes.header-component.ts's
// `safeHeaderColor` and document_ssr.go's `safeSSRColor`. Keep in sync.
const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,24}|(?:rgb|rgba|hsl|hsla)\([\d.,%\s/]+\))$/

export function safeColor(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const v = raw.trim()
  return v && SAFE_COLOR_RE.test(v) ? v : fallback
}

// Mirrors grapes.header-component.ts parseHeaderPresentation() — see that
// file's doc comment for why the migration below exists. Keep both in sync.
export function readHeaderPresentation(raw: string | null): HeaderPresentation {
  const d: HeaderPresentation = {
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
  let p: Record<string, unknown> = {}
  try {
    p = JSON.parse(raw || '{}') as Record<string, unknown>
  } catch {
    p = {}
  }

  const legacyAlign = typeof p.align === 'string' ? p.align : undefined
  const legacySticky = typeof p.sticky === 'boolean' ? p.sticky : undefined

  const position: HeaderPresentation['position'] =
    typeof p.position === 'string' && ['static', 'sticky', 'fixed'].includes(p.position)
      ? (p.position as HeaderPresentation['position'])
      : legacySticky !== undefined
        ? legacySticky
          ? 'sticky'
          : 'static'
        : d.position

  const layout: HeaderPresentation['layout'] =
    typeof p.layout === 'string' && ['grouped', 'split', 'spread'].includes(p.layout)
      ? (p.layout as HeaderPresentation['layout'])
      : 'grouped'

  const groupAlign: HeaderPresentation['groupAlign'] =
    typeof p.groupAlign === 'string' && ['left', 'center', 'right'].includes(p.groupAlign)
      ? (p.groupAlign as HeaderPresentation['groupAlign'])
      : legacyAlign && ['left', 'center', 'right'].includes(legacyAlign)
        ? (legacyAlign as HeaderPresentation['groupAlign'])
        : d.groupAlign

  return {
    position,
    variant: ['solid', 'transparent', 'glass'].includes(p.variant as string)
      ? (p.variant as HeaderPresentation['variant'])
      : d.variant,
    layout,
    groupAlign,
    container: typeof p.container === 'boolean' ? p.container : d.container,
    showAction: typeof p.showAction === 'boolean' ? p.showAction : d.showAction,
    actionLabel: typeof p.actionLabel === 'string' ? p.actionLabel : d.actionLabel,
    actionUrl: typeof p.actionUrl === 'string' ? p.actionUrl : d.actionUrl,
    hideOnScroll: typeof p.hideOnScroll === 'boolean' ? p.hideOnScroll : d.hideOnScroll,
    brandColor: safeColor(p.brandColor, d.brandColor),
    navColor: safeColor(p.navColor, d.navColor),
  }
}

export function safeHref(raw: string): string {
  const href = (raw || '').trim()
  if (!href) return '#'
  if (/^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href)) return href
  return '#'
}
