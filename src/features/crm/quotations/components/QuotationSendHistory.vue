<script setup lang="ts">
import { computed } from 'vue'
import { Mail, MessageCircle } from 'lucide-vue-next'

import type { SendMode } from '@/features/crm/quotations/api/quotations.api'
import { useQuotationSendsQuery } from '@/features/crm/quotations/api/quotations.queries'

const props = defineProps<{ quotationId: string }>()

const sendsQuery = useQuotationSendsQuery(computed(() => props.quotationId))
const sends = computed(() => sendsQuery.data.value ?? [])

const modeLabel: Record<SendMode, string> = { text: 'Teks', pdf: 'PDF', text_pdf: 'Teks + PDF' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
</script>

<template>
  <div class="space-y-2 text-sm">
    <h2 class="font-semibold">Riwayat pengiriman</h2>
    <p v-if="sendsQuery.isPending.value" class="text-gray-500">Memuat...</p>
    <p v-else-if="sends.length === 0" class="text-gray-500">Belum pernah dikirim.</p>
    <ul v-else class="space-y-2">
      <li v-for="s in sends" :key="s.id" class="flex gap-2">
        <component
          :is="s.channel === 'email' ? Mail : MessageCircle"
          class="mt-0.5 size-4 shrink-0 text-gray-400"
          :aria-label="s.channel === 'email' ? 'Email' : 'WhatsApp'"
        />
        <div class="min-w-0">
          <p class="truncate">{{ s.recipient }} · {{ modeLabel[s.mode] }}</p>
          <p class="text-xs">
            <span
              :class="s.status === 'sent' ? 'text-green-700 dark:text-green-400' : 'text-red-600'"
              >{{ s.status === 'sent' ? 'Terkirim' : 'Gagal' }}</span
            >
            <span class="text-gray-500">
              · {{ s.sent_by_name || '-' }} · {{ formatDate(s.sent_at) }}</span
            >
          </p>
          <p v-if="s.status === 'failed' && s.error" class="text-xs text-red-600">{{ s.error }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
