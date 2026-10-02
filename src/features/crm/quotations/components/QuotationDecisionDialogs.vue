<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useCloseDealLostMutation,
  useCloseDealWonMutation,
} from '@/features/crm/deals/api/deals.queries'
import type { Quotation } from '@/features/crm/quotations/api/quotations.api'
import {
  useApproveQuotationMutation,
  useRejectQuotationMutation,
} from '@/features/crm/quotations/api/quotations.queries'
import { quotationErrorMessage } from '@/features/crm/quotations/utils/errors'

const props = defineProps<{
  quotation: Quotation
  mode: 'approve' | 'reject' | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'revise'): void
}>()

// confirm → keputusan dikirim; follow-up → pertanyaan lanjutan soal deal.
const step = ref<'confirm' | 'follow-up'>('confirm')
const lostReason = ref('')
const askLostReason = ref(false)
const errorMessage = ref('')

const approve = useApproveQuotationMutation()
const reject = useRejectQuotationMutation()
const closeWon = useCloseDealWonMutation()
const closeLost = useCloseDealLostMutation()

watch(
  () => props.mode,
  () => {
    step.value = 'confirm'
    lostReason.value = ''
    askLostReason.value = false
    errorMessage.value = ''
  },
)

async function run(action: () => Promise<unknown>) {
  errorMessage.value = ''
  try {
    await action()
    return true
  } catch (error) {
    errorMessage.value = quotationErrorMessage(error)
    return false
  }
}

async function confirmDecision() {
  if (props.mode === 'approve') {
    let suggest = ''
    const ok = await run(async () => {
      suggest = (await approve.mutateAsync(props.quotation.id)).suggest_deal_status
    })
    if (!ok) return
    if (suggest === 'won' && props.quotation.deal_id) step.value = 'follow-up'
    else emit('close')
    return
  }
  const ok = await run(() => reject.mutateAsync(props.quotation.id))
  if (!ok) return
  if (props.quotation.deal_id) step.value = 'follow-up'
  else emit('close')
}

async function markWon() {
  const dealId = props.quotation.deal_id
  if (!dealId) return
  if (await run(() => closeWon.mutateAsync(dealId))) emit('close')
}

async function markLost() {
  const dealId = props.quotation.deal_id
  if (!dealId) return
  const reason = lostReason.value.trim() || undefined
  if (await run(() => closeLost.mutateAsync({ id: dealId, lostReason: reason }))) emit('close')
}

const busy = () =>
  approve.isPending.value ||
  reject.isPending.value ||
  closeWon.isPending.value ||
  closeLost.isPending.value
</script>

<template>
  <BaseModal
    :open="mode !== null"
    :title="mode === 'approve' ? 'Quotation disetujui' : 'Quotation ditolak'"
    @close="emit('close')"
  >
    <div class="space-y-4 text-sm">
      <template v-if="step === 'confirm'">
        <p v-if="mode === 'approve'">
          Tandai quotation <strong>{{ quotation.quotation_number }}</strong> disetujui customer?
        </p>
        <p v-else>
          Tandai quotation <strong>{{ quotation.quotation_number }}</strong> ditolak customer?
        </p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
          <BaseButton
            :variant="mode === 'approve' ? 'primary' : 'danger'"
            :disabled="busy()"
            @click="confirmDecision"
          >
            {{ mode === 'approve' ? 'Tandai disetujui' : 'Tandai ditolak' }}
          </BaseButton>
        </div>
      </template>

      <template v-else-if="mode === 'approve'">
        <p>Quotation disetujui. Tandai deal sebagai <strong>Won</strong>?</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="emit('close')">Nanti</BaseButton>
          <BaseButton :disabled="busy()" @click="markWon">Ya, tandai Won</BaseButton>
        </div>
      </template>

      <template v-else>
        <p>Quotation ditolak. Apa langkah berikutnya untuk deal ini?</p>
        <label v-if="askLostReason" class="block space-y-1">
          <span class="font-medium">Alasan lost (opsional)</span>
          <input
            v-model="lostReason"
            name="lost-reason"
            class="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
        <div class="flex flex-wrap justify-end gap-2">
          <BaseButton variant="secondary" @click="emit('close')">Biarkan deal open</BaseButton>
          <BaseButton v-if="!askLostReason" variant="danger" @click="askLostReason = true">
            Tandai deal Lost
          </BaseButton>
          <BaseButton v-else variant="danger" :disabled="busy()" @click="markLost">
            Simpan Lost
          </BaseButton>
          <BaseButton variant="outline" @click="emit('revise')">Buat revisi</BaseButton>
        </div>
      </template>

      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>
    </div>
  </BaseModal>
</template>
