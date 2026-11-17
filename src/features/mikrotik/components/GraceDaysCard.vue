<script setup lang="ts">
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import { useSetGraceDaysMutation } from '@/features/mikrotik/api/mikrotik.queries'
import { controlActionError } from '@/features/mikrotik/utils/errors'

const props = defineProps<{ graceDays: number; disabled?: boolean; hint?: string }>()

const toast = useToast()
const mutation = useSetGraceDaysMutation()
const value = ref<string | number>(String(props.graceDays))
const error = ref('')

// Nilai dari server menang setelah simpan/refetch.
watch(
  () => props.graceDays,
  (v) => (value.value = String(v)),
)
watch(value, () => (error.value = ''))

async function save() {
  if (props.disabled) return
  // v-model pada input number dapat menghasilkan number atau string kosong.
  const raw = String(value.value ?? '').trim()
  const n = Number(raw)
  if (raw === '' || !Number.isInteger(n) || n < 0 || n > 60) {
    error.value = 'Isi bilangan bulat antara 0 dan 60.'
    return
  }
  try {
    await mutation.mutateAsync(n)
    toast.success('Toleransi keterlambatan disimpan.')
  } catch (e) {
    error.value = controlActionError(e)
  }
}
</script>

<template>
  <form class="space-y-2 rounded-xl border p-4" novalidate @submit.prevent="save">
    <label class="block text-sm font-medium" for="grace-days">Toleransi Keterlambatan (Hari)</label>
    <p id="grace-days-help" class="text-xs text-gray-600 dark:text-gray-400">
      Isolir otomatis dijalankan N hari setelah tanggal jatuh tempo terlewat. Berlaku untuk seluruh
      pelanggan organisasi ini. Menaikkan toleransi dapat memulihkan pelanggan yang sedang terisolir
      bila keterlambatannya belum melewati batas baru.
    </p>
    <div class="flex flex-wrap items-start gap-2">
      <input
        id="grace-days"
        v-model="value"
        type="number"
        inputmode="numeric"
        min="0"
        max="60"
        step="1"
        :aria-disabled="disabled ? 'true' : undefined"
        :readonly="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="
          [
            'grace-days-help',
            error ? 'grace-days-err' : '',
            disabled && hint ? 'grace-days-hint' : '',
          ]
            .filter(Boolean)
            .join(' ')
        "
        class="w-28 rounded-lg border bg-white p-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
      />
      <BaseButton
        type="submit"
        :aria-disabled="disabled ? 'true' : undefined"
        :class="disabled ? 'cursor-not-allowed opacity-60' : ''"
        :title="disabled ? hint : undefined"
        :disabled="mutation.isPending.value"
      >
        Simpan
      </BaseButton>
    </div>
    <p v-if="error" id="grace-days-err" class="text-sm text-red-700" role="alert">{{ error }}</p>
    <span v-if="disabled && hint" id="grace-days-hint" class="sr-only">{{ hint }}</span>
  </form>
</template>
