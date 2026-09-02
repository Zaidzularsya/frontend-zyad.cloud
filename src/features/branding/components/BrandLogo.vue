<script setup lang="ts">
import { useId } from 'vue'

// Logo statis theme-aware: varian light/dark ditoggle lewat class Tailwind `dark:`.
// Dipakai sebagai fallback navbar/footer saat branding API belum memberikan logo URL.
//
// Gradient id diberi suffix unik per instance (useId) karena beberapa instance
// komponen ini bisa muncul sekaligus di satu halaman (mis. LoginPage + AuthLayout) —
// id SVG gradient yang sama di dua <svg> berbeda menyebabkan browser salah
// resolve referensi `url(#id)`, membuat salah satu logo render kosong.
withDefaults(
  defineProps<{
    variant?: 'auto' | 'light' | 'dark'
  }>(),
  { variant: 'auto' },
)

const uid = useId()
</script>

<template>
  <span class="inline-flex items-center" role="img" aria-label="Zyad Cloud">
    <svg
      v-if="variant !== 'dark'"
      viewBox="0 0 540 270"
      xmlns="http://www.w3.org/2000/svg"
      class="h-full w-auto"
      :class="variant === 'auto' ? 'dark:hidden' : ''"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="`${uid}-left`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38BDF8" />
          <stop offset="100%" stop-color="#0B1F3A" />
        </linearGradient>
        <linearGradient :id="`${uid}-center`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2DD4BF" />
          <stop offset="100%" stop-color="#0EA5E9" />
        </linearGradient>
        <linearGradient :id="`${uid}-right`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7DD3FC" />
          <stop offset="100%" stop-color="#14B8A6" />
        </linearGradient>
        <linearGradient :id="`${uid}-dot`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#22D3EE" />
          <stop offset="100%" stop-color="#14B8A6" />
        </linearGradient>
      </defs>
      <path
        d="M 50 240 L 210 240 A 20 20 0 0 0 230 220 L 230 215 A 100 100 0 0 0 30 215 L 30 220 A 20 20 0 0 0 50 240 Z"
        :fill="`url(#${uid}-left)`"
      />
      <path
        d="M 170 240 L 390 240 A 20 20 0 0 0 410 220 L 410 170 A 130 130 0 0 0 150 170 L 150 220 A 20 20 0 0 0 170 240 Z"
        :fill="`url(#${uid}-center)`"
      />
      <path
        d="M 351 240 L 489 240 A 16 16 0 0 0 505 224 L 505 215 A 85 85 0 0 0 335 215 L 335 224 A 16 16 0 0 0 351 240 Z"
        :fill="`url(#${uid}-right)`"
      />
      <circle cx="445" cy="85" r="26" :fill="`url(#${uid}-dot)`" />
    </svg>

    <svg
      v-if="variant !== 'light'"
      viewBox="0 0 540 270"
      xmlns="http://www.w3.org/2000/svg"
      class="h-full w-auto"
      :class="variant === 'auto' ? 'hidden dark:inline' : ''"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="`${uid}-leftD`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7DD3FC" />
          <stop offset="100%" stop-color="#2563EB" />
        </linearGradient>
        <linearGradient :id="`${uid}-centerD`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5EEAD4" />
          <stop offset="100%" stop-color="#22D3EE" />
        </linearGradient>
        <linearGradient :id="`${uid}-rightD`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#BAE6FD" />
          <stop offset="100%" stop-color="#2DD4BF" />
        </linearGradient>
        <linearGradient :id="`${uid}-dotD`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#67E8F9" />
          <stop offset="100%" stop-color="#5EEAD4" />
        </linearGradient>
      </defs>
      <path
        d="M 50 240 L 210 240 A 20 20 0 0 0 230 220 L 230 215 A 100 100 0 0 0 30 215 L 30 220 A 20 20 0 0 0 50 240 Z"
        :fill="`url(#${uid}-leftD)`"
      />
      <path
        d="M 170 240 L 390 240 A 20 20 0 0 0 410 220 L 410 170 A 130 130 0 0 0 150 170 L 150 220 A 20 20 0 0 0 170 240 Z"
        :fill="`url(#${uid}-centerD)`"
      />
      <path
        d="M 351 240 L 489 240 A 16 16 0 0 0 505 224 L 505 215 A 85 85 0 0 0 335 215 L 335 224 A 16 16 0 0 0 351 240 Z"
        :fill="`url(#${uid}-rightD)`"
      />
      <circle cx="445" cy="85" r="26" :fill="`url(#${uid}-dotD)`" />
    </svg>
  </span>
</template>
