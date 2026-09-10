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
 *
 * Live tenant chrome: the editor drops sentinel `<div data-zyad-slot="tenant-nav">`
 * / `"tenant-footer"` blocks. Their innerHTML is (re)built here from the
 * resolve response's live menu + branding data — so editing the tenant menu
 * shows on every GrapesJS page immediately, without re-publishing. Markup is
 * assembled with DOM APIs (textContent + setAttribute), never innerHTML from a
 * user string, so no extra sanitiser is needed.
 */

export interface GrapesChromeLink {
  label: string
  href: string
  target?: string
}
export interface GrapesChrome {
  nav?: GrapesChromeLink[]
  footer?: {
    brandName?: string
    logoUrl?: string
    copyright?: string
    columns?: { title: string; links: GrapesChromeLink[] }[]
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

function fillNav(doc: Document, slot: Element, nav: GrapesChromeLink[]) {
  const el = doc.createElement('nav')
  el.className = 'zyad-tenant-nav'
  appendLinks(doc, el, nav)
  slot.removeAttribute('style')
  slot.setAttribute('class', 'zyad-slot zyad-slot--nav')
  slot.replaceChildren(el)
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

  slot.removeAttribute('style')
  slot.setAttribute('class', 'zyad-slot zyad-slot--footer')
  slot.replaceChildren(wrap)
}

/** Sanitise, then hydrate the data-zyad-slot sentinels from live chrome data. */
const bodyHtml = computed(() => {
  const clean = DOMPurify.sanitize(props.html || '', {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
  })

  const chrome = props.chrome
  if (!chrome || (!chrome.nav?.length && !chrome.footer)) return clean

  const parsed = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html')
  if (chrome.nav?.length) {
    parsed.body
      .querySelectorAll('[data-zyad-slot="tenant-nav"]')
      .forEach((slot) => fillNav(parsed, slot, chrome.nav as GrapesChromeLink[]))
  }
  if (chrome.footer) {
    parsed.body
      .querySelectorAll('[data-zyad-slot="tenant-footer"]')
      .forEach((slot) => fillFooter(parsed, slot, chrome.footer!))
  }
  return parsed.body.innerHTML
})

const CHROME_CSS = `
.zyad-tenant-nav{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;padding:16px 24px;border-bottom:1px solid #e2e8f0}
.zyad-tenant-nav a{color:#0f172a;text-decoration:none;font-size:14px;font-weight:500}
.zyad-tenant-nav a:hover{color:#465fff}
.zyad-tenant-footer{padding:48px 24px;background:#0f172a;color:#cbd5e1;font-size:14px}
.zyad-tenant-footer__top{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between}
.zyad-tenant-footer__brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:16px}
.zyad-tenant-footer__brand img{height:28px;width:auto}
.zyad-tenant-footer__title{color:#fff;font-weight:600;margin:0 0 10px}
.zyad-tenant-footer__col nav{display:flex;flex-direction:column;gap:6px}
.zyad-tenant-footer__col a{color:#cbd5e1;text-decoration:none}
.zyad-tenant-footer__col a:hover{color:#fff}
.zyad-tenant-footer__copyright{max-width:1120px;margin:28px auto 0;border-top:1px solid #1e293b;padding-top:16px;font-size:13px}
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
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  resizeObserver?.disconnect()
  resizeObserver = null
  settleTimers.forEach(clearTimeout)
})

watch(srcdoc, () => {
  // srcdoc change triggers a fresh load → @load will call syncHeight again.
})
</script>

<template>
  <iframe
    ref="frameRef"
    class="grapes-page-frame"
    :title="title || 'Landing page'"
    :srcdoc="srcdoc"
    sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
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
</style>
