<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ChevronDown, ChevronRight, Plus, Undo2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import JournalEntryFormModal from '@/features/finance/components/JournalEntryFormModal.vue'
import {
  useFinanceJournalListQuery,
  useReverseFinanceJournalEntryMutation,
} from '@/features/finance/api/journal.queries'
import { formatFinanceAmount } from '@/features/finance/utils/format'

const filters = reactive({ page: 1, per_page: 20, start_date: '', end_date: '' })
const listParams = computed(() => ({
  page: filters.page,
  per_page: filters.per_page,
  start_date: filters.start_date || undefined,
  end_date: filters.end_date || undefined,
}))
const journalQuery = useFinanceJournalListQuery(listParams)
const reverseMutation = useReverseFinanceJournalEntryMutation()

const modalOpen = ref(false)
const expandedId = ref<string | null>(null)

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function reverseEntry(id: string) {
  const reason = window.prompt('Alasan pembalikan jurnal ini?') ?? ''
  await reverseMutation.mutateAsync({ id, payload: { reason } })
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Jurnal Entry"
      description="Catatan jurnal manual double-entry untuk pembukuan PT Zyad Technovation."
    >
      <PermissionGate permission="platform.finance.journal.manage">
        <BaseButton @click="modalOpen = true"> <Plus class="size-4" /> Jurnal Baru </BaseButton>
      </PermissionGate>
    </PageHeader>

    <BaseCard>
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <label class="text-sm font-medium">
          Dari
          <input
            v-model="filters.start_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
        <label class="text-sm font-medium">
          Sampai
          <input
            v-model="filters.end_date"
            type="date"
            class="mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>
      </div>

      <p v-if="journalQuery.isLoading.value" class="text-sm text-gray-500">Memuat jurnal...</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr
            class="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800"
          >
            <th class="px-3 py-2"></th>
            <th class="px-3 py-2">No. Jurnal</th>
            <th class="px-3 py-2">Tanggal</th>
            <th class="px-3 py-2">Keterangan</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right">Total</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in journalQuery.data.value?.data ?? []" :key="entry.id">
            <tr class="border-b last:border-0 dark:border-gray-800">
              <td class="px-3 py-2">
                <button class="text-gray-400" @click="toggle(entry.id)">
                  <component
                    :is="expandedId === entry.id ? ChevronDown : ChevronRight"
                    class="size-4"
                  />
                </button>
              </td>
              <td class="px-3 py-2 font-medium">{{ entry.entry_number }}</td>
              <td class="px-3 py-2">{{ entry.entry_date }}</td>
              <td class="px-3 py-2 text-gray-500">{{ entry.description }}</td>
              <td class="px-3 py-2 capitalize">{{ entry.status }}</td>
              <td class="px-3 py-2 text-right tabular-nums">
                {{ formatFinanceAmount(entry.total_debit) }}
              </td>
              <td class="px-3 py-2 text-right">
                <PermissionGate permission="platform.finance.journal.manage">
                  <button
                    v-if="entry.status === 'posted'"
                    class="text-gray-400 hover:text-amber-600"
                    title="Balik jurnal ini"
                    @click="reverseEntry(entry.id)"
                  >
                    <Undo2 class="size-4" />
                  </button>
                </PermissionGate>
              </td>
            </tr>
            <tr v-if="expandedId === entry.id" class="bg-gray-50 dark:bg-gray-800/40">
              <td colspan="7" class="px-6 py-3">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-gray-500">
                      <th class="py-1 text-left">Akun</th>
                      <th class="py-1 text-right">Debit</th>
                      <th class="py-1 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in entry.lines ?? []" :key="line.id">
                      <td class="py-1">{{ line.account_code }} — {{ line.account_name }}</td>
                      <td class="py-1 text-right tabular-nums">
                        {{ formatFinanceAmount(line.debit) }}
                      </td>
                      <td class="py-1 text-right tabular-nums">
                        {{ formatFinanceAmount(line.credit) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </BaseCard>

    <JournalEntryFormModal
      :open="modalOpen"
      @close="modalOpen = false"
      @created="journalQuery.refetch()"
    />
  </div>
</template>
