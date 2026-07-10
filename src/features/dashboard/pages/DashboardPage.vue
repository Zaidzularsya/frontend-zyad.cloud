<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { CreditCard, FileClock, FileText, Sparkles } from 'lucide-vue-next'

import BaseCard from '@/components/ui/BaseCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  useBillingInvoicesQuery,
  useCurrentBillingPlanQuery,
} from '@/features/billing/api/billing.queries'
import { useTenantStore } from '@/stores/tenant.store'
import { formatCurrency, formatDate } from '@/lib/utils'

const tenantStore = useTenantStore()
const { activeTenantId } = storeToRefs(tenantStore)
const organizationId = computed(() => activeTenantId.value ?? undefined)

const allInvoicesParams = computed(() => ({ page: 1, per_page: 5 }))
const openInvoicesParams = computed(() => ({ page: 1, per_page: 1, status: 'open' as const }))

const currentPlanQuery = useCurrentBillingPlanQuery(organizationId)
const recentInvoicesQuery = useBillingInvoicesQuery(organizationId, allInvoicesParams)
const openInvoicesQuery = useBillingInvoicesQuery(organizationId, openInvoicesParams)

const currentSubscription = computed(() => currentPlanQuery.data.value?.subscription ?? null)
const currentPlanName = computed(
  () => currentSubscription.value?.plan?.name || 'Belum berlangganan',
)
const currentPlanStatus = computed(() => currentSubscription.value?.status ?? null)

const totalInvoices = computed(() => recentInvoicesQuery.data.value?.meta?.total ?? null)
const totalOpenInvoices = computed(() => openInvoicesQuery.data.value?.meta?.total ?? null)
const recentInvoices = computed(() => recentInvoicesQuery.data.value?.data ?? [])

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  open: 'Belum Dibayar',
  paid: 'Lunas',
  void: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  failed: 'Gagal',
}

const statusTone: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  open: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  void: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  failed: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
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
            v-if="currentPlanStatus"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {{ currentPlanStatus }}
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500">Paket Aktif</p>
        <p
          v-if="currentPlanQuery.isLoading.value"
          class="mt-1 h-8 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold">{{ currentPlanName }}</p>
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
          v-if="recentInvoicesQuery.isLoading.value"
          class="mt-1 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold">{{ totalInvoices ?? '—' }}</p>
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
          v-if="openInvoicesQuery.isLoading.value"
          class="mt-1 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
        />
        <p v-else class="mt-1 text-2xl font-bold">{{ totalOpenInvoices ?? '—' }}</p>
      </BaseCard>
    </div>

    <BaseCard>
      <h2 class="font-semibold">Invoice Terbaru</h2>
      <div v-if="recentInvoicesQuery.isLoading.value" class="mt-5 space-y-3">
        <div
          v-for="n in 3"
          :key="n"
          class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
        />
      </div>
      <p v-else-if="!recentInvoices.length" class="mt-5 text-sm text-gray-500">
        Belum ada invoice untuk workspace ini.
      </p>
      <div v-else class="mt-5 space-y-3">
        <div
          v-for="invoice in recentInvoices"
          :key="invoice.id"
          class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 dark:border-gray-800"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ invoice.invoice_number }}</p>
            <p class="text-xs text-gray-500">
              {{ invoice.due_date ? formatDate(invoice.due_date) : '—' }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="statusTone[invoice.status] ?? 'bg-gray-100 text-gray-600'"
            >
              {{ statusLabel[invoice.status] ?? invoice.status }}
            </span>
            <span class="text-sm font-semibold">{{
              formatCurrency(Number(invoice.total_amount))
            }}</span>
          </div>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="border-dashed">
      <div class="flex items-center gap-3">
        <span
          class="grid size-9 place-items-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800"
        >
          <Sparkles class="size-4" />
        </span>
        <div>
          <p class="text-sm font-medium">CRM &amp; Pipeline Penjualan — Segera Hadir</p>
          <p class="text-xs text-gray-500">
            Modul CRM (kontak, pipeline, deal) belum tersedia di backend saat ini.
          </p>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
