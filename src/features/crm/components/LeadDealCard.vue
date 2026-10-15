<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import DealStageTrack from '@/features/crm/components/DealStageTrack.vue'
import type { DealDetail } from '@/features/crm/deals/api/deals.api'
import type { Lead } from '@/features/crm/leads/api/leads.api'
import { formatCurrency } from '@/lib/utils'

const props = defineProps<{ lead: Lead; deal?: DealDetail; loading: boolean; canCreate: boolean }>()
const emit = defineEmits<{ create: [] }>()

const route = useRoute()
// Halaman lead dipasang di dua prefix (tenant & platform): ganti "leads/:id" → "deals/:id".
const dealPath = computed(() =>
  props.deal ? route.path.replace(/leads\/[^/]+$/, `deals/${props.deal.id}`) : '',
)
const closeDate = computed(() =>
  props.deal?.expected_close_date
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(props.deal.expected_close_date),
      )
    : null,
)
</script>

<template>
  <section class="space-y-3">
    <h2 class="font-semibold">Deals</h2>
    <div v-if="deal" class="space-y-2 rounded-xl border p-3">
      <p class="font-medium">{{ deal.title }}</p>
      <p class="text-lg font-semibold">{{ formatCurrency(Number(deal.value), deal.currency) }}</p>
      <p class="text-xs text-gray-500">
        {{ deal.pipeline.name }}<span v-if="closeDate"> · closing {{ closeDate }}</span>
        <span v-if="deal.status !== 'open'" class="uppercase"> · {{ deal.status }}</span>
      </p>
      <DealStageTrack
        :stages="deal.pipeline.stages"
        :current-stage-id="deal.stage_id"
        :deal-status="deal.status"
      />
      <RouterLink
        :to="dealPath"
        class="inline-flex items-center gap-1 text-sm font-medium text-brand-600"
      >
        Buka deal <ArrowRight class="size-4" />
      </RouterLink>
    </div>
    <p v-else-if="loading" class="text-sm text-gray-500">Memuat deal...</p>
    <template v-else-if="lead.status === 'converted'">
      <p class="text-sm text-gray-500">Lead ini sudah di-convert tanpa deal.</p>
      <BaseButton v-if="canCreate" class="w-full" variant="secondary" @click="emit('create')">
        Buat deal dari lead ini
      </BaseButton>
    </template>
    <p v-else class="text-sm text-gray-500">Deal dibuat saat lead di-convert.</p>
  </section>
</template>
