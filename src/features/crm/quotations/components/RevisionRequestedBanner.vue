<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useQuotationResponsesQuery } from '@/features/crm/quotations/api/quotations.queries'
import { categoryLabel } from '@/features/public-documents/utils/revision'

// Banner di editor saat customer meminta revisi: menampilkan permintaan
// terakhir dan dua keputusan sales (buat revisi / tolak).
const props = defineProps<{ quotationId: string; canRevise: boolean; canReject: boolean }>()
defineEmits<{ (e: 'revise'): void; (e: 'reject'): void }>()

const query = useQuotationResponsesQuery(
  computed(() => props.quotationId),
  computed(() => true),
)
const latest = computed(() =>
  (query.data.value ?? []).find((r) => r.action === 'revision_requested'),
)
</script>

<template>
  <section
    class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    role="status"
    data-testid="revision-banner"
  >
    <div class="flex gap-3">
      <AlertTriangle class="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div class="min-w-0 flex-1 space-y-2">
        <p class="font-semibold">
          Customer meminta revisi<template v-if="latest"> · {{ latest.responder_name }}</template>
        </p>
        <ul v-if="latest?.categories.length" class="flex flex-wrap gap-1.5">
          <li
            v-for="c in latest.categories"
            :key="c"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium dark:bg-amber-900/50"
          >
            {{ categoryLabel(c) }}
          </li>
        </ul>
        <blockquote
          v-if="latest?.note"
          class="border-l-2 border-amber-400 pl-3 whitespace-pre-wrap"
        >
          {{ latest.note }}
        </blockquote>
        <div class="flex flex-wrap gap-2 pt-1">
          <BaseButton v-if="canRevise" @click="$emit('revise')">Buat revisi</BaseButton>
          <BaseButton v-if="canReject" variant="secondary" @click="$emit('reject')">
            Tolak
          </BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>
