<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Landmark } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { useToast } from '@/components/ui/toast'
import { formatRupiah } from '@/features/crm/quotations/utils/quotation-editor'
import type { OrgBalance } from '@/features/settlement/api/settlement.api'
import {
  useOrgBalancesQuery,
  useOrgEntriesQuery,
  useRecordEntryMutation,
} from '@/features/settlement/api/settlement.queries'
import {
  buildEntryPayload,
  entryKindLabel,
  settlementErrorMessage,
  todayWib,
  validateEntryForm,
  type ManualKind,
} from '@/features/settlement/utils/settlement'

const toast = useToast()

// Daftar saldo per organisasi
const page = ref(1)
const perPage = ref(20)
const search = ref('')
watch([perPage, search], () => {
  page.value = 1
})
const balancesQuery = useOrgBalancesQuery(
  computed(() => ({
    page: page.value,
    per_page: perPage.value,
    search: search.value.trim() || undefined,
  })),
)
const rows = computed(() => balancesQuery.data.value?.data ?? [])
const total = computed(() => balancesQuery.data.value?.meta?.total ?? 0)

// Detail organisasi: riwayat + form catat
const selected = ref<OrgBalance | null>(null)
const entriesPage = ref(1)
const entriesPerPage = ref(10)
watch(entriesPerPage, () => {
  entriesPage.value = 1
})
const entriesQuery = useOrgEntriesQuery(
  computed(() => selected.value?.organization_id ?? null),
  computed(() => ({ page: entriesPage.value, per_page: entriesPerPage.value })),
)
const entries = computed(() => entriesQuery.data.value?.data ?? [])
const entriesTotal = computed(() => entriesQuery.data.value?.meta?.total ?? 0)

// Saldo di drawer mengikuti data terbaru dari daftar (mutation menyegarkan daftar).
const current = computed(
  () =>
    rows.value.find((r) => r.organization_id === selected.value?.organization_id) ?? selected.value,
)

const kind = ref<ManualKind>('settlement')
const amount = ref('')
const date = ref(todayWib())
const note = ref('')
const touched = ref(false)
const errorMessage = ref('')
const confirming = ref(false)

function resetForm() {
  kind.value = 'settlement'
  amount.value = ''
  date.value = todayWib()
  note.value = ''
  touched.value = false
  errorMessage.value = ''
  confirming.value = false
}

function openOrg(row: OrgBalance) {
  resetForm()
  entriesPage.value = 1
  selected.value = row
}

function closeOrg() {
  selected.value = null
  resetForm()
}

const validation = computed(() =>
  validateEntryForm({ kind: kind.value, amount: amount.value, note: note.value }),
)
const mutation = useRecordEntryMutation()

function requestSubmit() {
  touched.value = true
  errorMessage.value = ''
  if (validation.value) return
  confirming.value = true
}

const confirmAmount = computed(() => {
  try {
    return formatRupiah(
      buildEntryPayload({ kind: kind.value, amount: amount.value, note: '', date: date.value })
        .amount,
    )
  } catch {
    return ''
  }
})

async function submit() {
  if (!selected.value || validation.value) return
  try {
    await mutation.mutateAsync({
      orgId: selected.value.organization_id,
      payload: buildEntryPayload({
        kind: kind.value,
        amount: amount.value,
        note: note.value,
        date: date.value || todayWib(),
      }),
    })
    toast.success(kind.value === 'settlement' ? 'Setoran dicatat.' : 'Penyesuaian dicatat.')
    amount.value = ''
    note.value = ''
    touched.value = false
    confirming.value = false
  } catch (error) {
    confirming.value = false
    errorMessage.value = settlementErrorMessage(error, 'Gagal mencatat. Coba lagi.')
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  )
}

const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Saldo & Setoran"
      description="Pembayaran online masuk ke rekening Zyad dan dikreditkan ke organisasi pemilik. Catat setoran manual di sini."
    />

    <BaseCard class="!p-0">
      <div class="border-b p-3">
        <input
          v-model="search"
          type="search"
          placeholder="Cari nama organisasi..."
          aria-label="Cari organisasi"
          :class="inputClass"
          class="max-w-sm"
        />
      </div>
      <div v-if="balancesQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
        Memuat data...
      </div>
      <div v-else-if="rows.length === 0" class="p-12 text-center text-sm text-gray-500">
        <Landmark class="mx-auto mb-3 size-8 text-gray-300" />
        Belum ada organisasi dengan saldo.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th class="px-5 py-3">Organisasi</th>
              <th class="px-5 py-3 text-right">Masuk</th>
              <th class="px-5 py-3 text-right">Disetor</th>
              <th class="px-5 py-3 text-right">Penyesuaian</th>
              <th class="px-5 py-3 text-right">Sisa</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.organization_id" class="border-b last:border-0">
              <td class="px-5 py-3 font-medium">{{ r.organization_name }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(r.paid_in) }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(r.settled) }}</td>
              <td class="px-5 py-3 text-right tabular-nums">{{ formatRupiah(r.adjusted) }}</td>
              <td class="px-5 py-3 text-right font-semibold tabular-nums">
                {{ formatRupiah(r.balance) }}
              </td>
              <td class="px-5 py-3 text-right">
                <BaseButton
                  variant="outline"
                  :data-testid="`open-${r.organization_id}`"
                  @click="openOrg(r)"
                >
                  Kelola
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="total > 0" class="border-t p-3">
        <DataPagination
          v-model:page="page"
          v-model:per-page="perPage"
          :total="total"
          item-label="organisasi"
        />
      </div>
    </BaseCard>

    <BaseModal
      :open="!!selected"
      :title="current ? `Saldo ${current.organization_name}` : 'Saldo'"
      width-class="max-w-3xl"
      @close="closeOrg"
    >
      <div v-if="current" class="space-y-5 text-sm">
        <p class="text-gray-600 dark:text-gray-300">
          Sisa saldo <strong>{{ formatRupiah(current.balance) }}</strong> (masuk
          {{ formatRupiah(current.paid_in) }}, disetor {{ formatRupiah(current.settled) }},
          penyesuaian {{ formatRupiah(current.adjusted) }}).
        </p>

        <form class="space-y-3 rounded-lg border p-4" @submit.prevent="requestSubmit">
          <div class="flex gap-2" role="group" aria-label="Jenis catatan">
            <BaseButton
              type="button"
              data-testid="kind-settlement"
              :variant="kind === 'settlement' ? 'primary' : 'outline'"
              @click="kind = 'settlement'"
            >
              Setoran
            </BaseButton>
            <BaseButton
              type="button"
              data-testid="kind-adjustment"
              :variant="kind === 'adjustment' ? 'primary' : 'outline'"
              @click="kind = 'adjustment'"
            >
              Penyesuaian
            </BaseButton>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block space-y-1">
              <span class="font-medium">Jumlah (Rp)</span>
              <input v-model="amount" name="amount" inputmode="decimal" :class="inputClass" />
              <span v-if="kind === 'adjustment'" class="block text-xs text-gray-500">
                Boleh negatif untuk mengurangi saldo.
              </span>
            </label>
            <label class="block space-y-1">
              <span class="font-medium">Tanggal (WIB)</span>
              <input v-model="date" name="date" type="date" :class="inputClass" />
            </label>
          </div>
          <label class="block space-y-1">
            <span class="font-medium">
              Catatan {{ kind === 'adjustment' ? '(wajib)' : '(opsional)' }}
            </span>
            <textarea v-model="note" name="note" rows="2" maxlength="500" :class="inputClass" />
          </label>
          <p v-if="touched && validation" class="text-xs text-red-600" role="alert">
            {{ validation }}
          </p>
          <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
          <div class="flex justify-end">
            <BaseButton
              type="submit"
              data-testid="submit-entry"
              :disabled="mutation.isPending.value"
            >
              {{ kind === 'settlement' ? 'Catat setoran' : 'Catat penyesuaian' }}
            </BaseButton>
          </div>
        </form>

        <div>
          <h3 class="mb-2 font-semibold">Riwayat</h3>
          <p v-if="entriesQuery.isPending.value" class="text-gray-500">Memuat riwayat...</p>
          <p v-else-if="entries.length === 0" class="text-gray-500">Belum ada transaksi.</p>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[520px] text-left">
              <thead class="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th class="py-2 pr-3">Tanggal</th>
                  <th class="py-2 pr-3">Jenis</th>
                  <th class="py-2 pr-3 text-right">Jumlah</th>
                  <th class="py-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in entries" :key="e.id" class="border-b last:border-0">
                  <td class="py-2 pr-3">{{ formatDate(e.occurred_at) }}</td>
                  <td class="py-2 pr-3">{{ entryKindLabel(e.kind) }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums">{{ formatRupiah(e.amount) }}</td>
                  <td class="py-2">{{ e.note || e.provider_reference || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="entriesTotal > 0" class="pt-3">
            <DataPagination
              v-model:page="entriesPage"
              v-model:per-page="entriesPerPage"
              :total="entriesTotal"
              item-label="transaksi"
            />
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      :open="confirming && !!selected"
      :title="kind === 'settlement' ? 'Konfirmasi setoran' : 'Konfirmasi penyesuaian'"
      @close="confirming = false"
    >
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Catat {{ kind === 'settlement' ? 'setoran' : 'penyesuaian' }}
        <strong>{{ confirmAmount }}</strong> untuk <strong>{{ selected?.organization_name }}</strong
        >? Catatan keuangan ini tidak bisa diubah setelah disimpan.
      </p>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BaseButton
          variant="outline"
          :disabled="mutation.isPending.value"
          @click="confirming = false"
        >
          Batal
        </BaseButton>
        <BaseButton
          data-testid="confirm-entry"
          :disabled="mutation.isPending.value"
          @click="submit"
        >
          {{ mutation.isPending.value ? 'Memproses...' : 'Ya, catat' }}
        </BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
