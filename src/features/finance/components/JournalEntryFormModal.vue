<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import AccountPickerSelect from '@/features/finance/components/AccountPickerSelect.vue'
import { useCreateFinanceJournalEntryMutation } from '@/features/finance/api/journal.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

interface LineDraft {
  account_id: string
  debit: string
  credit: string
  description: string
}

function emptyLine(): LineDraft {
  return { account_id: '', debit: '', credit: '', description: '' }
}

const form = reactive({
  entry_date: new Date().toISOString().slice(0, 10),
  reference: '',
  description: '',
  lines: [emptyLine(), emptyLine()] as LineDraft[],
})

const submitError = reactive({ message: '' })

const totalDebit = computed(() =>
  form.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0),
)
const totalCredit = computed(() =>
  form.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0),
)
const isBalanced = computed(
  () => form.lines.length >= 2 && totalDebit.value > 0 && totalDebit.value === totalCredit.value,
)

const createMutation = useCreateFinanceJournalEntryMutation()

function addLine() {
  form.lines.push(emptyLine())
}

function removeLine(index: number) {
  if (form.lines.length <= 2) return
  form.lines.splice(index, 1)
}

function resetForm() {
  form.entry_date = new Date().toISOString().slice(0, 10)
  form.reference = ''
  form.description = ''
  form.lines = [emptyLine(), emptyLine()]
  submitError.message = ''
}

async function submit() {
  submitError.message = ''
  if (!isBalanced.value) {
    submitError.message = 'Total debit dan kredit harus sama dan lebih dari nol.'
    return
  }
  try {
    await createMutation.mutateAsync({
      entry_date: form.entry_date,
      reference: form.reference || undefined,
      description: form.description || undefined,
      lines: form.lines
        .filter((line) => line.account_id && (Number(line.debit) || Number(line.credit)))
        .map((line) => ({
          account_id: line.account_id,
          debit: line.debit || '0',
          credit: line.credit || '0',
          description: line.description || undefined,
        })),
    })
    resetForm()
    emit('created')
    emit('close')
  } catch (error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    submitError.message = response?.data?.message ?? 'Gagal menyimpan jurnal entry.'
  }
}
</script>

<template>
  <BaseModal :open="open" title="Jurnal Entry Baru" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm font-medium">
          Tanggal
          <input
            v-model="form.entry_date"
            type="date"
            required
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Referensi
          <input
            v-model="form.reference"
            type="text"
            placeholder="No. dokumen (opsional)"
            class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <label class="block text-sm font-medium">
        Keterangan
        <input
          v-model="form.description"
          type="text"
          placeholder="Keterangan jurnal"
          class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      <div class="space-y-2">
        <div class="grid grid-cols-[1fr_110px_110px_32px] gap-2 text-xs font-medium text-gray-500">
          <span>Akun</span>
          <span class="text-right">Debit</span>
          <span class="text-right">Kredit</span>
          <span></span>
        </div>
        <div
          v-for="(line, index) in form.lines"
          :key="index"
          class="grid grid-cols-[1fr_110px_110px_32px] items-center gap-2"
        >
          <AccountPickerSelect v-model="line.account_id" />
          <input
            v-model="line.debit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            class="rounded-lg border px-2 py-2 text-right text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @input="line.credit = ''"
          />
          <input
            v-model="line.credit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            class="rounded-lg border px-2 py-2 text-right text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @input="line.debit = ''"
          />
          <button
            type="button"
            class="text-gray-400 hover:text-red-500 disabled:opacity-30"
            :disabled="form.lines.length <= 2"
            @click="removeLine(index)"
          >
            <Trash2 class="size-4" />
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          @click="addLine"
        >
          <Plus class="size-4" /> Tambah baris
        </button>
      </div>

      <div
        class="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
        :class="
          isBalanced
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200'
        "
      >
        <span>Total Debit: {{ formatFinanceAmount(totalDebit) }}</span>
        <span>Total Kredit: {{ formatFinanceAmount(totalCredit) }}</span>
        <span>{{ isBalanced ? 'Balance' : 'Belum balance' }}</span>
      </div>

      <p v-if="submitError.message" class="text-sm text-red-600">{{ submitError.message }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton type="button" variant="secondary" @click="$emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="!isBalanced || createMutation.isPending.value">
          {{ createMutation.isPending.value ? 'Menyimpan...' : 'Simpan Jurnal' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
