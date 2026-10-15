<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { WonChecklist } from '@/features/crm/sales-orders/api/sales-orders.api'

const props = defineProps<{ checklists: WonChecklist[]; basePath?: string }>()

const allMet = computed(
  () => props.checklists.length > 0 && props.checklists.every((c) => c.all_met),
)
</script>

<template>
  <section class="space-y-3 rounded-xl border p-3 text-sm" aria-label="Syarat Won">
    <h2 class="font-semibold">Syarat Won</h2>
    <p v-if="allMet" class="font-medium text-green-700">Semua syarat Won terpenuhi</p>
    <div v-for="list in checklists" :key="list.sales_order_id" class="space-y-1">
      <p class="text-xs font-semibold text-gray-500">
        <RouterLink
          v-if="basePath"
          :to="`${basePath}/sales/orders/${list.sales_order_id}`"
          class="text-brand-600"
          >{{ list.so_number }}</RouterLink
        >
        <template v-else>{{ list.so_number }}</template>
      </p>
      <p v-if="list.conditions.length === 0" class="text-gray-500">SO belum punya baris.</p>
      <ul class="space-y-1">
        <li v-for="c in list.conditions" :key="c.item_id" class="flex gap-2" :data-met="c.met">
          <span aria-hidden="true">{{ c.met ? '✓' : '⏳' }}</span>
          <span>
            <span class="font-medium">{{ c.description }}</span>
            <span class="block text-xs" :class="c.met ? 'text-green-700' : 'text-amber-700'">{{
              c.label
            }}</span>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
