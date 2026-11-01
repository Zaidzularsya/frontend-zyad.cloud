<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import DataPagination from '@/components/ui/DataPagination.vue'
import { useToast } from '@/components/ui/toast'
import {
  useAnalyzeMutation,
  useImportSecretsMutation,
  usePairBulkMutation,
  usePairNewCustomerMutation,
  useRoutersQuery,
  useSecretsQuery,
  useSetOriginalProfileMutation,
  useUnpairMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import PairConfirmFooter from '@/features/mikrotik/components/PairConfirmFooter.vue'
import PairResultModal from '@/features/mikrotik/components/PairResultModal.vue'
import SecretTable from '@/features/mikrotik/components/SecretTable.vue'
import { usePairSelection } from '@/features/mikrotik/composables/usePairSelection'
import type {
  AccountRef,
  PairBulkItem,
  PairBulkItemResult,
  PppSecret,
  SecretListParams,
} from '@/features/mikrotik/types'
import { secretActionError } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

type Tab = 'all' | 'suggested' | 'needs_decision' | 'needs_profile' | 'paired'

const BULK_LIMIT = 200 // MaxPairBulkItems di backend.

const auth = useAuthStore()
const toast = useToast()
const canPair = computed(() => auth.can('mikrotik_secret.pair'))
const canImport = computed(() => auth.can('mikrotik_secret.import'))
const canUnpair = computed(() => auth.can('mikrotik_secret.unpair'))

// --- router ---
const routersQuery = useRoutersQuery(ref({ per_page: 100 }))
const routers = computed(() => routersQuery.data.value?.data ?? [])
const selectedRouterId = ref('')
const routerId = computed(() =>
  routers.value.some((r) => r.id === selectedRouterId.value)
    ? selectedRouterId.value
    : (routers.value[0]?.id ?? ''),
)

// --- filter, pencarian, halaman ---
const tab = ref<Tab>('all')
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const perPage = ref(20)

let timer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})
watch([tab, search, perPage, routerId], () => {
  page.value = 1
})

const tabs: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'suggested', label: 'Diusulkan' },
  { value: 'needs_decision', label: 'Butuh keputusan' },
  { value: 'needs_profile', label: 'Perlu profile asli' },
  { value: 'paired', label: 'Terpasang' },
]

const listParams = computed<SecretListParams>(() => {
  const base: SecretListParams = {
    router_id: routerId.value || undefined,
    q: search.value || undefined,
    paired: tab.value === 'paired',
    page: page.value,
    per_page: perPage.value,
  }
  if (tab.value === 'suggested') base.suggestion = 'suggested'
  if (tab.value === 'needs_decision') base.suggestion = 'needs_decision'
  // Backend tidak punya filter needs_original_profile: ambil satu halaman besar lalu saring di sini.
  if (tab.value === 'needs_profile') {
    base.page = 1
    base.per_page = 200
  }
  return base
})
const listQuery = useSecretsQuery(listParams)
const rawRows = computed(() => listQuery.data.value?.data ?? [])
const rows = computed(() =>
  tab.value === 'needs_profile'
    ? rawRows.value.filter((r) => r.needs_original_profile)
    : rawRows.value,
)
const total = computed(() =>
  tab.value === 'needs_profile' ? rows.value.length : (listQuery.data.value?.meta?.total ?? 0),
)

// --- ringkasan: query per_page=1 hanya untuk meta.total ---
function countParams(extra: Partial<SecretListParams>) {
  return computed<SecretListParams>(() => ({
    router_id: routerId.value || undefined,
    page: 1,
    per_page: 1,
    ...extra,
  }))
}
const unpairedCount = useSecretsQuery(countParams({ paired: false }))
const suggestedCount = useSecretsQuery(countParams({ paired: false, suggestion: 'suggested' }))
const decisionCount = useSecretsQuery(countParams({ paired: false, suggestion: 'needs_decision' }))
const pairedCount = useSecretsQuery(countParams({ paired: true }))
const needsProfileQuery = useSecretsQuery(
  computed<SecretListParams>(() => ({
    router_id: routerId.value || undefined,
    paired: false,
    page: 1,
    per_page: 200,
  })),
)
const totalOf = (q: { data: { value?: { meta?: { total?: number } } } }) =>
  q.data.value?.meta?.total ?? 0
const summary = computed(() => ({
  unpaired: totalOf(unpairedCount),
  suggested: totalOf(suggestedCount),
  decision: totalOf(decisionCount),
  paired: totalOf(pairedCount),
  needsProfile: (needsProfileQuery.data.value?.data ?? []).filter((r) => r.needs_original_profile)
    .length,
}))
const countsReady = computed(() =>
  [unpairedCount, suggestedCount, decisionCount].every(
    (q) => q.data.value !== undefined && !q.isPlaceholderData.value && !q.isFetching.value,
  ),
)

// --- analisis otomatis (maksimal sekali per router per kunjungan) ---
const analyzeMutation = useAnalyzeMutation()
const autoAnalyzed = new Set<string>()

async function runAnalyze() {
  if (!routerId.value) return
  try {
    const r = await analyzeMutation.mutateAsync(routerId.value)
    toast.success(
      `Analisis selesai: ${r.suggested} diusulkan, ${r.needs_decision} butuh keputusan.`,
    )
  } catch (error) {
    toast.error(secretActionError(error))
  }
}
watch(
  [routerId, countsReady, summary],
  () => {
    const id = routerId.value
    if (!id || !countsReady.value || autoAnalyzed.has(id) || analyzeMutation.isPending.value) return
    autoAnalyzed.add(id)
    if (summary.value.unpaired > 0 && summary.value.suggested + summary.value.decision === 0) {
      void runAnalyze()
    }
  },
  { immediate: true },
)

// --- import ---
const importMutation = useImportSecretsMutation()
async function runImport() {
  if (!routerId.value) return
  try {
    const r = await importMutation.mutateAsync(routerId.value)
    toast.success(
      `Impor selesai: ${r.created} baru, ${r.updated} diperbarui, ${r.missing} hilang, ${r.skipped} dilewati.`,
    )
  } catch (error) {
    toast.error(secretActionError(error))
  }
}

// --- seleksi ---
const selection = usePairSelection()
const accountNames = ref<Record<string, string>>({})
const secretNames = ref<Record<string, string>>({})
watch(routerId, () => {
  selection.reset()
  accountNames.value = {}
  failures.value = {}
})
watch(
  rows,
  (list) => {
    for (const r of list) secretNames.value[r.id] = r.name
    if (tab.value === 'all' || tab.value === 'suggested') selection.selectAllSuggested(list)
  },
  { immediate: true },
)

function onToggle(row: PppSecret) {
  const accountId = selection.selected.get(row.id) ?? row.suggestion?.account_id ?? ''
  if (accountId) selection.toggle(row.id, accountId)
}
function onPick(row: PppSecret, account: AccountRef) {
  accountNames.value[row.id] = account.name
  selection.setAccount(row.id, account.id)
}

// --- konfirmasi pairing (bertahap ≤200) ---
const failures = ref<Record<string, string>>({})
const pairMutation = usePairBulkMutation()
const progress = ref<number | null>(null)
const results = ref<PairBulkItemResult[]>([])
const resultOpen = ref(false)

async function confirmPair() {
  const items: PairBulkItem[] = [...selection.selected.entries()].map(
    ([secret_id, account_id]) => ({
      secret_id,
      account_id,
    }),
  )
  if (items.length === 0) return
  progress.value = items.length
  const all: PairBulkItemResult[] = []
  for (let i = 0; i < items.length; i += BULK_LIMIT) {
    const chunk = items.slice(i, i + BULK_LIMIT)
    try {
      const res = await pairMutation.mutateAsync(chunk)
      all.push(...res.results)
    } catch (error) {
      const message = secretActionError(error)
      all.push(
        ...chunk.map((c) => ({ secret_id: c.secret_id, ok: false, code: 'request', message })),
      )
    }
  }
  for (const r of all) {
    if (r.ok) {
      delete failures.value[r.secret_id]
      selection.selected.delete(r.secret_id)
    } else {
      failures.value[r.secret_id] = r.message || 'Gagal dipasangkan'
    }
  }
  progress.value = null
  results.value = all
  resultOpen.value = true
}

// --- aksi per baris ---
type Pending = { kind: 'new-customer' | 'unpair'; row: PppSecret }
const pending = ref<Pending | null>(null)
const newCustomerMutation = usePairNewCustomerMutation()
const unpairMutation = useUnpairMutation()
const profileMutation = useSetOriginalProfileMutation()
const pendingBusy = computed(
  () => newCustomerMutation.isPending.value || unpairMutation.isPending.value,
)

async function runPending() {
  const p = pending.value
  if (!p) return
  try {
    if (p.kind === 'new-customer') {
      await newCustomerMutation.mutateAsync(p.row.id)
      toast.success(`Pelanggan baru dibuat dan dipasangkan ke ${p.row.name}.`)
    } else {
      await unpairMutation.mutateAsync(p.row.id)
      toast.success(`Pasangan ${p.row.name} dilepas.`)
    }
    delete failures.value[p.row.id]
    selection.selected.delete(p.row.id)
    pending.value = null
  } catch (error) {
    toast.error(secretActionError(error))
    pending.value = null
  }
}
async function setProfile(row: PppSecret, profile: string) {
  try {
    await profileMutation.mutateAsync({ id: row.id, profile })
    toast.success(`Profile asli ${row.name} disimpan.`)
  } catch (error) {
    toast.error(secretActionError(error))
  }
}

const pendingTitle = computed(() =>
  pending.value?.kind === 'unpair' ? 'Lepas pasangan?' : 'Buat pelanggan baru?',
)
const pendingMessage = computed(() => {
  const name = pending.value?.row.name ?? ''
  return pending.value?.kind === 'unpair'
    ? `Secret ${name} tidak lagi terhubung ke pelanggan dan tidak ikut diisolir.`
    : `Pelanggan baru akan dibuat dari secret ${name} dan langsung dipasangkan.`
})

function closeResult() {
  resultOpen.value = false
  void listQuery.refetch()
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Akun PPPoE" description="PPP secret dan pairing ke pelanggan.">
      <div class="flex flex-wrap items-center gap-2">
        <label v-if="routers.length" class="text-sm">
          <span class="sr-only">Router</span>
          <select
            class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
            :value="routerId"
            @change="selectedRouterId = ($event.target as HTMLSelectElement).value"
          >
            <option v-for="r in routers" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </label>
        <BaseButton
          variant="outline"
          :disabled="!routerId || !canImport || importMutation.isPending.value"
          @click="runImport"
        >
          {{ importMutation.isPending.value ? 'Mengimpor...' : 'Impor dari router' }}
        </BaseButton>
        <BaseButton
          variant="outline"
          :disabled="!routerId || !canPair || analyzeMutation.isPending.value"
          @click="runAnalyze"
        >
          Analisis ulang
        </BaseButton>
      </div>
    </PageHeader>

    <BaseCard v-if="!routersQuery.isPending.value && routers.length === 0">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Belum ada router terdaftar.
        <RouterLink :to="{ name: 'mikrotik-routers' }" class="font-medium text-brand-600"
          >Daftarkan router</RouterLink
        >
        terlebih dahulu.
      </p>
    </BaseCard>

    <template v-else-if="routerId">
      <p class="text-sm text-gray-600 dark:text-gray-300" data-testid="summary">
        {{ summary.unpaired + summary.paired }} ditemukan | {{ summary.suggested }} diusulkan |
        {{ summary.decision }} butuh keputusan | {{ summary.needsProfile }} perlu profile asli |
        {{ summary.paired }} terpasang
      </p>

      <div class="flex flex-wrap items-center justify-between gap-3 border-b">
        <div class="flex gap-2 overflow-x-auto">
          <button
            v-for="t in tabs"
            :key="t.value"
            type="button"
            class="border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap"
            :class="
              tab === t.value
                ? 'border-brand-500 text-brand-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            @click="tab = t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <label class="relative mb-2 block w-full max-w-xs text-sm">
          <span class="sr-only">Cari secret atau pelanggan</span>
          <Search class="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
          <input
            v-model="searchInput"
            name="search"
            placeholder="Cari secret atau pelanggan"
            class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>
      </div>

      <BaseCard class="!p-0">
        <div
          v-if="analyzeMutation.isPending.value"
          class="p-12 text-center text-sm text-gray-500"
          role="status"
        >
          Menganalisis {{ summary.unpaired }} secret…
        </div>
        <div
          v-else-if="progress !== null"
          class="p-12 text-center text-sm text-gray-500"
          role="status"
        >
          Memasangkan {{ progress }} data…
        </div>
        <div v-else-if="listQuery.isPending.value" class="p-12 text-center text-sm text-gray-500">
          Memuat data...
        </div>
        <div v-else-if="rows.length === 0" class="p-12 text-center text-sm text-gray-500">
          Tidak ada secret yang cocok.
        </div>
        <div v-else class="max-h-[60vh] overflow-auto">
          <SecretTable
            :rows="rows"
            :mode="tab === 'paired' ? 'paired' : 'unpaired'"
            :selected="selection.selected"
            :account-names="accountNames"
            :failures="failures"
            :search-text="search"
            :can-pair="canPair"
            :can-unpair="canUnpair"
            @toggle="onToggle"
            @pick="onPick"
            @clear="(r) => selection.clear(r.id)"
            @new-customer="(r) => (pending = { kind: 'new-customer', row: r })"
            @set-profile="setProfile"
            @unpair="(r) => (pending = { kind: 'unpair', row: r })"
          />
        </div>
        <PairConfirmFooter
          v-if="tab !== 'paired' && tab !== 'needs_profile'"
          :count="selection.count.value"
          :total="total"
          :loading="progress !== null"
          @confirm="confirmPair"
        />
        <DataPagination
          v-if="tab !== 'needs_profile'"
          v-model:page="page"
          v-model:per-page="perPage"
          :total="total"
          item-label="secret"
        />
      </BaseCard>
    </template>

    <PairResultModal
      :open="resultOpen"
      :results="results"
      :secret-names="secretNames"
      @close="closeResult"
    />
    <ConfirmDialog
      :open="pending !== null"
      :title="pendingTitle"
      :message="pendingMessage"
      :confirm-label="pending?.kind === 'unpair' ? 'Lepas' : 'Buat pelanggan'"
      :tone="pending?.kind === 'unpair' ? 'danger' : 'default'"
      :loading="pendingBusy"
      @confirm="runPending"
      @cancel="pending = null"
    />
  </div>
</template>
