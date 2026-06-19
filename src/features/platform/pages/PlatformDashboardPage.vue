<script setup lang="ts">
import { Building, Shield, Users } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'

// Since formatCurrency might not be imported correctly if missing, we inline a simple formatter
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)

const metrics = [
  { label: 'Total Tenant', value: '142', change: '+12', icon: Building },
  { label: 'Total Platform User', value: '3.120', change: '+240', icon: Users },
  {
    label: 'Platform Revenue',
    value: formatCurrency(1450000000),
    change: '+15,2%',
    icon: Shield,
  },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Platform Overview"
      description="Super Admin dashboard untuk mengelola seluruh infrastruktur Zyad Cloud."
    />

    <div class="grid gap-4 md:grid-cols-3">
      <BaseCard v-for="metric in metrics" :key="metric.label">
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50"
          >
            <component :is="metric.icon" class="size-5" />
          </span>
          <span class="flex items-center text-xs font-semibold text-emerald-600">
            {{ metric.change }}
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">{{ metric.label }}</p>
        <p class="mt-1 text-2xl font-bold">{{ metric.value }}</p>
      </BaseCard>
    </div>
  </div>
</template>
