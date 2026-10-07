<script lang="ts">
// Counter modul: tiap instance renderer punya id unik untuk <style data-zy-fonts>.
let instanceCounter = 0
// Key teleport harus unik lintas render, supaya teleport lama pasti di-unmount.
let targetCounter = 0
</script>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

import type { GrapesChrome } from '../grapes/chrome'
import { rewritePageCss } from '../grapes/page-css'
import { LANDING_PAGE_CONTEXT } from './page-context'
import { classifyLinkClick, hasAppRoute } from './link-handling'
import { SLOT_REGISTRY, slotStyles } from './slot-registry'
import baseCss from './base.css?inline'
import { createPageRuntime, defaultRuntimeEnv, type PageRuntime } from '../motion/page-runtime'
import motionCss from '../motion/zy-motion.css?inline'

/**
 * Renderer halaman GrapesJS di shadow root (pengganti <iframe srcdoc>).
 * HTML disanitasi DOMPurify dengan konfigurasi yang sama persis dengan
 * GrapesPageFrame; slot tenant (nav/footer/pricing) di-mount sebagai komponen
 * Vue lewat <Teleport> ke sentinel [data-zyad-slot].
 */

interface SlotTarget {
  key: number
  name: string
  host: HTMLElement
  dataset: Record<string, string>
}

const props = defineProps<{
  html: string
  css: string
  chrome?: GrapesChrome
  title?: string
}>()

const router = useRouter()
const hostRef = useTemplateRef<HTMLElement>('hostEl')
const slotTargets = shallowRef<SlotTarget[]>([])

const instanceId = String(++instanceCounter)
let root: ShadowRoot | null = null
let generation = 0
let rendered = false
let unmounted = false

// Runtime animasi (R5-S2): hidup dari selesai render sampai render ulang / unmount.
let runtime: PageRuntime | null = null
let slotObserver: MutationObserver | null = null

function stopRuntime() {
  slotObserver?.disconnect()
  slotObserver = null
  runtime?.stop()
  runtime = null
}

function startRuntime(page: HTMLElement) {
  const env = defaultRuntimeEnv()
  // Reduced motion: tidak ada observer/listener sama sekali; konten tetap di state akhir
  // karena state tersembunyi hanya berlaku di bawah `.zy-js`.
  if (env.reducedMotion) return
  runtime = createPageRuntime(page, env)
  runtime.start()
  // Slot Vue (mis. katalog yang dimuat async) menambah elemen setelah mount: amati hanya
  // penambahan elemen baru supaya animasi/counter di dalamnya ikut terpasang.
  if (typeof MutationObserver === 'function') {
    const rt = runtime
    slotObserver = new MutationObserver((records) => {
      if (records.some((r) => Array.from(r.addedNodes).some((n) => n.nodeType === 1))) {
        rt.refresh()
      }
    })
    slotObserver.observe(page, { childList: true, subtree: true })
  }
}

function removeFonts() {
  document.head.querySelectorAll(`style[data-zy-fonts="${instanceId}"]`).forEach((n) => n.remove())
}

function makeStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = css
  return style
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html || '', {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
  })
}

function hashId(hash: string): string {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function scrollToHash(smooth: boolean) {
  if (!root || location.hash.length < 2) return
  root
    .getElementById(hashId(location.hash))
    ?.scrollIntoView(smooth ? { behavior: 'smooth', block: 'start' } : undefined)
}

// Scroll anchor bersama untuk klik hash dan konteks halaman (slot).
function scrollToId(id: string) {
  const el = root?.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Pertahankan history.state milik vue-router (back/position/scroll).
  history.replaceState(history.state, '', `#${id}`)
}

provide(LANDING_PAGE_CONTEXT, {
  orgType: computed(() => props.chrome?.orgType ?? ''),
  interest: ref(''),
  scrollToId,
})

function collectSlotTargets(page: Element): SlotTarget[] {
  const targets: SlotTarget[] = []
  for (const name of Object.keys(SLOT_REGISTRY)) {
    const sentinels = Array.from(page.querySelectorAll(`[data-zyad-slot="${name}"]`))
    const first = sentinels.shift()
    sentinels.forEach((s) => s.remove())
    if (!first) continue
    const dataset: Record<string, string> = { ...(first as HTMLElement).dataset } as Record<
      string,
      string
    >
    first.replaceChildren()
    targets.push({ key: ++targetCounter, name, host: first as HTMLElement, dataset })
  }
  return targets
}

async function render() {
  const token = ++generation
  const first = !rendered
  // 0. Hentikan runtime sebelum DOM lama diganti (listener/observer harus lepas dari node lama).
  stopRuntime()
  // 1. Lepas teleport lama, tunggu ter-unmount, baru bersihkan font.
  slotTargets.value = []
  removeFonts()
  if (!first) {
    await nextTick()
    // Render yang lebih baru atau unmount sudah mengambil alih.
    if (token !== generation || unmounted) return
    removeFonts()
  }
  const host = hostRef.value
  if (!host || unmounted) return

  // 2. Shadow root hanya dibuat sekali.
  root ??= host.attachShadow({ mode: 'open' })
  const { css, fontFaces } = rewritePageCss(props.css || '')
  const page = document.createElement('div')
  page.className = 'zy-page'
  page.innerHTML = sanitize(props.html)
  root.replaceChildren(makeStyle(`${baseCss}\n${motionCss}\n${slotStyles()}`), makeStyle(css), page)
  rendered = true

  // 3. Font tidak jalan di dalam shadow root: hoist ke head.
  if (fontFaces.trim()) {
    const style = makeStyle(fontFaces)
    style.setAttribute('data-zy-fonts', instanceId)
    document.head.appendChild(style)
  }

  // 4. Sentinel slot -> target teleport.
  slotTargets.value = collectSlotTargets(page)

  // 7. Hash di URL (mis. dibuka langsung di /#harga).
  scrollToHash(false)

  // 8. Nyalakan animasi setelah teleport slot ter-mount. Render yang tersela
  //    (token berubah / unmount) tidak boleh menyalakan runtime.
  await nextTick()
  if (token !== generation || unmounted) return
  startRuntime(page)
}

function onClick(event: Event) {
  const e = event as MouseEvent
  const anchor = e
    .composedPath()
    .find((n): n is HTMLAnchorElement => n instanceof Element && n.matches('a[href]'))
  if (!anchor) return
  const action = classifyLinkClick(
    e,
    anchor.getAttribute('href'),
    anchor.getAttribute('target'),
    anchor.hasAttribute('download'),
    location.href,
  )
  if (action.kind === 'hash') {
    e.preventDefault()
    scrollToId(action.id)
  } else if (action.kind === 'route' && hasAppRoute(router.resolve(action.path).matched)) {
    e.preventDefault()
    void router.push(action.path)
  }
}

onMounted(() => {
  void render()
  root?.addEventListener('click', onClick)
})

// Chrome tidak memicu render ulang: ia mengalir reaktif ke komponen slot lewat prop.
watch(
  () => [props.html, props.css],
  () => {
    void render()
  },
)

onBeforeUnmount(() => {
  unmounted = true
  generation++
  stopRuntime()
  root?.removeEventListener('click', onClick)
  removeFonts()
  slotTargets.value = []
})

defineExpose({ shadowRoot: (): ShadowRoot | null => root })
</script>

<template>
  <div ref="hostEl" class="zy-page-host" role="document" :aria-label="title || 'Landing page'">
    <Teleport v-for="t in slotTargets" :key="t.key" :to="t.host">
      <component
        :is="SLOT_REGISTRY[t.name]!.component"
        :host="t.host"
        :chrome="chrome ?? {}"
        :dataset="t.dataset"
      />
    </Teleport>
  </div>
</template>
