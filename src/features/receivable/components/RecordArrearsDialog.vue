<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { useControlQuery } from '@/features/mikrotik/api/mikrotik.queries'
import { useMikrotikEnabled } from '@/features/mikrotik/composables/useMikrotikEnabled'
import type {
  ArrearsConflict,
  ArrearsPeriod,
  ArrearsRecording,
  ArrearsResult,
} from '@/features/receivable/api/receivable.api'
import {
  useArrearsPeriodsQuery,
  useRecordArrearsMutation,
  useResendArrearsMutation,
} from '@/features/receivable/api/receivable.queries'
import {
  arrearsTotal,
  buildArrearsPayload,
  MAX_ARREARS_ROWS,
  periodLabel,
  shortDateID,
  todayWIB,
  validateArrears,
  type ArrearsRow,
} from '@/features/receivable/utils/arrears'
import { receivableErrorCode, receivableErrorMessage } from '@/features/receivable/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const props = defineProps<{ open: boolean; contractId: string; accountId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'recorded', result: ArrearsResult): void }>()

const auth = useAuthStore()
const canFlag = computed(() => auth.can('invoice.isolir_flag'))
const mikrotikOn = useMikrotikEnabled()

const open = computed(() => props.open)
const contractId = computed(() => props.contractId)
const periodsQuery = useArrearsPeriodsQuery(contractId, open)
const periods = computed<ArrearsPeriod[]>(() => periodsQuery.data.value?.periods ?? [])
const hasTrigger = computed(() => periodsQuery.data.value?.has_trigger_product ?? false)
// The tenant mode decides whether flagging needs a confirmation (active = isolation can run now).
const controlEnabled = computed(() => open.value && canFlag.value && mikrotikOn.value)
const control = useControlQuery(controlEnabled)
// Unknown mode (still loading or failed) is treated like active: ask before flagging.
const needsConfirm = computed(
  () =>
    controlEnabled.value &&
    (control.isPending.value || control.isError.value || control.data.value?.mode === 'active'),
)

const recordMutation = useRecordArrearsMutation()
const resendMutation = useResendArrearsMutation()

const rows = ref<ArrearsRow[]>([])
const reason = ref('')
const idempotencyKey = ref('')
const errorMessage = ref('')
const conflicts = ref<ArrearsConflict[]>([])
const result = ref<ArrearsResult | null>(null)
const recording = ref<ArrearsRecording | null>(null)
const pendingFlag = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    rows.value = []
    reason.value = ''
    errorMessage.value = ''
    conflicts.value = []
    result.value = null
    recording.value = null
    pendingFlag.value = null
    // One key per opening of the dialog: a double submit returns the same recording.
    idempotencyKey.value = crypto.randomUUID()
  },
  { immediate: true },
)

const today = todayWIB()
const selected = (start: string) => rows.value.some((r) => r.period_start === start)
const rowOf = (start: string) => rows.value.find((r) => r.period_start === start)

function togglePeriod(p: ArrearsPeriod, checked: boolean) {
  if (checked) {
    if (selected(p.start) || rows.value.length >= MAX_ARREARS_ROWS) return
    rows.value = [
      ...rows.value,
      {
        period_start: p.start,
        period_end: p.end,
        amount: p.default_amount,
        due_date: p.start <= today ? p.start : today,
        isolir_flag: false,
      },
    ].sort((a, b) => a.period_start.localeCompare(b.period_start))
  } else {
    rows.value = rows.value.filter((r) => r.period_start !== p.start)
  }
}

const flagDisabledReason = computed(() => {
  if (!canFlag.value) return 'Hanya pemilik organisasi yang bisa mengikutkan tunggakan ke isolir.'
  if (!hasTrigger.value)
    return 'Kontrak ini tidak punya produk pemicu isolir, jadi penanda tidak berefek.'
  return ''
})

function setFlag(start: string, event: Event) {
  const input = event.target as HTMLInputElement
  const row = rowOf(start)
  if (!row) return
  if (input.checked && needsConfirm.value) {
    input.checked = false
    pendingFlag.value = start
    return
  }
  row.isolir_flag = input.checked
}

function confirmFlag() {
  const row = pendingFlag.value ? rowOf(pendingFlag.value) : undefined
  if (row) row.isolir_flag = true
  pendingFlag.value = null
}

const validation = computed(() => validateArrears(reason.value, rows.value, today))
const total = computed(() => arrearsTotal(rows.value))
const canSubmit = computed(
  () => validation.value.length === 0 && !recordMutation.isPending.value && !result.value,
)

function conflictsOf(error: unknown): ArrearsConflict[] {
  const data = (error as { response?: { data?: { data?: { conflicts?: ArrearsConflict[] } } } })
    ?.response?.data?.data
  return data?.conflicts ?? []
}

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  conflicts.value = []
  try {
    const res = await recordMutation.mutateAsync({
      payload: buildArrearsPayload(props.accountId, props.contractId, reason.value, rows.value),
      idempotencyKey: idempotencyKey.value,
    })
    result.value = res
    recording.value = res.recording
    emit('recorded', res)
  } catch (error) {
    if (receivableErrorCode(error) === 'ARREARS_CONFLICT') {
      conflicts.value = conflictsOf(error)
      errorMessage.value = 'Ada periode yang sudah punya invoice. Tidak ada tunggakan yang dicatat.'
      void periodsQuery.refetch()
      return
    }
    errorMessage.value = receivableErrorMessage(error, 'Tunggakan gagal dicatat. Coba lagi.')
  }
}

async function resendSummary() {
  if (!recording.value) return
  errorMessage.value = ''
  try {
    recording.value = await resendMutation.mutateAsync(recording.value.id)
  } catch (error) {
    errorMessage.value = receivableErrorMessage(error, 'Pesan gagal dikirim ulang.')
  }
}

const notifyText = computed(() => {
  switch (recording.value?.notify_status) {
    case 'sent':
      return 'Pesan ringkasan terkirim ke pelanggan.'
    case 'failed':
      return 'Pesan ringkasan gagal dikirim.'
    case 'skipped':
      return 'Pesan ringkasan tidak dikirim.'
    default:
      return 'Pesan ringkasan menunggu dikirim.'
  }
})
</script>

<template>
  <BaseModal :open="open" title="Catat tunggakan" width-class="max-w-3xl" @close="emit('close')">
    <div v-if="result" class="space-y-4 text-sm">
      <p class="font-medium">{{ result.invoices.length }} tunggakan tercatat.</p>
      <ul class="divide-y rounded-lg border">
        <li v-for="inv in result.invoices" :key="inv.id" class="flex justify-between px-3 py-2">
          <span>{{ inv.invoice_number }}</span>
          <span class="tabular-nums">{{ formatRupiah(inv.grand_total) }}</span>
        </li>
      </ul>
      <p :class="recording?.notify_status === 'sent' ? 'text-green-700' : 'text-amber-700'">
        {{ notifyText }}
        <template v-if="recording?.notify_error"> {{ recording.notify_error }}</template>
      </p>
      <p v-if="errorMessage" class="text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton
          v-if="recording?.notify_status !== 'sent'"
          variant="secondary"
          :disabled="resendMutation.isPending.value"
          @click="resendSummary"
          >Kirim ulang</BaseButton
        >
        <BaseButton @click="emit('close')">Selesai</BaseButton>
      </div>
    </div>

    <form v-else class="space-y-4 text-sm" @submit.prevent="submit">
      <p class="text-gray-600 dark:text-gray-300">
        Catat tagihan lama yang belum tercatat di sistem. Setiap periode menjadi satu invoice dengan
        jatuh tempo aslinya, dan pelanggan menerima satu pesan ringkasan.
      </p>

      <p v-if="periodsQuery.isPending.value" class="text-gray-500">Memuat periode...</p>
      <p v-else-if="periods.length === 0" class="text-gray-500">
        Belum ada periode kontrak yang sudah berjalan.
      </p>
      <fieldset v-else class="space-y-1">
        <legend class="mb-1 font-medium">Periode yang ditunggak</legend>
        <label
          v-for="p in periods"
          :key="p.start"
          class="flex items-center gap-2"
          :class="p.conflict ? 'text-gray-400' : ''"
        >
          <input
            type="checkbox"
            :name="`period-${p.start}`"
            :checked="selected(p.start)"
            :disabled="!!p.conflict"
            @change="togglePeriod(p, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ periodLabel(p.start, p.end) }}</span>
          <span v-if="p.conflict" class="text-xs">· {{ p.conflict }}</span>
        </label>
      </fieldset>

      <div v-if="rows.length > 0" class="overflow-x-auto">
        <table class="w-full min-w-[560px] text-left">
          <thead class="border-b text-xs uppercase text-gray-500">
            <tr>
              <th class="py-2">Periode</th>
              <th class="py-2">Jumlah</th>
              <th class="py-2">Jatuh tempo</th>
              <th class="py-2">Ikut isolir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.period_start" class="border-b last:border-0">
              <td class="py-2">{{ periodLabel(r.period_start, r.period_end) }}</td>
              <td class="py-2">
                <input
                  v-model="r.amount"
                  :name="`amount-${r.period_start}`"
                  inputmode="decimal"
                  class="w-36 rounded-lg border bg-white px-2 py-1 dark:bg-gray-950"
                />
              </td>
              <td class="py-2">
                <input
                  v-model="r.due_date"
                  type="date"
                  :name="`due-${r.period_start}`"
                  :max="today"
                  class="rounded-lg border bg-white px-2 py-1 dark:bg-gray-950"
                />
              </td>
              <td class="py-2">
                <input
                  type="checkbox"
                  :name="`flag-${r.period_start}`"
                  :checked="r.isolir_flag"
                  :disabled="!!flagDisabledReason"
                  :aria-label="`Ikut isolir ${shortDateID(r.period_start)}`"
                  @change="setFlag(r.period_start, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="flagDisabledReason" class="mt-1 text-xs text-gray-500">
          {{ flagDisabledReason }}
        </p>
        <p v-else class="mt-1 text-xs text-gray-500">
          Tanpa centang, tunggakan tidak membuat pelanggan diisolir walau lewat jatuh tempo.
        </p>
        <p class="mt-2 text-right font-medium">Total: {{ formatRupiah(total) }}</p>
      </div>

      <label class="block space-y-1">
        <span class="font-medium">Alasan (wajib)</span>
        <textarea
          v-model="reason"
          name="reason"
          rows="2"
          maxlength="500"
          class="w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
        />
      </label>

      <div v-if="errorMessage" class="space-y-1 text-red-600" role="alert">
        <p>{{ errorMessage }}</p>
        <ul v-if="conflicts.length > 0" class="list-disc pl-5">
          <li v-for="c in conflicts" :key="`${c.row}-${c.period_start}`">
            Periode {{ shortDateID(c.period_start) }}: {{ c.reason }}
          </li>
        </ul>
      </div>
      <ul v-else-if="rows.length > 0 && validation.length > 0" class="text-xs text-gray-500">
        <li v-for="v in validation" :key="v">{{ v }}</li>
      </ul>

      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="!canSubmit">Simpan tunggakan</BaseButton>
      </div>
    </form>

    <BaseModal :open="pendingFlag !== null" title="Ikutkan ke isolir?" @close="pendingFlag = null">
      <div class="space-y-4 text-sm">
        <p>
          Mode isolir organisasi sedang <strong>aktif</strong>. Tunggakan yang ditandai ikut isolir
          dan sudah lewat masa tenggang membuat pelanggan bisa langsung terisolir.
        </p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="pendingFlag = null">Batal</BaseButton>
          <BaseButton variant="danger" @click="confirmFlag">Ya, ikutkan isolir</BaseButton>
        </div>
      </div>
    </BaseModal>
  </BaseModal>
</template>
