<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'

interface FloatingBadge {
  icon?: string
  label: string
}

const props = defineProps<{
  content: {
    badge?: string
    eyebrow?: string
    titleHtml?: string
    title?: string
    description?: string
    primaryCta?: string
    secondaryCta?: string
    primaryCtaUrl?: string
    secondaryCtaUrl?: string
    floatingBadges?: FloatingBadge[]
  }
}>()

const badgeText = computed(() => props.content.badge || props.content.eyebrow)

/**
 * titleHtml berasal dari konten admin (sudah disanitasi backend), tapi tetap
 * dibersihkan di sisi client: hanya izinkan tag inline sederhana tanpa atribut
 * event/javascript.
 */
const safeTitleHtml = computed(() => {
  const raw = props.content.titleHtml || ''
  if (!raw) return ''
  return raw
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
})

const titleText = computed(() =>
  (props.content.titleHtml || props.content.title || '').replace(/<[^>]*>/g, ''),
)

const floatingBadges = computed<FloatingBadge[]>(() =>
  (props.content.floatingBadges ?? []).filter((item) => item.label),
)

const badgePositions = [
  'left-0 top-[8%] -translate-x-1/3',
  'right-0 top-[4%] translate-x-1/4',
  'left-0 top-[46%] -translate-x-1/2',
  'right-0 top-[42%] translate-x-1/3',
  'left-0 bottom-[12%] -translate-x-1/4',
  'right-0 bottom-[8%] translate-x-1/4',
]

function isExternalUrl(url?: string) {
  if (!url) return false
  return /^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('wa.me')
}

const isMobile = ref(false)
const hasWebGL = ref(false)
const isLowSpec = ref(false)
const userWants3D = ref(false)

const ThreeJSHero = defineAsyncComponent(() => import('./ThreeJSHero.vue'))

// Parallax: layer background bergerak lebih lambat dari konten saat scroll.
const parallaxOffset = ref(0)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    parallaxOffset.value = window.scrollY
    ticking = false
  })
}

const prefersReducedMotion = ref(false)

const auroraStyle = computed(() => ({
  transform: `translate3d(0, ${prefersReducedMotion.value ? 0 : parallaxOffset.value * 0.18}px, 0)`,
}))
const gridStyle = computed(() => ({
  transform: `translate3d(0, ${prefersReducedMotion.value ? 0 : parallaxOffset.value * 0.08}px, 0)`,
}))
const visualStyle = computed(() => ({
  transform: `translate3d(0, ${prefersReducedMotion.value ? 0 : parallaxOffset.value * -0.06}px, 0)`,
}))

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  try {
    const canvas = document.createElement('canvas')
    hasWebGL.value = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    hasWebGL.value = false
  }

  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  handleResize()
  window.addEventListener('resize', handleResize)

  const evaluateHardware = () => {
    if (
      'deviceMemory' in navigator &&
      typeof navigator.deviceMemory === 'number' &&
      navigator.deviceMemory < 4
    )
      return true
    if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4) return true
    return false
  }
  isLowSpec.value = evaluateHardware()

  window.addEventListener('scroll', onScroll, { passive: true })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', onScroll)
  })
})
</script>

<template>
  <section
    id="hero"
    class="relative flex min-h-screen items-center overflow-hidden bg-surface pt-[80px]"
  >
    <!-- Layer 1: aurora animated background (parallax lambat) -->
    <div class="absolute inset-0 pointer-events-none" :style="auroraStyle" aria-hidden="true">
      <div
        class="aurora-blob left-[-10%] top-[-15%] h-[560px] w-[560px] bg-secondary/20 dark:bg-secondary/25"
      ></div>
      <div
        class="aurora-blob right-[-12%] top-[5%] h-[480px] w-[480px] bg-tertiary-fixed-dim/25 dark:bg-tertiary-fixed-dim/15"
        style="animation-delay: -6s"
      ></div>
      <div
        class="aurora-blob bottom-[-20%] left-[25%] h-[520px] w-[520px] bg-primary-fixed/40 dark:bg-secondary-container/20"
        style="animation-delay: -12s"
      ></div>
    </div>

    <!-- Layer 2: dot grid pattern (parallax lebih lambat) -->
    <div
      class="bg-grid-dots absolute inset-0 pointer-events-none opacity-70"
      :style="gridStyle"
      aria-hidden="true"
    ></div>

    <div
      class="relative z-10 mx-auto w-full max-w-7xl px-margin-mobile py-section-gap md:px-margin-desktop"
    >
      <div class="grid grid-cols-1 items-center gap-gutter lg:grid-cols-12">
        <!-- Left: copy -->
        <div class="fade-up flex flex-col gap-stack-lg lg:col-span-6">
          <div
            v-if="badgeText"
            class="inline-flex items-center gap-2 self-start rounded-full border border-secondary/20 bg-secondary-fixed/30 px-3.5 py-1.5 font-label-sm text-xs font-semibold text-secondary shadow-sm backdrop-blur-sm dark:bg-secondary/10"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75"
              ></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-secondary"></span>
            </span>
            {{ badgeText }}
          </div>

          <!-- eslint-disable vue/no-v-html -- konten admin tersanitasi backend + allowlist regex di safeTitleHtml -->
          <h1
            v-if="safeTitleHtml"
            class="font-display-xl text-display-xl text-primary"
            aria-label="Hero heading"
            v-html="safeTitleHtml"
          ></h1>
          <!-- eslint-enable vue/no-v-html -->
          <h1 v-else class="font-display-xl text-display-xl text-primary" aria-label="Hero heading">
            {{ titleText }}
          </h1>

          <p class="max-w-xl font-body-lg text-body-lg text-on-surface-variant">
            {{ content.description }}
          </p>

          <div class="flex flex-col gap-stack-md pt-4 sm:flex-row">
            <a
              :href="content.primaryCtaUrl || '#contact'"
              :target="isExternalUrl(content.primaryCtaUrl) ? '_blank' : undefined"
              :rel="isExternalUrl(content.primaryCtaUrl) ? 'noopener noreferrer' : undefined"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-8 py-4 text-center font-label-sm text-label-sm text-on-secondary shadow-lg shadow-secondary/25 transition-all hover:-translate-y-1 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/30"
            >
              {{ content.primaryCta || 'Get started' }}
              <span class="material-symbols-outlined text-lg">arrow_forward</span>
            </a>
            <a
              :href="content.secondaryCtaUrl || '#features'"
              :target="isExternalUrl(content.secondaryCtaUrl) ? '_blank' : undefined"
              :rel="isExternalUrl(content.secondaryCtaUrl) ? 'noopener noreferrer' : undefined"
              class="inline-flex items-center justify-center rounded-xl border-2 border-outline bg-surface/60 px-8 py-4 text-center font-label-sm text-label-sm text-on-surface backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-secondary hover:text-secondary"
            >
              {{ content.secondaryCta || 'Learn more' }}
            </a>
          </div>
        </div>

        <!-- Right: visual (parallax berlawanan arah, lebih pelan) -->
        <div
          class="fade-up relative mt-12 h-[500px] w-full lg:col-span-6 lg:mt-0"
          style="transition-delay: 200ms"
        >
          <div class="absolute inset-0" :style="visualStyle">
            <div
              class="glass-panel absolute inset-0 overflow-hidden rounded-3xl border border-white/40 shadow-2xl"
            >
              <div class="absolute inset-0 block h-full w-full">
                <template v-if="hasWebGL && (isMobile ? userWants3D : !isLowSpec)">
                  <Suspense>
                    <template #default>
                      <ThreeJSHero />
                    </template>
                    <template #fallback>
                      <div
                        class="absolute inset-0 flex items-center justify-center rounded-3xl bg-surface-container-low/40 backdrop-blur-md"
                      >
                        <div class="flex flex-col items-center gap-4">
                          <div
                            class="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent"
                          ></div>
                          <span class="font-label-sm text-xs text-on-surface-variant">
                            Memuat Visual 3D...
                          </span>
                        </div>
                      </div>
                    </template>
                  </Suspense>
                </template>
                <template v-else>
                  <div
                    class="relative flex h-full min-h-[400px] w-full items-center justify-center overflow-hidden"
                  >
                    <svg
                      viewBox="0 0 500 500"
                      class="pointer-events-none h-full w-full max-h-[450px] max-w-[450px] select-none opacity-85"
                    >
                      <circle
                        cx="250"
                        cy="250"
                        r="170"
                        fill="none"
                        stroke="var(--color-secondary)"
                        stroke-width="1.5"
                        stroke-dasharray="5 10"
                        stroke-opacity="0.25"
                        class="animate-spin"
                        style="animation-duration: 80s; transform-origin: 250px 250px"
                      />
                      <circle
                        cx="250"
                        cy="250"
                        r="120"
                        fill="none"
                        stroke="var(--color-tertiary-fixed-dim)"
                        stroke-width="1"
                        stroke-dasharray="3 8"
                        stroke-opacity="0.35"
                        class="animate-spin"
                        style="
                          animation-duration: 60s;
                          animation-direction: reverse;
                          transform-origin: 250px 250px;
                        "
                      />
                    </svg>
                  </div>
                </template>
              </div>

              <button
                v-if="isMobile && hasWebGL"
                class="z-35 absolute bottom-4 left-1/2 flex -translate-x-1/2 cursor-pointer select-none items-center gap-2 rounded-full border border-outline-variant/30 bg-surface/90 px-4 py-2 text-xs font-semibold text-on-surface shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:text-secondary active:scale-95 dark:bg-surface-dim/90"
                @click="userWants3D = !userWants3D"
              >
                <span class="material-symbols-outlined text-sm">
                  {{ userWants3D ? 'image' : '3d_rotation' }}
                </span>
                {{ userWants3D ? 'Ganti Mode 2D' : 'Aktifkan Mode 3D' }}
              </button>
            </div>

            <!-- Floating module badges (content-driven) -->
            <div
              v-for="(item, index) in floatingBadges.slice(0, badgePositions.length)"
              :key="item.label"
              class="animate-float absolute z-20 hidden items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface/95 px-4 py-2 text-on-surface shadow-lg backdrop-blur-sm sm:flex"
              :class="badgePositions[index]"
              :style="{
                animationDelay: `${index * 0.7}s`,
                animationDuration: `${5 + (index % 3)}s`,
              }"
            >
              <span v-if="item.icon" class="material-symbols-outlined text-lg text-secondary">
                {{ item.icon }}
              </span>
              <span class="font-label-sm text-xs font-semibold">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll hint -->
    <a
      href="#problem"
      class="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-on-surface-variant transition-colors hover:text-secondary md:flex"
      aria-label="Scroll ke bawah"
    >
      <span class="font-label-sm text-[11px] uppercase tracking-[0.2em]">Scroll</span>
      <span class="material-symbols-outlined animate-scroll-hint">keyboard_arrow_down</span>
    </a>
  </section>
</template>
