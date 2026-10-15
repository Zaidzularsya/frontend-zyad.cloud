<script setup lang="ts">
import { computed } from 'vue'
// Core entry + only the chart types used here keeps ApexCharts' bundle
// small; every apexcharts/* import must also be in vite optimizeDeps.
import VueApexCharts from 'vue3-apexcharts/core'
import 'apexcharts/area'
import 'apexcharts/bar'
import type { ApexOptions } from 'apexcharts'

import type { LeadDashboard, LeadDashboardGranularity } from '@/features/crm/leads/api/leads.api'
import { useAppStore } from '@/stores/app.store'

const props = defineProps<{
  series: LeadDashboard['series']
  granularity: LeadDashboardGranularity
}>()

const appStore = useAppStore()

// Series colours follow the entity (created = brand sky, converted = teal),
// with a lighter step on the dark surface.
const palette = computed(() =>
  appStore.darkMode
    ? { created: '#38bdf8', converted: '#2dd4bf', text: '#9ca3af', grid: '#1f2937' }
    : { created: '#0369a1', converted: '#0d9488', text: '#6b7280', grid: '#e5e7eb' },
)

// Bars read well for up to a month of days; longer ranges become an area.
const chartType = computed(() =>
  props.granularity === 'day' && props.series.length <= 31 ? 'bar' : 'area',
)

// Buckets are calendar days (YYYY-MM-DD). Plotting them as UTC midnight on a
// datetime axis lets ApexCharts thin out the labels to fit the width, which
// a category axis does not do for bar charts.
function bucketTime(bucket: string) {
  const [y, m, d] = bucket.split('-').map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

const chartSeries = computed(() => [
  {
    name: 'Lead masuk',
    data: props.series.map((point) => ({ x: bucketTime(point.bucket), y: point.created })),
  },
  {
    name: 'Converted',
    data: props.series.map((point) => ({ x: bucketTime(point.bucket), y: point.converted })),
  },
])

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const indonesianLocale = {
  name: 'id',
  options: {
    months: monthNames,
    shortMonths: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ],
    days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    shortDays: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  },
}

const tooltipDate = computed(
  () =>
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'UTC',
      ...(props.granularity === 'month'
        ? { month: 'long', year: 'numeric' }
        : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    }),
)

const options = computed<ApexOptions>(() => {
  const isBar = chartType.value === 'bar'
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    chart: {
      type: chartType.value,
      locales: [indonesianLocale],
      defaultLocale: 'id',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      foreColor: palette.value.text,
      background: 'transparent',
      animations: { enabled: !reducedMotion, speed: 250 },
    },
    colors: [palette.value.created, palette.value.converted],
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: true,
        rotate: 0,
        hideOverlappingLabels: true,
        style: { fontSize: '11px' },
        datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM' },
      },
      axisBorder: { color: palette.value.grid },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: { fontSize: '11px' },
        formatter: (value: number) => String(Math.round(value)),
      },
    },
    grid: { borderColor: palette.value.grid, strokeDashArray: 3, padding: { left: 4, right: 8 } },
    plotOptions: {
      bar: { columnWidth: '75%', borderRadius: 3, borderRadiusApplication: 'end' },
    },
    // Bars: a 1px surface-coloured gap between the paired columns.
    stroke: isBar
      ? { show: true, width: 1, colors: ['transparent'] }
      : { width: 2, curve: 'smooth' },
    fill: isBar
      ? { type: 'solid', opacity: 0.9 }
      : { type: 'gradient', gradient: { opacityFrom: 0.28, opacityTo: 0.02 } },
    markers: { size: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      shared: true,
      intersect: false,
      theme: appStore.darkMode ? 'dark' : 'light',
      x: { formatter: (value: number) => tooltipDate.value.format(new Date(value)) },
    },
  }
})
</script>

<template>
  <!-- key re-mounts the chart when the type changes; ApexCharts does not
       switch bar <-> area cleanly through updateOptions. -->
  <VueApexCharts
    :key="chartType"
    :type="chartType"
    height="300"
    :options="options"
    :series="chartSeries"
  />
</template>
