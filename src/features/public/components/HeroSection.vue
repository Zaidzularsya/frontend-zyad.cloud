<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'

defineProps<{
  content: {
    badge?: string
    titleHtml: string
    description: string
    primaryCta: string
    secondaryCta: string
    primaryCtaUrl: string
    secondaryCtaUrl: string
  }
}>()

const isMobile = ref(false)
const hasWebGL = ref(false)
const isLowSpec = ref(false)
const userWants3D = ref(false)

const ThreeJSHero = defineAsyncComponent(() => import('./ThreeJSHero.vue'))

onMounted(() => {
  // WebGL support detection
  try {
    const canvas = document.createElement('canvas')
    hasWebGL.value = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    hasWebGL.value = false
  }

  // Mobile detection
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  handleResize()
  window.addEventListener('resize', handleResize)

  // Hardware detection
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

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<template>
  <section
    id="demo"
    class="relative min-h-[921px] flex items-center overflow-hidden bg-gradient-to-br from-surface to-surface-container-low pt-[80px]"
  >
    <!-- Abstract Background Shapes -->
    <div
      class="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-secondary-fixed/20 rounded-full blur-3xl opacity-50 pointer-events-none"
    ></div>
    <div
      class="absolute bottom-0 left-0 -ml-40 -mb-40 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-3xl opacity-50 pointer-events-none"
    ></div>

    <div
      class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop w-full py-section-gap relative z-10"
    >
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
        <!-- Left Content Side -->
        <div class="lg:col-span-6 flex flex-col gap-stack-lg fade-up visible">
          <div
            v-if="content.badge"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-fixed/30 border border-secondary/20 text-secondary font-label-sm text-xs font-semibold self-start shadow-sm"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            {{ content.badge }}
          </div>

          <h1
            class="font-display-xl text-display-xl text-primary"
            aria-label="Hero heading"
            v-html="content.titleHtml"
          ></h1>

          <p class="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            {{ content.description }}
          </p>

          <div class="flex flex-col sm:flex-row gap-stack-md pt-4">
            <a
              :href="content.primaryCtaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center px-8 py-4 bg-secondary text-on-secondary font-label-sm text-label-sm rounded-lg hover:bg-secondary/90 transition-all hover:-translate-y-1 shadow-lg shadow-secondary/20 text-center"
            >
              {{ content.primaryCta }}
            </a>
            <a
              :href="content.secondaryCtaUrl"
              class="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-outline text-on-surface font-label-sm text-label-sm rounded-lg hover:border-secondary hover:text-secondary transition-all hover:-translate-y-1 text-center"
            >
              {{ content.secondaryCta }}
            </a>
          </div>
        </div>

        <!-- Right Visual Side -->
        <div
          class="lg:col-span-6 relative h-[500px] w-full mt-12 lg:mt-0 fade-up visible"
          style="transition-delay: 200ms"
        >
          <div
            class="absolute inset-0 glass-panel rounded-2xl shadow-2xl overflow-hidden border border-white/40 transform rotate-1 hover:rotate-0 transition-transform duration-500"
          >
            <div class="absolute inset-0 w-full h-full block">
              <template v-if="hasWebGL && (isMobile ? userWants3D : !isLowSpec)">
                <Suspense>
                  <template #default>
                    <ThreeJSHero />
                  </template>
                  <template #fallback>
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-surface-container-low/40 backdrop-blur-md rounded-2xl border border-white/20"
                    >
                      <div class="flex flex-col items-center gap-4">
                        <div
                          class="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin"
                        ></div>
                        <span class="font-label-sm text-label-sm text-on-surface-variant text-xs"
                          >Memuat Visual 3D...</span
                        >
                      </div>
                    </div>
                  </template>
                </Suspense>
              </template>
              <template v-else>
                <div
                  class="relative w-full h-full min-h-[400px] flex items-center justify-center overflow-hidden"
                >
                  <svg
                    viewBox="0 0 500 500"
                    class="w-full h-full max-w-[450px] max-h-[450px] opacity-85 select-none pointer-events-none"
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
                  </svg>
                </div>
              </template>
            </div>

            <button
              v-if="isMobile && hasWebGL"
              class="absolute bottom-4 left-1/2 -translate-x-1/2 z-35 bg-surface/90 dark:bg-surface-dim/90 backdrop-blur-md text-on-surface hover:text-secondary border border-outline-variant/30 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer select-none"
              @click="userWants3D = !userWants3D"
            >
              <span class="material-symbols-outlined text-sm">
                {{ userWants3D ? 'image' : '3d_rotation' }}
              </span>
              {{ userWants3D ? 'Ganti Mode 2D' : 'Aktifkan Mode 3D' }}
            </button>
          </div>

          <!-- Floating Tech Badges (6 Solusi HEY) -->
          <!-- 1. Website & Company Profile -->
          <div
            class="absolute -left-8 top-[10%] bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden sm:flex"
            style="animation-duration: 4s"
          >
            <span class="material-symbols-outlined text-secondary text-lg">web</span>
            <span class="font-label-sm text-label-sm text-xs font-semibold"
              >Website &amp; Company Profile</span
            >
          </div>

          <!-- 2. Custom Dashboard -->
          <div
            class="absolute -right-10 top-[5%] bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden sm:flex"
            style="animation-duration: 3.5s; animation-delay: 0.5s"
          >
            <span class="material-symbols-outlined text-secondary text-lg">dashboard</span>
            <span class="font-label-sm text-label-sm text-xs font-semibold">Custom Dashboard</span>
          </div>

          <!-- 3. Sistem Registrasi & Tiketing -->
          <div
            class="absolute -left-16 top-[45%] -translate-y-1/2 bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden md:flex"
            style="animation-duration: 4.5s; animation-delay: 1s"
          >
            <span class="material-symbols-outlined text-secondary text-lg"
              >confirmation_number</span
            >
            <span class="font-label-sm text-label-sm text-xs font-semibold"
              >Sistem Registrasi &amp; Tiketing</span
            >
          </div>

          <!-- 4. WhatsApp Automation -->
          <div
            class="absolute -right-12 top-[40%] -translate-y-1/2 bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden md:flex"
            style="animation-duration: 3.8s; animation-delay: 1.5s"
          >
            <span class="material-symbols-outlined text-secondary text-lg">chat</span>
            <span class="font-label-sm text-label-sm text-xs font-semibold"
              >WhatsApp Automation</span
            >
          </div>

          <!-- 5. AI Admin / Bot Custom -->
          <div
            class="absolute -left-6 bottom-[15%] bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden sm:flex"
            style="animation-duration: 4.2s; animation-delay: 2s"
          >
            <span class="material-symbols-outlined text-secondary text-lg">smart_toy</span>
            <span class="font-label-sm text-label-sm text-xs font-semibold"
              >AI Admin / Bot Custom</span
            >
          </div>

          <!-- 6. Reporting & Data Viz -->
          <div
            class="absolute -right-8 bottom-[10%] bg-surface/95 backdrop-blur-sm text-on-surface px-4 py-2 rounded-lg shadow-lg border border-outline-variant/30 flex items-center gap-2 animate-bounce z-20 hidden sm:flex"
            style="animation-duration: 3.6s; animation-delay: 2.5s"
          >
            <span class="material-symbols-outlined text-secondary text-lg">bar_chart</span>
            <span class="font-label-sm text-label-sm text-xs font-semibold"
              >Reporting &amp; Data Viz</span
            >
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
