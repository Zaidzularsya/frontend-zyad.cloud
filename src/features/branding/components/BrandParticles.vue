<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Latar partikel debu halus (port dari konsep video branding zyad_logo_final):
// titik-titik kecil berwarna melayang perlahan ke atas dengan efek twinkle.
const props = withDefaults(
  defineProps<{
    colors?: string[]
    /** Alpha dasar partikel; varian light memakai nilai lebih rendah. */
    baseAlpha?: number
  }>(),
  {
    colors: () => ['#60A5FA', '#22D3EE', '#2DD4BF', '#7DD3FC'],
    baseAlpha: 1,
  },
)

interface Particle {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  a: number
  c: string
  tw: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let rafId = 0
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const cv = canvasRef.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  let ps: Particle[] = []

  const seed = () => {
    const count = Math.min(70, Math.floor((W * H) / 20000))
    ps = []
    for (let i = 0; i < count; i++) {
      ps.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.3 + 0.06),
        a: (Math.random() * 0.4 + 0.12) * props.baseAlpha,
        c: props.colors[(Math.random() * props.colors.length) | 0]!,
        tw: Math.random() * Math.PI * 2,
      })
    }
  }

  const resize = () => {
    W = cv.clientWidth
    H = cv.clientHeight
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    seed()
  }

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(cv)
  resize()

  let t = 0
  const frame = () => {
    ctx.clearRect(0, 0, W, H)
    t += 0.016
    for (const p of ps) {
      p.x += p.vx
      p.y += p.vy
      if (p.y < -5) {
        p.y = H + 5
        p.x = Math.random() * W
      }
      if (p.x < -5) p.x = W + 5
      if (p.x > W + 5) p.x = -5
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + p.tw)
      ctx.globalAlpha = p.a * tw
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvasRef" class="pointer-events-none h-full w-full" aria-hidden="true"></canvas>
</template>
