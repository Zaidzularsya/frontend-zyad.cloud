<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
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

const chartOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  colors: ['#465fff'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' as const, width: 3 },
  grid: { borderColor: '#e5e7eb', strokeDashArray: 4 },
  xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'] },
  yaxis: {
    labels: {
      formatter: (value: number) => `${Math.round(value / 1_000_000)} jt`,
    },
  },
  tooltip: {
    y: { formatter: (value: number) => formatCurrency(value) },
  },
}))

const chartSeries = [
  { name: 'Revenue', data: [92, 108, 104, 138, 151, 184].map((v) => v * 1_000_000) },
]

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
        <VueApexCharts type="area" height="310" :options="chartOptions" :series="chartSeries" />
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
