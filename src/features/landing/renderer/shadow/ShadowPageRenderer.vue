<script lang="ts">
// Counter modul: tiap instance renderer punya id unik untuk <style data-zy-fonts>.
let instanceCounter = 0
// Key teleport harus unik lintas render, supaya teleport lama pasti di-unmount.
let targetCounter = 0
</script>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { GrapesChrome } from '../grapes/chrome'
import { rewritePageCss } from '../grapes/page-css'
import { classifyLinkClick } from './link-handling'
import { SLOT_REGISTRY, slotStyles } from './slot-registry'
import baseCss from './base.css?inline'

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
  root.replaceChildren(makeStyle(`${baseCss}\n${slotStyles()}`), makeStyle(css), page)
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
    root?.getElementById(action.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${action.id}`)
  } else if (action.kind === 'route') {
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
