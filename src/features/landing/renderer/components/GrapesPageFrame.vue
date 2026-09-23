<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DOMPurify from 'dompurify'

/**
 * Public renderer for GrapesJS-authored pages (page.builder === 'grapesjs').
 *
 * The stored HTML/CSS is arbitrary tenant markup, so it is rendered inside an
 * <iframe srcdoc> WITHOUT `allow-scripts` — total isolation from the SPA's
 * global CSS (main.css reset + Tailwind Preflight) and no script execution even
 * if sanitisation is bypassed. The backend already sanitises on publish and on
 * draft-preview read; DOMPurify + the CSS scrub here are defense-in-depth.
 * `allow-same-origin` IS granted (needed so `contentDocument`/scrollHeight can
 * be read for auto-height, below) — this is safe only because `allow-scripts`
 * is absent; the two together (not the case here) is what lets sandboxed
 * content script its way out.
 *
 * Live tenant chrome: the editor drops sentinel `<div data-zyad-slot="tenant-nav">`
 * / `"tenant-footer"` blocks. Footer/pricing innerHTML is (re)built inside the
 * iframe from the resolve response's live menu + branding data, assembled with
 * DOM APIs (textContent + setAttribute), never innerHTML from a user string —
 * no extra sanitiser needed. The header sentinel is instead REMOVED from what
 * goes into the iframe and re-rendered as a real Vue `<header>` in this
 * component's own template (see `headerPresentation` below): the iframe's
 * document is auto-height and never scrolls internally, so CSS
 * `position: sticky`/`fixed` inside it has no visible effect, and no script
 * can run in there to drive a hide-on-scroll animation either.
 */

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

interface HeaderPresentation {
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

function safeColor(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const v = raw.trim()
  return v && SAFE_COLOR_RE.test(v) ? v : fallback
}

// Mirrors grapes.header-component.ts parseHeaderPresentation() — see that
// file's doc comment for why the migration below exists. Keep both in sync.
function readHeaderPresentation(slot: Element): HeaderPresentation {
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
    p = JSON.parse(slot.getAttribute('data-zyad-header') || '{}') as Record<string, unknown>
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

const props = defineProps<{
  html: string
  css: string
  /** Live tenant menu + branding for the data-zyad-slot sentinels. */
  chrome?: GrapesChrome
  /** Optional a11y label for the frame. */
  title?: string
}>()

const frameRef = ref<HTMLIFrameElement | null>(null)
const frameHeight = ref(600)
let resizeObserver: ResizeObserver | null = null
let settleTimers: ReturnType<typeof setTimeout>[] = []

// url(javascript:…) and @import are handled server-side; strip the few things
// that could still break out of our <style> wrapper or pull remote CSS.
function scrubCss(css: string): string {
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '/* */(')
    .replace(/javascript:/gi, '')
}

function safeHref(raw: string): string {
  const href = (raw || '').trim()
  if (!href) return '#'
  if (/^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(href)) return href
  return '#'
}

function appendLinks(doc: Document, parent: HTMLElement, links: GrapesChromeLink[]) {
  links.forEach((link) => {
    const a = doc.createElement('a')
    a.textContent = link.label
    a.setAttribute('href', safeHref(link.href))
    if (link.target === 'new_tab' || link.target === '_blank') {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
    parent.appendChild(a)
  })
}

function fillFooter(doc: Document, slot: Element, footer: NonNullable<GrapesChrome['footer']>) {
  const wrap = doc.createElement('div')
  wrap.className = 'zyad-tenant-footer'

  const top = doc.createElement('div')
  top.className = 'zyad-tenant-footer__top'

  const brand = doc.createElement('div')
  brand.className = 'zyad-tenant-footer__brand'
  if (footer.logoUrl) {
    const img = doc.createElement('img')
    img.setAttribute('src', safeHref(footer.logoUrl))
    img.setAttribute('alt', footer.brandName || '')
    brand.appendChild(img)
  }
  if (footer.brandName) {
    const name = doc.createElement('span')
    name.textContent = footer.brandName
    brand.appendChild(name)
  }
  top.appendChild(brand)

  for (const column of footer.columns ?? []) {
    const col = doc.createElement('div')
    col.className = 'zyad-tenant-footer__col'
    const h = doc.createElement('p')
    h.className = 'zyad-tenant-footer__title'
    h.textContent = column.title
    col.appendChild(h)
    const nav = doc.createElement('nav')
    appendLinks(doc, nav, column.links)
    col.appendChild(nav)
    top.appendChild(col)
  }
  wrap.appendChild(top)

  if (footer.copyright) {
    const cr = doc.createElement('p')
    cr.className = 'zyad-tenant-footer__copyright'
    cr.textContent = footer.copyright
    wrap.appendChild(cr)
  }

  // Any class/style the author added via the Style Manager stays intact —
  // nothing to strip here (the footer has no per-page presentation attribute).
  slot.replaceChildren(wrap)
}

function fillPricing(doc: Document, slot: Element, plans: GrapesChromePricingPlan[]) {
  const wrap = doc.createElement('div')
  wrap.className = 'zyad-pricing-plans'
  const grid = doc.createElement('div')
  grid.className = 'zyad-pricing-plans__grid'

  for (const plan of plans) {
    const card = doc.createElement('div')
    card.className = plan.isFeatured
      ? 'zyad-pricing-plans__card zyad-pricing-plans__card--featured'
      : 'zyad-pricing-plans__card'

    if (plan.isFeatured) {
      const badge = doc.createElement('span')
      badge.className = 'zyad-pricing-plans__badge'
      badge.textContent = 'Populer'
      card.appendChild(badge)
    }

    const name = doc.createElement('p')
    name.className = 'zyad-pricing-plans__name'
    name.textContent = plan.name
    card.appendChild(name)

    const price = doc.createElement('p')
    price.className = 'zyad-pricing-plans__price'
    price.textContent = plan.priceLabel
    if (plan.intervalLabel) {
      const interval = doc.createElement('span')
      interval.className = 'zyad-pricing-plans__interval'
      interval.textContent = ` ${plan.intervalLabel}`
      price.appendChild(interval)
    }
    card.appendChild(price)

    if (plan.description) {
      const desc = doc.createElement('p')
      desc.className = 'zyad-pricing-plans__desc'
      desc.textContent = plan.description
      card.appendChild(desc)
    }

    if (plan.features.length) {
      const list = doc.createElement('ul')
      list.className = 'zyad-pricing-plans__features'
      for (const feature of plan.features) {
        if (!feature) continue
        const li = doc.createElement('li')
        li.textContent = feature
        list.appendChild(li)
      }
      card.appendChild(list)
    }

    if (plan.ctaLabel) {
      const cta = doc.createElement('a')
      cta.className = 'zyad-pricing-plans__cta'
      cta.setAttribute('href', safeHref(plan.ctaUrl || ''))
      cta.textContent = plan.ctaLabel
      card.appendChild(cta)
    }

    grid.appendChild(card)
  }

  wrap.appendChild(grid)
  slot.replaceChildren(wrap)
}

/**
 * A tenant-chrome sentinel is meant to appear at most once per page (dropping
 * "Header tenant" / "Footer tenant" twice is a builder mistake, guarded against
 * in GrapesEditor.vue). Defensively, only the first match is filled here — any
 * extra sentinel is dropped so an already-duplicated document self-heals
 * instead of rendering the header/footer twice.
 */
function firstSlotDroppingRest(list: ArrayLike<Element>): Element | null {
  const [first, ...rest] = Array.from(list)
  rest.forEach((el) => el.remove())
  return first ?? null
}

/**
 * Sanitise, hydrate the footer/pricing data-zyad-slot sentinels from live
 * chrome data, and — crucially — REMOVE the tenant-nav (header) sentinel
 * entirely rather than filling it. The header is rendered separately, as a
 * real Vue element in this component's own template (see `headerPresentation`
 * below), not as markup embedded in the iframe: the iframe's document never
 * scrolls internally (it's auto-height, sized to its content), so CSS
 * `position: sticky`/`fixed` on anything inside it has no visible effect —
 * only an element genuinely living in the SPA's document (which the browser
 * really does scroll) can be sticky/fixed. This also lets a real
 * `window.scroll` listener drive the hide-on-scroll animation, which
 * couldn't run inside the iframe either (sandboxed without `allow-scripts`).
 */
const processed = computed<{ html: string; header: HeaderPresentation | null }>(() => {
  const clean = DOMPurify.sanitize(props.html || '', {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
  })

  const parsed = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html')

  let header: HeaderPresentation | null = null
  const navSlot = firstSlotDroppingRest(
    parsed.body.querySelectorAll('[data-zyad-slot="tenant-nav"]'),
  )
  if (navSlot) {
    header = readHeaderPresentation(navSlot)
    navSlot.remove()
  }

  const chrome = props.chrome
  if (chrome?.footer) {
    const slot = firstSlotDroppingRest(
      parsed.body.querySelectorAll('[data-zyad-slot="tenant-footer"]'),
    )
    if (slot) fillFooter(parsed, slot, chrome.footer)
  }
  if (chrome?.pricingPlans?.length) {
    const slot = firstSlotDroppingRest(
      parsed.body.querySelectorAll('[data-zyad-slot="pricing-plans"]'),
    )
    if (slot) fillPricing(parsed, slot, chrome.pricingPlans)
  }

  return { html: parsed.body.innerHTML, header }
})

const bodyHtml = computed(() => processed.value.html)
const headerPresentation = computed(() => processed.value.header)

const headerClasses = computed(() => {
  const p = headerPresentation.value
  if (!p) return []
  return [
    `zyad-tenant-header--${p.variant}`,
    `zyad-tenant-header--${p.layout}`,
    p.layout === 'grouped' ? `zyad-tenant-header--group-${p.groupAlign}` : '',
    p.position === 'sticky' ? 'zyad-tenant-header--sticky' : '',
    p.position === 'fixed' ? 'zyad-tenant-header--fixed' : '',
    p.container ? 'zyad-tenant-header--container' : '',
    p.hideOnScroll && headerHidden.value ? 'zyad-tenant-header--hidden' : '',
  ].filter(Boolean)
})

function headerLinkTarget(link: GrapesChromeLink): '_blank' | undefined {
  return link.target === 'new_tab' || link.target === '_blank' ? '_blank' : undefined
}

// CSS custom properties, not a direct inline `color`, so the shared
// .zyad-tenant-header__nav a rule (and its :hover) still apply — Vue's style
// binding sets one property's value directly, it can't inject other
// declarations even if the stored string were malformed.
const headerStyleVars = computed(() => {
  const p = headerPresentation.value
  if (!p) return {}
  return {
    '--zyad-header-brand-color': p.brandColor,
    '--zyad-header-nav-color': p.navColor,
  }
})

const CHROME_CSS = `
.zyad-tenant-footer{padding:48px 24px;background:#0f172a;color:#cbd5e1;font-size:14px}
.zyad-tenant-footer__top{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between}
.zyad-tenant-footer__brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:16px}
.zyad-tenant-footer__brand img{height:28px;width:auto}
.zyad-tenant-footer__title{color:#fff;font-weight:600;margin:0 0 10px}
.zyad-tenant-footer__col nav{display:flex;flex-direction:column;gap:6px}
.zyad-tenant-footer__col a{color:#cbd5e1;text-decoration:none}
.zyad-tenant-footer__col a:hover{color:#fff}
.zyad-tenant-footer__copyright{max-width:1120px;margin:28px auto 0;border-top:1px solid #1e293b;padding-top:16px;font-size:13px}
.zyad-pricing-plans{padding:64px 24px;font-family:'Inter','Segoe UI',system-ui,sans-serif}
.zyad-pricing-plans__grid{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.zyad-pricing-plans__card{padding:32px 28px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}
.zyad-pricing-plans__card--featured{border-color:#465fff;box-shadow:0 12px 32px rgba(70,95,255,.16)}
.zyad-pricing-plans__badge{display:inline-block;margin:0 0 12px;padding:4px 10px;border-radius:999px;background:#465fff;color:#fff;font-size:12px;font-weight:600}
.zyad-pricing-plans__name{margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a}
.zyad-pricing-plans__price{margin:0 0 4px;font-size:32px;font-weight:800;color:#0f172a}
.zyad-pricing-plans__interval{font-size:14px;font-weight:500;color:#64748b}
.zyad-pricing-plans__desc{margin:8px 0 20px;font-size:14px;color:#475569}
.zyad-pricing-plans__features{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px;color:#334155}
.zyad-pricing-plans__cta{display:block;text-align:center;padding:11px 20px;border-radius:10px;background:#465fff;color:#fff;font-weight:600;text-decoration:none}
.zyad-pricing-plans__card--featured .zyad-pricing-plans__cta{background:#2563eb}
`.trim()

const srcdoc = computed(
  () => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_parent">
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
img,video,iframe{max-width:100%}
${CHROME_CSS}
${scrubCss(props.css || '')}
</style>
</head>
<body>
${bodyHtml.value}
</body>
</html>`,
)

const headerHidden = ref(false)
let lastScrollY = 0

function handleHeaderScroll() {
  if (!headerPresentation.value?.hideOnScroll) return
  const y = window.scrollY
  const delta = y - lastScrollY
  if (Math.abs(delta) < 4) return
  headerHidden.value = delta > 0 && y > 80
  lastScrollY = y
}

function measure() {
  const doc = frameRef.value?.contentDocument
  if (!doc) return
  const height = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0)
  if (height > 0) frameHeight.value = height
}

function syncHeight() {
  const frame = frameRef.value
  const doc = frame?.contentDocument
  if (!frame || !doc) return
  measure()

  // Re-observe the fresh document (srcdoc reload replaces it).
  resizeObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined' && doc.body) {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(doc.body)
  }
  // Late layout (web fonts, images) can land after load fires.
  settleTimers.forEach(clearTimeout)
  settleTimers = [200, 600, 1500].map((ms) => setTimeout(measure, ms))
}

onMounted(() => {
  window.addEventListener('resize', measure)
  window.addEventListener('scroll', handleHeaderScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', handleHeaderScroll)
  resizeObserver?.disconnect()
  resizeObserver = null
  settleTimers.forEach(clearTimeout)
})

watch(srcdoc, () => {
  // srcdoc change triggers a fresh load → @load will call syncHeight again.
})
</script>

<template>
  <header
    v-if="headerPresentation"
    class="zyad-tenant-header"
    :class="headerClasses"
    :style="headerStyleVars"
  >
    <div class="zyad-tenant-header__inner">
      <a class="zyad-tenant-header__brand" href="/">
        <img
          v-if="chrome?.brand?.logoUrl"
          :src="safeHref(chrome.brand.logoUrl)"
          :alt="chrome?.brand?.name || ''"
        />
        <span v-if="chrome?.brand?.name">{{ chrome.brand.name }}</span>
      </a>
      <nav class="zyad-tenant-header__nav">
        <a
          v-for="(link, i) in chrome?.nav ?? []"
          :key="i"
          :href="safeHref(link.href)"
          :target="headerLinkTarget(link)"
          :rel="headerLinkTarget(link) ? 'noopener noreferrer' : undefined"
        >
          {{ link.label }}
        </a>
      </nav>
      <a
        v-if="
          headerPresentation.showAction &&
          (headerPresentation.actionLabel || headerPresentation.actionUrl)
        "
        class="zyad-tenant-header__action"
        :href="safeHref(headerPresentation.actionUrl)"
      >
        {{ headerPresentation.actionLabel || 'Masuk' }}
      </a>
    </div>
  </header>
  <iframe
    ref="frameRef"
    class="grapes-page-frame"
    :title="title || 'Landing page'"
    :srcdoc="srcdoc"
    sandbox="allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    referrerpolicy="no-referrer"
    loading="eager"
    :style="{ height: frameHeight + 'px' }"
    @load="syncHeight"
  />
</template>

<style scoped>
.grapes-page-frame {
  display: block;
  width: 100%;
  border: 0;
  overflow: hidden;
  background: #ffffff;
}

.zyad-tenant-header {
  padding: 14px 24px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  transition: transform 0.25s ease;
}
.zyad-tenant-header--hidden {
  transform: translateY(-100%);
}
.zyad-tenant-header--solid {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.zyad-tenant-header--glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
}
.zyad-tenant-header--transparent {
  background: transparent;
}
.zyad-tenant-header--sticky {
  position: sticky;
  top: 0;
  z-index: 50;
}
.zyad-tenant-header--fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}
.zyad-tenant-header__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
}
.zyad-tenant-header--container .zyad-tenant-header__inner {
  max-width: 1120px;
  margin: 0 auto;
}
.zyad-tenant-header--group-left .zyad-tenant-header__inner {
  justify-content: flex-start;
}
.zyad-tenant-header--group-center .zyad-tenant-header__inner {
  justify-content: center;
}
.zyad-tenant-header--group-right .zyad-tenant-header__inner {
  justify-content: flex-end;
}
.zyad-tenant-header--split .zyad-tenant-header__nav {
  margin-left: auto;
}
.zyad-tenant-header--spread .zyad-tenant-header__nav {
  flex: 1;
  justify-content: center;
}
.zyad-tenant-header__brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--zyad-header-brand-color, #0f172a);
  text-decoration: none;
  font-size: 16px;
}
.zyad-tenant-header__brand img {
  height: 28px;
  width: auto;
  display: block;
}
.zyad-tenant-header__nav {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}
.zyad-tenant-header__nav a {
  color: var(--zyad-header-nav-color, #475569);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
.zyad-tenant-header__nav a:hover {
  color: #465fff;
}
.zyad-tenant-header__action {
  display: inline-block;
  flex: 0 0 auto;
  padding: 9px 18px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
}
</style>
