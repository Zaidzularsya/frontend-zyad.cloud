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
 */

const props = defineProps<{
  html: string
  css: string
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

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(props.html || '', {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
  }),
)

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
${scrubCss(props.css || '')}
</style>
</head>
<body>
${sanitizedHtml.value}
</body>
</html>`,
)

function syncHeight() {
  const frame = frameRef.value
  const doc = frame?.contentDocument
  if (!frame || !doc) return
  const height = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0)
  if (height > 0) frameHeight.value = height

  // Re-observe the fresh document (srcdoc reload replaces it).
  resizeObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined' && doc.body) {
    resizeObserver = new ResizeObserver(() => syncHeight())
    resizeObserver.observe(doc.body)
  }
  // Late layout (web fonts, images) can land after load fires.
  settleTimers.forEach(clearTimeout)
  settleTimers = [200, 600, 1500].map((ms) => setTimeout(() => measureOnly(), ms))
}

function measureOnly() {
  const doc = frameRef.value?.contentDocument
  if (!doc) return
  const height = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0)
  if (height > 0) frameHeight.value = height
}

onMounted(() => {
  window.addEventListener('resize', measureOnly)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureOnly)
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
