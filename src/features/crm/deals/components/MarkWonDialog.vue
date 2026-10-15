<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { WonChecklist } from '@/features/crm/sales-orders/api/sales-orders.api'
import WonChecklistCard from '@/features/crm/deals/components/WonChecklistCard.vue'

const props = defineProps<{
  open: boolean
  dealTitle: string
  checklists: WonChecklist[]
  busy?: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>()

const hasPending = computed(() => props.checklists.some((c) => c.conditions.some((x) => !x.met)))
const force = ref(false)
watch(
  () => props.open,
  () => {
    force.value = false
  },
)
// Bila ada syarat ⏳ pengguna wajib menyatakan sadar sebelum Won manual.
const canConfirm = computed(() => !hasPending.value || force.value)
</script>

<template>
  <BaseModal :open="open" title="Tandai deal Won" @close="emit('close')">
    <div class="space-y-4 text-sm">
      <p>
        Tandai deal <strong>{{ dealTitle }}</strong> sebagai Won?
      </p>
      <WonChecklistCard v-if="checklists.length" :checklists="checklists" />
      <label
        v-if="hasPending"
        class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900"
      >
        <input v-model="force" type="checkbox" name="force-won" class="mt-0.5" />
        <span>Tetap tandai Won meski ada syarat yang belum terpenuhi.</span>
      </label>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton :disabled="!canConfirm || busy" @click="emit('confirm')">Tandai Won</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
