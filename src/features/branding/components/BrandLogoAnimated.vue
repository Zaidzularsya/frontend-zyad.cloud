<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BrandParticles from './BrandParticles.vue'

// Reveal branding "bounce pop" (port dari konsep video zyad_logo_final):
// tiga lobus cloud muncul berurutan dengan overshoot spring, dot melayang dengan
// pulse glow, wordmark ZYAD TECHNOVATION muncul per huruf, garis aksen, dan
// tagline sliding — di atas latar partikel.
const props = withDefaults(
  defineProps<{
    tagline?: string
    /** Mode compact: durasi/delay dipercepat untuk pemakaian in-page (hero). */
    compact?: boolean
  }>(),
  {
    tagline: 'IT Solutions · Web · SaaS Multi-Tenant',
    compact: false,
  },
)

const tsFactor = computed(() => (props.compact ? 0.55 : 1))
const wordmarkBaseDelay = computed(() => 2.6 * tsFactor.value)

interface WordmarkChar {
  char: string
  grad: boolean
  spacer: boolean
  delay: number
}

const wordmarkChars = computed<WordmarkChar[]>(() => {
  const parts = [
    { text: 'ZYAD', grad: false },
    { text: ' ', grad: false },
    { text: 'TECHNOVATION', grad: true },
  ]
  const chars: WordmarkChar[] = []
  let i = 0
  for (const part of parts) {
    for (const c of part.text) {
      chars.push({
        char: c,
        grad: part.grad,
        spacer: c === ' ',
        delay: wordmarkBaseDelay.value + i * 0.06,
      })
      i++
    }
  }
  return chars
})

const rootRef = ref<HTMLElement | null>(null)
const playing = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    playing.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        playing.value = true
        observer?.disconnect()
        observer = null
      }
    },
    { threshold: 0.35 },
  )
  if (rootRef.value) observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="rootRef"
    class="brand-reveal relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden bg-[#F6FAFF] px-6 py-10 dark:bg-[#04060C]"
    :class="{ playing }"
    :style="{ '--ts': tsFactor }"
  >
    <BrandParticles class="absolute inset-0" />

    <div class="relative w-[min(60%,300px)]">
      <div class="under-glow" aria-hidden="true"></div>
      <svg
        class="brand-logo block w-full overflow-visible"
        viewBox="0 0 540 270"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Logo Zyad Technovation"
      >
        <defs>
          <linearGradient id="animGradLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0B1F3A" />
          </linearGradient>
          <linearGradient id="animGradCenter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2DD4BF" />
            <stop offset="100%" stop-color="#0EA5E9" />
          </linearGradient>
          <linearGradient id="animGradRight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7DD3FC" />
            <stop offset="100%" stop-color="#14B8A6" />
          </linearGradient>
          <linearGradient id="animGradDot" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#22D3EE" />
            <stop offset="100%" stop-color="#14B8A6" />
          </linearGradient>
          <linearGradient id="animGradLeftD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7DD3FC" />
            <stop offset="100%" stop-color="#2563EB" />
          </linearGradient>
          <linearGradient id="animGradCenterD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5EEAD4" />
            <stop offset="100%" stop-color="#22D3EE" />
          </linearGradient>
          <linearGradient id="animGradRightD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BAE6FD" />
            <stop offset="100%" stop-color="#2DD4BF" />
          </linearGradient>
          <linearGradient id="animGradDotD" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#67E8F9" />
            <stop offset="100%" stop-color="#5EEAD4" />
          </linearGradient>
        </defs>

        <g class="float-group">
          <g class="lobe-pop pop-left">
            <path
              class="lobe lobe-left"
              d="M 50 240 L 210 240 A 20 20 0 0 0 230 220 L 230 215 A 100 100 0 0 0 30 215 L 30 220 A 20 20 0 0 0 50 240 Z"
            />
          </g>
          <g class="lobe-pop pop-center">
            <path
              class="lobe lobe-center"
              d="M 170 240 L 390 240 A 20 20 0 0 0 410 220 L 410 170 A 130 130 0 0 0 150 170 L 150 220 A 20 20 0 0 0 170 240 Z"
            />
          </g>
          <g class="lobe-pop pop-right">
            <path
              class="lobe lobe-right"
              d="M 351 240 L 489 240 A 16 16 0 0 0 505 224 L 505 215 A 85 85 0 0 0 335 215 L 335 224 A 16 16 0 0 0 351 240 Z"
            />
          </g>
          <g class="dot-pop">
            <circle class="dot" cx="445" cy="85" r="26" />
          </g>
        </g>
      </svg>
    </div>

    <div class="relative flex items-stretch gap-4">
      <div class="accent" aria-hidden="true"></div>
      <div class="flex flex-col justify-center gap-2.5">
        <div
          class="wordmark flex flex-wrap text-2xl font-bold leading-tight tracking-[2px] text-slate-900 dark:text-[#E5F3FF] md:text-3xl"
        >
          <template v-for="(item, idx) in wordmarkChars" :key="idx">
            <span v-if="item.spacer" class="w-[0.45em]"></span>
            <span
              v-else
              class="ch"
              :class="{ grad: item.grad }"
              :style="{ animationDelay: `${item.delay}s, ${item.delay}s` }"
              >{{ item.char }}</span
            >
          </template>
        </div>
        <div class="overflow-hidden">
          <div
            class="tagline text-[11px] uppercase leading-relaxed tracking-[3px] text-slate-500 dark:text-[#8FB6D9] md:text-[13px]"
          >
            {{ tagline }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Warna lobus mengikuti tema: gradient light default, gradient dark saat .dark aktif. */
.lobe-left {
  fill: url(#animGradLeft);
}
.lobe-center {
  fill: url(#animGradCenter);
}
.lobe-right {
  fill: url(#animGradRight);
}
.dot {
  fill: url(#animGradDot);
}
.dark .lobe-left {
  fill: url(#animGradLeftD);
}
.dark .lobe-center {
  fill: url(#animGradCenterD);
}
.dark .lobe-right {
  fill: url(#animGradRightD);
}
.dark .dot {
  fill: url(#animGradDotD);
}

/* Sebelum animasi dimulai, seluruh elemen reveal disembunyikan. */
.lobe-pop,
.dot-pop,
.ch {
  opacity: 0;
}
.accent {
  width: 4px;
  border-radius: 2px;
  background: linear-gradient(180deg, #7dd3fc, #2dd4bf);
  transform: scaleY(0);
  transform-origin: center;
}
.tagline {
  transform: translateX(-110%);
}

@keyframes popIn {
  0% {
    transform: scale(0);
  }
  55% {
    transform: scale(1.18);
  }
  75% {
    transform: scale(0.94);
  }
  90% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
@keyframes floatLobe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}
@keyframes dotPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.35);
  }
  70% {
    transform: scale(0.85);
  }
  85% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes dotPulse {
  0%,
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.55));
  }
  50% {
    transform: scale(1.16);
    filter: drop-shadow(0 0 18px rgba(103, 232, 249, 0.95));
  }
}
@keyframes glowIn {
  to {
    opacity: 1;
  }
}
@keyframes accentPop {
  0% {
    transform: scaleY(0);
  }
  55% {
    transform: scaleY(1.15);
  }
  80% {
    transform: scaleY(0.95);
  }
  100% {
    transform: scaleY(1);
  }
}
@keyframes chPop {
  0% {
    transform: scale(0);
  }
  55% {
    transform: scale(1.25);
  }
  75% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes tagSlide {
  to {
    transform: translateX(0);
  }
}

/* Rangkaian animasi hanya berjalan setelah komponen terlihat (.playing). */
.playing .lobe-pop {
  animation:
    popIn calc(0.9s * var(--ts)) cubic-bezier(0.3, 0.9, 0.4, 1) forwards,
    fadeIn 0.15s linear forwards;
  transform-origin: var(--ox) 240px;
}
.playing .pop-left {
  --ox: 130px;
  animation-delay: calc(0.4s * var(--ts)), calc(0.4s * var(--ts));
}
.playing .pop-center {
  --ox: 280px;
  animation-delay: calc(0.75s * var(--ts)), calc(0.75s * var(--ts));
}
.playing .pop-right {
  --ox: 420px;
  animation-delay: calc(1.1s * var(--ts)), calc(1.1s * var(--ts));
}
.playing .float-group {
  animation: floatLobe 5s ease-in-out infinite calc(3.2s * var(--ts));
}
.playing .dot-pop {
  transform-origin: 445px 85px;
  animation:
    dotPop calc(1s * var(--ts)) cubic-bezier(0.3, 0.9, 0.4, 1) forwards calc(1.7s * var(--ts)),
    fadeIn 0.1s linear forwards calc(1.7s * var(--ts));
}
.playing .dot {
  transform-origin: 445px 85px;
  animation: dotPulse 2.4s ease-in-out infinite calc(3.2s * var(--ts));
}
.playing .accent {
  animation: accentPop calc(0.7s * var(--ts)) cubic-bezier(0.3, 0.9, 0.4, 1) forwards
    calc(2.3s * var(--ts));
}
.playing .ch {
  display: inline-block;
  transform: scale(0);
  animation:
    chPop 0.55s cubic-bezier(0.3, 0.9, 0.4, 1) forwards,
    fadeIn 0.1s linear forwards;
}
.playing .tagline {
  animation: tagSlide 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards calc(4.1s * var(--ts));
}

.ch.grad {
  background: linear-gradient(90deg, #0284c7, #0d9488, #14b8a6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.dark .ch.grad {
  background: linear-gradient(90deg, #7dd3fc, #5eead4, #2dd4bf);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.under-glow {
  position: absolute;
  left: 50%;
  bottom: -6%;
  width: 70%;
  height: 26%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, rgba(45, 212, 191, 0.28), transparent 70%);
  filter: blur(16px);
  opacity: 0;
}
.playing .under-glow {
  animation: glowIn 1.2s ease-out forwards calc(2.2s * var(--ts));
}

/* Reduced motion: tampilkan hasil akhir tanpa animasi. */
@media (prefers-reduced-motion: reduce) {
  .lobe-pop,
  .dot-pop,
  .ch,
  .under-glow {
    opacity: 1 !important;
    animation: none !important;
    transform: none !important;
  }
  .accent {
    transform: scaleY(1);
    animation: none !important;
  }
  .tagline {
    transform: translateX(0);
    animation: none !important;
  }
  .float-group,
  .dot {
    animation: none !important;
  }
}
</style>
