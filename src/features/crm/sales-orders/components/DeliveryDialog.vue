<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { SalesOrderItem } from '@/features/crm/sales-orders/api/sales-orders.api'
import { useConfirmDeliveryMutation } from '@/features/crm/sales-orders/api/sales-orders.queries'
import { salesOrderErrorMessages } from '@/features/crm/sales-orders/utils/errors'

const props = defineProps<{ open: boolean; salesOrderId: string; items: SalesOrderItem[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const today = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
const deliveredAt = ref(today())
const note = ref('')
const errors = ref<string[]>([])
// batch_key stabil selama dialog terbuka: klik ganda / retry tidak membuat invoice kedua.
const batchKey = ref(crypto.randomUUID())
const mutation = useConfirmDeliveryMutation()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    deliveredAt.value = today()
    note.value = ''
    errors.value = []
    batchKey.value = crypto.randomUUID()
  },
)

async function submit() {
  errors.value = []
  try {
    await mutation.mutateAsync({
      id: props.salesOrderId,
      payload: {
        item_ids: props.items.map((i) => i.id),
        delivered_at: deliveredAt.value,
        note: note.value.trim() || undefined,
        batch_key: batchKey.value,
      },
    })
    emit('close')
  } catch (error) {
    errors.value = salesOrderErrorMessages(error)
  }
}
</script>

<template>
  <BaseModal :open="open" title="Konfirmasi diterima" @close="emit('close')">
    <form class="space-y-4 text-sm" @submit.prevent="submit">
      <p>Invoice akan diterbitkan untuk item berikut:</p>
      <ul class="list-disc space-y-1 pl-5">
        <li v-for="item in items" :key="item.id">{{ item.description }}</li>
      </ul>
      <label class="block space-y-1">
        <span class="font-medium">Tanggal diterima</span>
        <input
          v-model="deliveredAt"
          type="date"
          name="delivered_at"
          :max="today()"
          required
          class="w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
        />
      </label>
      <label class="block space-y-1">
        <span class="font-medium">Catatan (opsional)</span>
        <textarea
          v-model="note"
          name="note"
          maxlength="500"
          rows="2"
          class="w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
        />
      </label>
      <ul v-if="errors.length" class="space-y-1 text-red-600" role="alert">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="mutation.isPending.value"
          >Konfirmasi diterima</BaseButton
        >
      </div>
    </form>
  </BaseModal>
</template>
