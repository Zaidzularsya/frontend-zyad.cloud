<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  CrmSyncStatus,
  LandingPage,
  LandingSubmission,
} from '@/features/landing/shared/types/landing.types'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const PER_PAGE = 20

const statusLabels: Record<CrmSyncStatus, string> = {
  created: 'Lead dibuat',
  merged: 'Digabung ke lead',
  skipped: 'Tidak dikirim',
  failed: 'Gagal',
}

const statusClasses: Record<CrmSyncStatus, string> = {
  created: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  merged: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  skipped: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const route = useRoute()
const auth = useAuthStore()

const submissions = ref<LandingSubmission[]>([])
const pages = ref<LandingPage[]>([])
const loading = ref(false)
const errorMessage = ref('')
const retryError = ref('')
const retryingId = ref('')
const pageFilter = ref('')
const currentPage = ref(1)
const hasMore = ref(false)

const canUpdate = computed(() => auth.can('landing.submission.update'))
const canOpenLead = computed(() => auth.can('lead.read'))
const leadRouteName = computed(() =>
  String(route.name ?? '').startsWith('platform-') ? 'platform-crm-lead-detail' : 'crm-lead-detail',
)
const pageTitles = computed(() => new Map(pages.value.map((page) => [page.id, page.title])))

function field(row: LandingSubmission, key: string) {
  const value = row.submitted_data[key]
  return typeof value === 'string' && value.trim() ? value : '—'
}

function pageTitle(row: LandingSubmission) {
  return pageTitles.value.get(row.landing_page_id) || '—'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.listSubmissions({
      page: currentPage.value,
      per_page: PER_PAGE,
      ...(pageFilter.value ? { landing_page_id: pageFilter.value } : {}),
    })
    submissions.value = response.data
    hasMore.value = response.meta.has_more
  } catch {
    errorMessage.value = 'Gagal memuat kiriman form.'
    submissions.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

async function loadPages() {
  try {
    const response = await landingApi.getPages({ per_page: 100 })
    pages.value = response.data
  } catch {
    // Filter halaman hanya pelengkap; daftar kiriman tetap bisa dipakai tanpa judul halaman.
    pages.value = []
  }
}

function onFilterChange() {
  currentPage.value = 1
  void load()
}

function goTo(page: number) {
  currentPage.value = page
  void load()
}

async function retry(row: LandingSubmission) {
  retryingId.value = row.id
  retryError.value = ''
  try {
    const updated = await landingApi.retrySubmissionCrmSync(row.id)
    submissions.value = submissions.value.map((item) => (item.id === updated.id ? updated : item))
  } catch {
    retryError.value = 'Gagal mengirim ulang ke CRM.'
  } finally {
    retryingId.value = ''
  }
}

onMounted(() => {
  void loadPages()
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Submissions"
      description="Kiriman form dari landing page beserta status sinkron ke CRM."
    />

    <BaseCard>
      <div class="flex flex-wrap items-end gap-3 border-b p-4 dark:border-gray-800">
        <label class="block text-sm font-medium">
          Halaman
          <select
            v-model="pageFilter"
            class="mt-1 block w-full min-w-48 rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
            @change="onFilterChange"
          >
            <option value="">Semua halaman</option>
            <option v-for="page in pages" :key="page.id" :value="page.id">{{ page.title }}</option>
          </select>
        </label>
        <BaseButton variant="secondary" :disabled="loading" @click="load">
          <RefreshCw class="size-4" />
          Muat ulang
        </BaseButton>
      </div>

      <p
        v-if="retryError"
        role="alert"
        class="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ retryError }}
      </p>

      <p v-if="loading" role="status" class="p-6 text-sm text-gray-500">Memuat kiriman form…</p>
      <p v-else-if="errorMessage" role="alert" class="p-6 text-sm text-red-700">
        {{ errorMessage }}
      </p>
      <p v-else-if="submissions.length === 0" class="p-6 text-sm text-gray-500">
        Belum ada kiriman form.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[56rem] text-left text-sm">
          <thead class="border-b text-xs uppercase text-gray-500 dark:border-gray-800">
            <tr>
              <th scope="col" class="px-4 py-3">Tanggal</th>
              <th scope="col" class="px-4 py-3">Halaman</th>
              <th scope="col" class="px-4 py-3">Nama</th>
              <th scope="col" class="px-4 py-3">Email</th>
              <th scope="col" class="px-4 py-3">No. WhatsApp</th>
              <th scope="col" class="px-4 py-3">Status CRM</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in submissions" :key="row.id" class="border-b dark:border-gray-800">
              <td class="whitespace-nowrap px-4 py-3">{{ formatDate(row.submitted_at) }}</td>
              <td class="px-4 py-3">{{ pageTitle(row) }}</td>
              <td class="px-4 py-3">{{ field(row, 'name') }}</td>
              <td class="px-4 py-3">{{ field(row, 'email') }}</td>
              <td class="px-4 py-3">{{ field(row, 'phone') }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="statusClasses[row.crm_sync_status]"
                    :title="row.crm_sync_error ?? undefined"
                  >
                    <RouterLink
                      v-if="
                        canOpenLead &&
                        row.crm_lead_id &&
                        (row.crm_sync_status === 'created' || row.crm_sync_status === 'merged')
                      "
                      :to="{ name: leadRouteName, params: { id: row.crm_lead_id } }"
                      class="underline"
                    >
                      {{ statusLabels[row.crm_sync_status] }}
                    </RouterLink>
                    <template v-else>{{ statusLabels[row.crm_sync_status] }}</template>
                  </span>
                  <BaseButton
                    v-if="row.crm_sync_status === 'failed' && canUpdate"
                    variant="outline"
                    :disabled="retryingId === row.id"
                    @click="retry(row)"
                  >
                    Kirim ulang ke CRM
                  </BaseButton>
                </div>
                <p
                  v-if="row.crm_sync_status === 'failed' && row.crm_sync_error"
                  class="mt-1 text-xs text-red-700"
                >
                  {{ row.crm_sync_error }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!errorMessage && (currentPage > 1 || hasMore)"
        class="flex items-center justify-between gap-3 p-4"
      >
        <BaseButton
          variant="secondary"
          :disabled="loading || currentPage <= 1"
          @click="goTo(currentPage - 1)"
        >
          Sebelumnya
        </BaseButton>
        <span class="text-sm text-gray-500">Halaman {{ currentPage }}</span>
        <BaseButton
          variant="secondary"
          :disabled="loading || !hasMore"
          @click="goTo(currentPage + 1)"
        >
          Berikutnya
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>
