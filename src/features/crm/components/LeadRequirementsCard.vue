<script setup lang="ts">
import { computed } from 'vue'
import { ClipboardList } from 'lucide-vue-next'

import type { Lead } from '@/features/crm/leads/api/leads.api'
import { formatCurrency } from '@/lib/utils'

const props = defineProps<{ lead: Lead; readonly?: boolean }>()
const emit = defineEmits<{ edit: [] }>()

const hasAny = computed(() =>
  Boolean(
    props.lead.requirement_summary ||
    props.lead.budget_estimate ||
    props.lead.target_date ||
    props.lead.decision_maker,
  ),
)

const budget = computed(() => {
  const n = Number(props.lead.budget_estimate)
  return props.lead.budget_estimate && Number.isFinite(n) ? formatCurrency(n) : '-'
})

const target = computed(() =>
  props.lead.target_date
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${props.lead.target_date}T00:00:00`),
      )
    : '-',
)
</script>

<template>
  <section class="space-y-2 rounded-xl border p-3 text-sm" aria-label="Kebutuhan">
    <div class="flex items-center justify-between">
      <h2 class="flex items-center gap-2 font-semibold">
        <ClipboardList class="size-4 text-gray-500" /> Kebutuhan
      </h2>
      <button
        v-if="!readonly"
        type="button"
        class="text-xs font-medium text-brand-600"
        @click="emit('edit')"
      >
        {{ hasAny ? 'Ubah' : 'Isi form kebutuhan' }}
      </button>
    </div>
    <p v-if="!hasAny" class="text-gray-500">Belum diisi.</p>
    <dl v-else class="space-y-1.5">
      <div>
        <dt class="text-xs text-gray-500">Ringkasan</dt>
        <dd class="whitespace-pre-line">{{ lead.requirement_summary || '-' }}</dd>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <dt class="text-xs text-gray-500">Budget</dt>
          <dd>{{ budget }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">Target</dt>
          <dd>{{ target }}</dd>
        </div>
      </div>
      <div>
        <dt class="text-xs text-gray-500">Pengambil keputusan</dt>
        <dd>{{ lead.decision_maker || '-' }}</dd>
      </div>
    </dl>
  </section>
</template>
