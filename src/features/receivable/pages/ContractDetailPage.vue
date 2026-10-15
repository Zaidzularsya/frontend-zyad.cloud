<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import { TONE_CLASS } from '@/features/crm/sales-orders/utils/sales-order'
import {
  useContractQuery,
  useEndContractMutation,
  useSetContractEndDateMutation,
} from '@/features/receivable/api/receivable.queries'
import { CONTRACT_STATUS, contractErrorMessage } from '@/features/receivable/utils/contract'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const base = computed(() => route.path.replace(/\/sales\/contracts.*$/, ''))
const id = computed(() => String(route.params.id ?? ''))
const query = useContractQuery(id)
const contract = computed(() => query.data.value)

const setEnd = useSetContractEndDateMutation()
const endMutation = useEndContractMutation()
const endDate = ref('')
const endOpen = ref(false)
const reason = ref('')
const error = ref('')

const canManage = computed(() => auth.can('contract.manage') && contract.value?.status === 'active')
const frequencyLabel = (v: string) => FREQUENCIES.find((f) => f.value === v)?.label ?? v
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${value.slice(0, 10)}T00:00:00`),
      )
    : '-'

async function saveEndDate(clear: boolean) {
  if (!contract.value) return
  error.value = ''
  try {
    await setEnd.mutateAsync({
      id: contract.value.id,
      endDate: clear ? null : endDate.value || null,
    })
  } catch (e) {
    error.value = contractErrorMessage(e)
  }
}

async function endContract() {
  if (!contract.value) return
  error.value = ''
  if (!reason.value.trim()) {
    error.value = 'Alasan wajib diisi.'
    return
  }
  try {
    await endMutation.mutateAsync({ id: contract.value.id, reason: reason.value.trim() })
    endOpen.value = false
    reason.value = ''
  } catch (e) {
    error.value = contractErrorMessage(e)
  }
}
</script>

<template>
  <div>
    <p v-if="query.isPending.value" class="p-12 text-center text-sm text-gray-500">
      Memuat data...
    </p>
    <div v-else-if="query.isError.value || !contract" class="p-12 text-center">
      <p class="font-semibold text-red-700">Kontrak tidak ditemukan.</p>
      <button
        class="mt-2 text-sm font-medium text-brand-600"
        @click="router.push(`${base}/sales/contracts`)"
      >
        Kembali ke daftar
      </button>
    </div>
    <div v-else class="space-y-4">
      <BaseCard class="space-y-3 !p-5">
        <button
          class="inline-flex items-center gap-2 text-sm text-gray-600"
          @click="router.push(`${base}/sales/contracts`)"
        >
          <ArrowLeft class="size-4" /> Kembali ke contracts
        </button>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h1 class="text-xl font-bold">{{ contract.contract_number }}</h1>
            <p class="text-sm text-gray-600">
              {{ contract.account.company_name || contract.account.name }}
            </p>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="TONE_CLASS[CONTRACT_STATUS[contract.status].tone]"
              >{{ CONTRACT_STATUS[contract.status].label }}</span
            >
          </div>
          <BaseButton v-if="canManage" variant="danger" @click="endOpen = true"
            >Hentikan</BaseButton
          >
        </div>
        <p class="text-sm text-gray-600">
          Mulai {{ formatDate(contract.start_date) }} · Berakhir {{ formatDate(contract.end_date) }}
          <template v-if="contract.end_reason"> · Alasan: {{ contract.end_reason }}</template>
        </p>
      </BaseCard>

      <BaseCard class="space-y-3 !p-5">
        <h2 class="font-semibold">Item berulang</h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="border-b text-xs uppercase text-gray-500">
              <tr>
                <th class="py-2">Item</th>
                <th class="py-2">Frekuensi</th>
                <th class="py-2">Periode berikutnya</th>
                <th class="py-2 text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in contract.items" :key="item.id" class="border-b last:border-0">
                <td class="py-2 font-medium">{{ item.description }}</td>
                <td class="py-2">
                  {{ frequencyLabel(item.billing_frequency) }} ·
                  {{ item.payment_timing === 'postpaid' ? 'Pascabayar' : 'Prabayar' }}
                </td>
                <td class="py-2">
                  {{ formatDate(item.next_period_start) }} – {{ formatDate(item.next_period_end) }}
                </td>
                <td class="py-2 text-right">{{ formatRupiah(item.unit_price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <BaseCard v-if="contract.upcoming.length > 0" class="space-y-3 !p-5">
        <h2 class="font-semibold">Tagihan berikutnya</h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm">
            <thead class="border-b text-xs uppercase text-gray-500">
              <tr>
                <th class="py-2">Tanggal tagih</th>
                <th class="py-2">Item</th>
                <th class="py-2">Periode</th>
                <th class="py-2 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in contract.upcoming"
                :key="`${u.item_id}-${u.bill_on}`"
                class="border-b last:border-0"
              >
                <td class="py-2">{{ formatDate(u.bill_on) }}</td>
                <td class="py-2">{{ u.description }}</td>
                <td class="py-2">
                  {{ formatDate(u.period_start) }} – {{ formatDate(u.period_end) }}
                </td>
                <td class="py-2 text-right tabular-nums">{{ formatRupiah(u.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <BaseCard v-if="canManage" class="space-y-3 !p-5 text-sm">
        <h2 class="font-semibold">Tanggal akhir</h2>
        <div class="flex flex-wrap items-end gap-3">
          <label class="space-y-1">
            <span class="font-medium">Berakhir pada</span>
            <input
              v-model="endDate"
              type="date"
              name="end_date"
              class="rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
            />
          </label>
          <BaseButton
            variant="secondary"
            :disabled="setEnd.isPending.value || !endDate"
            @click="saveEndDate(false)"
            >Simpan</BaseButton
          >
          <BaseButton
            v-if="contract.end_date"
            variant="outline"
            :disabled="setEnd.isPending.value"
            @click="saveEndDate(true)"
            >Hapus tanggal akhir</BaseButton
          >
        </div>
      </BaseCard>
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>

      <BaseModal :open="endOpen" title="Hentikan kontrak" @close="endOpen = false">
        <form class="space-y-4 text-sm" @submit.prevent="endContract">
          <label class="block space-y-1">
            <span class="font-medium">Alasan (wajib)</span>
            <textarea
              v-model="reason"
              name="reason"
              rows="3"
              maxlength="500"
              class="w-full rounded-lg border bg-white px-3 py-2 dark:bg-gray-950"
            />
          </label>
          <p v-if="error" class="text-red-600" role="alert">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" @click="endOpen = false">Batal</BaseButton>
            <BaseButton type="submit" variant="danger" :disabled="endMutation.isPending.value"
              >Hentikan kontrak</BaseButton
            >
          </div>
        </form>
      </BaseModal>
    </div>
  </div>
</template>
