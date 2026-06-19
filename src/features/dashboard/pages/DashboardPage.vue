<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, BadgeDollarSign, Handshake, UsersRound } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { formatCurrency } from '@/lib/utils'

const metrics = [
  { label: 'Total customer', value: '2.420', change: '+12,5%', icon: UsersRound },
  { label: 'Pipeline aktif', value: formatCurrency(780_000_000), change: '+8,2%', icon: Handshake },
  {
    label: 'Revenue bulan ini',
    value: formatCurrency(184_000_000),
    change: '+14,1%',
    icon: BadgeDollarSign,
  },
]

const revenueData = [
  { label: 'Jan', value: 92_000_000 },
  { label: 'Feb', value: 108_000_000 },
  { label: 'Mar', value: 104_000_000 },
  { label: 'Apr', value: 138_000_000 },
  { label: 'Mei', value: 151_000_000 },
  { label: 'Jun', value: 184_000_000 },
]

const chartPoints = computed(() => {
  const width = 600
  const height = 240
  const padding = 28
  const max = Math.max(...revenueData.map((item) => item.value))
  const min = Math.min(...revenueData.map((item) => item.value))
  const range = max - min || 1

  return revenueData.map((item, index) => {
    const x = padding + (index / (revenueData.length - 1)) * (width - padding * 2)
    const y = padding + ((max - item.value) / range) * (height - padding * 2)
    return { ...item, x, y }
  })
})

const chartPath = computed(() =>
  chartPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' '),
)

const chartAreaPath = computed(() => {
  const points = chartPoints.value
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return ''
  return `${chartPath.value} L ${last.x} 240 L ${first.x} 240 Z`
})

const activities = [
  ['Deal “Enterprise Migration” berpindah ke Negotiation', '12 menit lalu'],
  ['PT Nusantara Digital ditambahkan sebagai customer', '38 menit lalu'],
  ['Invoice INV-2026-081 telah dibayar', '1 jam lalu'],
  ['Siti mengundang anggota tim baru', '3 jam lalu'],
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Dashboard"
      description="Ringkasan performa workspace dan aktivitas terbaru."
    />

    <div class="grid gap-4 md:grid-cols-3">
      <BaseCard v-for="metric in metrics" :key="metric.label">
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <component :is="metric.icon" class="size-5" />
          </span>
          <span class="flex items-center text-xs font-semibold text-emerald-600">
            {{ metric.change }} <ArrowUpRight class="size-3.5" />
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">{{ metric.label }}</p>
        <p class="mt-1 text-2xl font-bold">{{ metric.value }}</p>
      </BaseCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
      <BaseCard>
        <div class="mb-4">
          <h2 class="font-semibold">Revenue</h2>
          <p class="text-sm text-gray-500">Enam bulan terakhir</p>
        </div>
        <div class="h-[310px]">
          <svg
            viewBox="0 0 600 300"
            role="img"
            aria-label="Revenue enam bulan terakhir"
            class="h-full w-full"
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#465fff" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#465fff" stop-opacity="0" />
              </linearGradient>
            </defs>

            <g class="text-gray-200 dark:text-gray-800">
              <line
                v-for="y in [40, 90, 140, 190, 240]"
                :key="y"
                x1="28"
                x2="572"
                :y1="y"
                :y2="y"
                stroke="currentColor"
                stroke-dasharray="6 8"
              />
            </g>

            <path :d="chartAreaPath" fill="url(#revenueGradient)" />
            <path
              :d="chartPath"
              fill="none"
              stroke="#465fff"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <g v-for="point in chartPoints" :key="point.label">
              <circle :cx="point.x" :cy="point.y" r="5" fill="#465fff" />
              <circle :cx="point.x" :cy="point.y" r="9" fill="#465fff" opacity="0.12" />
              <text :x="point.x" y="278" text-anchor="middle" class="fill-gray-500 text-[13px]">
                {{ point.label }}
              </text>
            </g>
          </svg>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="font-semibold">Aktivitas terbaru</h2>
        <div class="mt-5 space-y-5">
          <div v-for="[activity, time] in activities" :key="activity" class="flex gap-3">
            <span class="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
            <div>
              <p class="text-sm font-medium leading-5">{{ activity }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ time }}</p>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
