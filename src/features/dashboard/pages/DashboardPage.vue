<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, CreditCard, FileClock, FileText, Waypoints } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { selfServeApi, type SubscriptionView } from '@/features/customer/api/self-serve.api'
import {
  formatDay,
  invoiceStatusLabel,
  isPayable,
  statusBanner,
} from '@/features/customer/utils/subscription-view'
import { formatCurrency } from '@/lib/utils'

const view = ref<SubscriptionView | null>(null)
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try {
    view.value = await selfServeApi.subscription()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

const planName = computed(() => {
  if (!view.value) return '—'
  return view.value.product?.name ?? 'Paket Free'
})
const planStatus = computed(() => (view.value ? statusBanner(view.value).title : ''))
const invoices = computed(() => view.value?.invoices ?? [])
const totalInvoices = computed(() => invoices.value.length)
const openInvoices = computed(() => invoices.value.filter((i) => isPayable(i.status)).length)
const recentInvoices = computed(() => invoices.value.slice(0, 5))

const statusTone: Record<string, string> = {
  issued: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  overdue: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  void: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Dashboard"
      description="Ringkasan langganan, tagihan, dan aktivitas terbaru workspace Anda."
    />

    <div class="grid gap-4 md:grid-cols-3">
      <BaseCard>
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <CreditCard class="size-5" />
          </span>
          <span
            v-if="planStatus"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {{ planStatus }}
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">Paket Aktif</p>
        <p
          v-if="loading"
          class="mt-1 h-8 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold">{{ planName }}</p>
      </BaseCard>

      <BaseCard>
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <FileText class="size-5" />
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">Total Invoice</p>
        <p
          v-if="loading"
          class="mt-1 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold" data-test="total-invoices">
          {{ failed ? '—' : totalInvoices }}
        </p>
      </BaseCard>

      <BaseCard>
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50"
          >
            <FileClock class="size-5" />
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">Invoice Belum Dibayar</p>
        <p
          v-if="loading"
          class="mt-1 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold" data-test="open-invoices">
          {{ failed ? '—' : openInvoices }}
        </p>
      </BaseCard>
    </div>

    <BaseCard>
      <h2 class="font-semibold">Invoice Terbaru</h2>
      <div v-if="loading" class="mt-5 space-y-3">
        <div
          v-for="n in 3"
          :key="n"
          class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
        />
      </div>
      <p v-else-if="failed" class="mt-5 text-sm text-red-600">
        Gagal memuat langganan. Muat ulang halaman untuk mencoba lagi.
      </p>
      <p v-else-if="!recentInvoices.length" class="mt-5 text-sm text-gray-500">
        Belum ada invoice untuk workspace ini.
      </p>
      <div v-else class="mt-5 space-y-3">
        <div
          v-for="invoice in recentInvoices"
          :key="invoice.number"
          class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 dark:border-gray-800"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ invoice.number }}</p>
            <p class="text-xs text-gray-500">
              {{ invoice.due_date ? formatDay(invoice.due_date) : '—' }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="statusTone[invoice.status] ?? 'bg-gray-100 text-gray-600'"
            >
              {{ invoiceStatusLabel(invoice.status) }}
            </span>
            <span class="text-sm font-semibold">{{ formatCurrency(Number(invoice.total)) }}</span>
          </div>
        </div>
      </div>
    </BaseCard>

    <RouterLink
      :to="{ name: 'crm-deals' }"
      class="flex items-center gap-3 rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
    >
      <span
        class="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950"
      >
        <Waypoints class="size-4" />
      </span>
      <div class="flex-1">
        <p class="text-sm font-medium">CRM &amp; Pipeline Penjualan</p>
        <p class="text-xs text-gray-500">Kelola kontak, deal, dan pipeline penjualan Anda.</p>
      </div>
      <ChevronRight class="size-4 text-gray-400" />
    </RouterLink>
  </div>
</template>
