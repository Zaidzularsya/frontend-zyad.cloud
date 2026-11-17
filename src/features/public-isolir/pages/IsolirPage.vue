<script setup lang="ts">
import { useMutation, useQuery } from '@tanstack/vue-query'
import { AlertTriangle, Loader2, RotateCw, Search } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { isolirApi } from '../api/isolir.api'
import IsolirFaq from '../components/IsolirFaq.vue'
import IsolirHelpBlock from '../components/IsolirHelpBlock.vue'
import IsolirInvoiceList from '../components/IsolirInvoiceList.vue'

// Pelanggan satu ISP sering berbagi satu IP NAT, jadi 429 dan galat jaringan
// pada info bersifat sementara: ulangi dengan jeda bertambah. Halaman
// "tidak tersedia" hanya untuk enabled=false, bukan untuk galat.
const INFO_MAX_RETRIES = 5
const INFO_RETRY_BASE_MS = 2000
const INFO_RETRY_MAX_MS = 30000

function isTransient(err: unknown): boolean {
  const status = (err as { response?: { status?: number } } | null)?.response?.status
  return status === undefined || status === 429
}

const {
  data: info,
  isPending,
  isError: infoFailed,
  isFetching: infoFetching,
  refetch: refetchInfo,
} = useQuery({
  queryKey: ['public-isolir-info'],
  queryFn: () => isolirApi.info(),
  retry: (failures, err) => failures < INFO_MAX_RETRIES && isTransient(err),
  retryDelay: (attempt) => Math.min(INFO_RETRY_BASE_MS * 2 ** attempt, INFO_RETRY_MAX_MS),
  refetchOnWindowFocus: false,
})

// Halaman berisi data tagihan per pelanggan: jangan diindeks mesin pencari.
let robots: HTMLMetaElement | null = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)
})
onBeforeUnmount(() => robots?.remove())

const query = ref('')
const lookup = useMutation({ mutationFn: (q: string) => isolirApi.lookup(q) })

function submit() {
  const q = query.value.trim()
  if (!q || lookup.isPending.value) return
  lookup.mutate(q)
}

const errorMessage = computed(() => {
  if (!lookup.isError.value) return ''
  const status = (lookup.error.value as { response?: { status?: number } } | null)?.response?.status
  return status === 429
    ? 'Terlalu banyak percobaan, coba lagi sebentar.'
    : 'Terjadi kendala. Silakan coba lagi.'
})

const result = computed(() => lookup.data.value)
const hasInvoices = computed(() => (result.value?.invoices.length ?? 0) > 0)
const tenant = computed(() => info.value?.tenant)
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-16 dark:bg-gray-950">
    <main class="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <p v-if="isPending" class="py-24 text-center text-sm text-gray-500" role="status">Memuat…</p>

      <section v-else-if="infoFailed && !info" class="py-24 text-center" role="status">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Halaman belum dapat dimuat. Periksa koneksi Anda lalu coba lagi.
        </p>
        <button
          type="button"
          :disabled="infoFetching"
          class="mx-auto mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          @click="refetchInfo()"
        >
          <Loader2 v-if="infoFetching" class="size-4 animate-spin" aria-hidden="true" />
          <RotateCw v-else class="size-4" aria-hidden="true" />
          Coba lagi
        </button>
      </section>

      <section v-else-if="!info?.enabled || !tenant" class="py-24 text-center">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Halaman ini tidak tersedia.
        </h1>
      </section>

      <template v-else>
        <header class="mb-6">
          <p class="text-sm font-medium text-gray-500">{{ tenant.name }}</p>
          <h1 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Tagihan Internet
          </h1>
        </header>

        <form class="grid gap-3" @submit.prevent="submit">
          <label for="isolir-query" class="text-sm font-medium text-gray-800 dark:text-gray-200">
            Username PPPoE atau nomor WhatsApp
          </label>
          <input
            id="isolir-query"
            v-model="query"
            type="text"
            autocomplete="off"
            maxlength="64"
            class="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            :disabled="lookup.isPending.value"
            class="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Loader2 v-if="lookup.isPending.value" class="size-4 animate-spin" aria-hidden="true" />
            <Search v-else class="size-4" aria-hidden="true" />
            Cek tagihan
          </button>
        </form>

        <p v-if="errorMessage" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {{ errorMessage }}
        </p>

        <section v-if="result" class="mt-6 grid gap-4" aria-live="polite">
          <template v-if="result.found && hasInvoices">
            <div
              class="flex gap-3 rounded-xl border p-4 text-sm"
              :class="
                result.isolated
                  ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100'
                  : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
              "
              role="status"
            >
              <AlertTriangle class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p v-if="result.isolated">
                Internet Anda dijeda sementara karena ada tagihan yang belum dibayar.
              </p>
              <p v-else>Anda memiliki tagihan yang belum dibayar.</p>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Pelanggan: <strong>{{ result.masked_name }}</strong>
            </p>
            <IsolirInvoiceList :invoices="result.invoices" />
          </template>
          <p v-else class="text-sm text-gray-700 dark:text-gray-300">
            Tidak ada tagihan menunggak untuk data ini. Jika internet Anda mati, hubungi kami.
          </p>
        </section>

        <div class="mt-8 grid gap-6">
          <IsolirHelpBlock :phone="tenant.phone" :email="tenant.email" />
          <IsolirFaq />
        </div>
      </template>
    </main>
  </div>
</template>
