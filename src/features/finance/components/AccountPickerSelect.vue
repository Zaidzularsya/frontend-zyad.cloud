<script setup lang="ts">
import { computed } from 'vue'

import { useFinanceAccountsQuery } from '@/features/finance/api/coa.queries'

const props = withDefaults(
  defineProps<{
    modelValue: string
    postableOnly?: boolean
    placeholder?: string
  }>(),
  {
    postableOnly: true,
    placeholder: 'Pilih akun...',
  },
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const accountsQuery = useFinanceAccountsQuery(computed(() => ({ include_inactive: false })))

const options = computed(() => {
  const accounts = accountsQuery.data.value ?? []
  return props.postableOnly ? accounts.filter((a) => !a.is_header) : accounts
})
</script>

<template>
  <select
    :value="modelValue"
    class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="">{{ placeholder }}</option>
    <option v-for="account in options" :key="account.id" :value="account.id">
      {{ account.account_code }} — {{ account.account_name }}
    </option>
  </select>
</template>
