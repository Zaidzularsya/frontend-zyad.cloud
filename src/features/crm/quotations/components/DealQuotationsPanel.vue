<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { QuotationStatus } from '@/features/crm/quotations/api/quotations.api'
import { useQuotationsQuery } from '@/features/crm/quotations/api/quotations.queries'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ dealId: string }>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const base = computed(() => route.path.replace(/deals\/[^/]+$/, ''))

const params = computed(() => ({ page: 1, per_page: 50, deal_id: props.dealId }))
const quotationsQuery = useQuotationsQuery(params)
// API mengurutkan terbaru dulu (created_at DESC).
const quotations = computed(() => quotationsQuery.data.value?.data ?? [])

const statusMeta: Record<QuotationStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Terkirim', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  approved: {
    label: 'Disetujui',
    cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  expired: {
    label: 'Kedaluwarsa',
    cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  superseded: { label: 'Digantikan', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800' },
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function create() {
  void router.push({ path: `${base.value}quotations/new`, query: { deal_id: props.dealId } })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-gray-500">Penawaran untuk deal ini, versi terbaru di atas.</p>
      <BaseButton v-if="auth.can('quotation.create')" @click="create">
        <Plus class="size-4" />
        Buat quotation
      </BaseButton>
    </div>
    <p v-if="quotationsQuery.isPending.value" class="py-6 text-center text-sm text-gray-500">
      Memuat data...
    </p>
    <p v-else-if="quotations.length === 0" class="py-6 text-center text-sm text-gray-500">
      Belum ada penawaran untuk deal ini.
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-xs uppercase text-gray-500">
          <tr>
            <th class="py-2 pr-3">Nomor</th>
            <th class="py-2 pr-3">Status</th>
            <th class="py-2 pr-3 text-right">Total</th>
            <th class="py-2 pr-3">Terkirim</th>
            <th class="py-2">Berlaku s.d.</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="q in quotations"
            :key="q.id"
            class="border-b last:border-0"
            :class="{ 'opacity-60': q.status === 'superseded' }"
          >
            <td class="py-2 pr-3">
              <RouterLink :to="`${base}quotations/${q.id}`" class="font-medium text-brand-600">{{
                q.quotation_number
              }}</RouterLink>
            </td>
            <td class="py-2 pr-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusMeta[q.status].cls"
                >{{ statusMeta[q.status].label }}</span
              >
            </td>
            <td class="py-2 pr-3 text-right tabular-nums">{{ formatRupiah(q.grand_total) }}</td>
            <td class="py-2 pr-3">{{ formatDate(q.sent_at) }}</td>
            <td class="py-2">{{ formatDate(q.valid_until) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
