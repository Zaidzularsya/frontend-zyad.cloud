<script setup lang="ts">
import { computed } from 'vue'
import { Mail, MessageCircle } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { InvoiceSend, SendChannel } from '@/features/receivable/api/receivable.api'
import { retryableSendIds } from '@/features/receivable/utils/send-invoice'

const props = defineProps<{ sends: InvoiceSend[]; canRetry: boolean }>()
const emit = defineEmits<{ (e: 'retry', channel: SendChannel): void }>()

const retryable = computed(() => retryableSendIds(props.sends))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
</script>

<template>
  <div class="space-y-2 text-sm">
    <h2 class="font-semibold">Riwayat pengiriman</h2>
    <p v-if="sends.length === 0" class="text-gray-500">Belum pernah dikirim.</p>
    <ul v-else class="space-y-3">
      <li v-for="s in sends" :key="s.id" class="flex gap-2">
        <component
          :is="s.channel === 'email' ? Mail : MessageCircle"
          class="mt-0.5 size-4 shrink-0 text-gray-400"
          :aria-label="s.channel === 'email' ? 'Email' : 'WhatsApp'"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate">{{ s.recipient || '-' }}</p>
          <p class="text-xs">
            <span
              :class="s.status === 'sent' ? 'text-green-700 dark:text-green-400' : 'text-red-600'"
              >{{ s.status === 'sent' ? 'Terkirim' : 'Gagal' }}</span
            >
            <span class="text-gray-500">
              · {{ s.trigger === 'auto' ? 'Otomatis' : s.sent_by_name || 'Manual' }} ·
              {{ formatDate(s.sent_at) }}</span
            >
          </p>
          <p v-if="s.status === 'failed' && s.error" class="text-xs text-red-600">{{ s.error }}</p>
          <BaseButton
            v-if="canRetry && retryable.has(s.id)"
            variant="outline"
            class="mt-1"
            @click="emit('retry', s.channel)"
          >
            Retry
          </BaseButton>
        </div>
      </li>
    </ul>
  </div>
</template>
