<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next'

import { useQuotationResponsesQuery } from '@/features/crm/quotations/api/quotations.queries'
import { categoryLabel } from '@/features/public-documents/utils/revision'

// Riwayat respons customer atas link publik. Catatan dirender sebagai teks.
const props = defineProps<{ quotationId: string }>()

const query = useQuotationResponsesQuery(
  computed(() => props.quotationId),
  computed(() => true),
)
const responses = computed(() => query.data.value ?? [])

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
</script>

<template>
  <div v-if="responses.length" class="space-y-2 text-sm" data-testid="customer-responses">
    <h2 class="font-semibold">Respons customer</h2>
    <ul class="space-y-3">
      <li v-for="r in responses" :key="r.id" class="flex gap-2">
        <component
          :is="r.action === 'approved' ? CheckCircle2 : AlertTriangle"
          class="mt-0.5 size-4 shrink-0"
          :class="r.action === 'approved' ? 'text-emerald-600' : 'text-amber-600'"
          aria-hidden="true"
        />
        <div class="min-w-0">
          <p class="font-medium">
            {{ r.action === 'approved' ? 'Disetujui' : 'Minta revisi' }} · {{ r.responder_name }}
          </p>
          <p v-if="r.categories.length" class="text-xs text-gray-600 dark:text-gray-300">
            {{ r.categories.map(categoryLabel).join(', ') }}
          </p>
          <p v-if="r.note" class="text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-300">
            {{ r.note }}
          </p>
          <p class="text-xs text-gray-500">{{ formatDate(r.created_at) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
