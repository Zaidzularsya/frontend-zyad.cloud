<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
  AlarmClock,
  ArrowUpRight,
  Bot,
  CircleAlert,
  CreditCard,
  FileText,
  Loader2,
  MessageSquareMore,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  type BillingInvoiceStatus,
  type BillingUsageItem,
} from '@/features/billing/api/billing.api'
import {
  useBillingInvoicesQuery,
  useCreateInvoiceCheckoutMutation,
  useCurrentBillingPlanQuery,
  useScheduleBillingCancellationMutation,
} from '@/features/billing/api/billing.queries'
import { publicCatalogApi, type PublicCatalogPlan } from '@/features/public/api/public-catalog.api'
import { useTenantStore } from '@/stores/tenant.store'
import { formatCurrency, formatDate } from '@/lib/utils'

const tenantStore = useTenantStore()
const { activeTenantId } = storeToRefs(tenantStore)
const organizationId = computed(() => activeTenantId.value ?? undefined)

const invoiceFilters = reactive({
  page: 1,
  per_page: 10,
  status: '' as BillingInvoiceStatus | '',
})
const invoiceQueryParams = computed(() => ({
  page: invoiceFilters.page,
  per_page: invoiceFilters.per_page,
  status: invoiceFilters.status,
}))

const router = useRouter()

const upgradeModalOpen = ref(false)
const cancelModalOpen = ref(false)
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

const upgradeForm = reactive({
  plan_code: '',
  billing_interval: 'monthly',
})

const cancelForm = reactive({
  reason: '',
})

const catalogPlans = ref<PublicCatalogPlan[]>([])
const catalogLoading = ref(false)
const catalogError = ref('')

const currentPlanQuery = useCurrentBillingPlanQuery(organizationId)
const invoicesQuery = useBillingInvoicesQuery(organizationId, invoiceQueryParams)
const scheduleCancellationMutation = useScheduleBillingCancellationMutation()
const createCheckoutMutation = useCreateInvoiceCheckoutMutation()
const payingInvoiceId = ref('')

onMounted(async () => {
  catalogLoading.value = true
  catalogError.value = ''
  try {
    catalogPlans.value = await publicCatalogApi.listPlans()
  } catch {
    catalogError.value = 'Katalog paket tidak dapat dimuat.'
  } finally {
    catalogLoading.value = false
  }
})

const currentSubscription = computed(() => currentPlanQuery.data.value?.subscription ?? null)
const currentPlanName = computed(() => currentSubscription.value?.plan?.name || 'Plan aktif')
const currentPlanCode = computed(() => currentSubscription.value?.plan?.code || 'custom')
const currentPlanStatus = computed(() => currentSubscription.value?.status || 'active')
const currentUsage = computed(() => currentPlanQuery.data.value?.usage ?? [])
const invoices = computed(() => invoicesQuery.data.value?.data ?? [])
const invoicesMeta = computed(() => invoicesQuery.data.value?.meta ?? null)

const heroTone = computed(() => {
  if (currentPlanStatus.value === 'suspended') return 'from-amber-500 to-orange-500'
  if (currentSubscription.value?.cancel_at_period_end) return 'from-sky-500 to-cyan-500'
  return 'from-brand-600 to-indigo-500'
})

const billingSummary = computed(() => {
  const openInvoices = invoices.value.filter((invoice) => invoice.status === 'open').length
  const paidInvoices = invoices.value.filter((invoice) => invoice.status === 'paid').length
  const nextDueInvoice = invoices.value.find(
    (invoice) => invoice.status === 'open' && invoice.due_date,
  )

  return [
    {
      label: 'Plan aktif',
      value: currentPlanName.value,
      helper: currentPlanCode.value.toUpperCase(),
      icon: ShieldCheck,
    },
    {
      label: 'Invoice terbuka',
      value: String(openInvoices),
      helper: nextDueInvoice?.due_date ? `Jatuh tempo ${formatDate(nextDueInvoice.due_date)}` : '-',
      icon: ReceiptText,
    },
    {
      label: 'Invoice lunas',
      value: String(paidInvoices),
      helper: invoicesMeta.value ? `${invoicesMeta.value.total} total catatan` : '-',
      icon: FileText,
    },
  ]
})

function formatMoney(value: string, currency = 'IDR') {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return formatCurrency(parsed, currency)
}

function statusBadgeClass(status: string) {
  if (status === 'paid' || status === 'active')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'open' || status === 'trialing' || status === 'grace_period')
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'suspended' || status === 'past_due')
    return 'bg-orange-50 text-orange-700 ring-orange-200'
  if (status === 'void' || status === 'canceled' || status === 'expired' || status === 'failed')
    return 'bg-gray-100 text-gray-600 ring-gray-200'
  return 'bg-sky-50 text-sky-700 ring-sky-200'
}

function usageAccent(item: BillingUsageItem) {
  if (item.feature_key.includes('whatsapp')) return MessageSquareMore
  if (item.feature_key.includes('automation')) return Bot
  return AlarmClock
}

function usagePercent(item: BillingUsageItem) {
  const used = Number(item.used_value)
  const limit = Number(item.limit_value ?? '')
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function openUpgradeModal() {
  feedback.value = null
  upgradeForm.plan_code = ''
  upgradeForm.billing_interval = 'monthly'
  upgradeModalOpen.value = true
}

function openCancelModal() {
  feedback.value = null
  cancelModalOpen.value = true
}

const selectablePlans = computed(() =>
  catalogPlans.value.filter(
    (plan) =>
      plan.code !== currentPlanCode.value && plan.prices.some((price) => Number(price.amount) > 0),
  ),
)

const selectedUpgradePlan = computed(
  () => selectablePlans.value.find((plan) => plan.code === upgradeForm.plan_code) ?? null,
)

const selectedPlanIntervals = computed(() => {
  if (!selectedUpgradePlan.value) return []
  return selectedUpgradePlan.value.prices
    .filter((price) => Number(price.amount) > 0)
    .map((price) => price.billing_interval)
})

function selectUpgradePlan(plan: PublicCatalogPlan) {
  upgradeForm.plan_code = plan.code
  const intervals = plan.prices
    .filter((price) => Number(price.amount) > 0)
    .map((price) => price.billing_interval)
  if (!intervals.includes(upgradeForm.billing_interval)) {
    upgradeForm.billing_interval = intervals[0] ?? 'monthly'
  }
}

function planPriceLabel(plan: PublicCatalogPlan) {
  const price =
    plan.prices.find((item) => item.billing_interval === upgradeForm.billing_interval) ??
    plan.prices.find((item) => Number(item.amount) > 0)
  if (!price) return '-'
  return `${formatMoney(price.amount, price.currency)} / ${price.billing_interval}`
}

function submitUpgrade() {
  if (!upgradeForm.plan_code) return
  upgradeModalOpen.value = false
  // Satu jalur checkout untuk semua: halaman checkout yang membuat invoice
  // dan sesi pembayaran DOKU saat tombol bayar diklik.
  void router.push(
    `/app/checkout?plan=${encodeURIComponent(upgradeForm.plan_code)}&interval=${encodeURIComponent(upgradeForm.billing_interval)}`,
  )
}

async function payInvoice(invoiceId: string) {
  feedback.value = null
  payingInvoiceId.value = invoiceId
  try {
    const checkout = await createCheckoutMutation.mutateAsync(invoiceId)
    window.location.href = checkout.payment_url
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
    payingInvoiceId.value = ''
  }
}

async function submitCancellation() {
  feedback.value = null
  try {
    await scheduleCancellationMutation.mutateAsync({
      reason: cancelForm.reason.trim() || undefined,
    })
    cancelModalOpen.value = false
    feedback.value = {
      tone: 'success',
      message: 'Langganan berhasil dijadwalkan berhenti di akhir periode aktif.',
    }
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
  }
}

function extractError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Permintaan gagal diproses.'
  }
  return error instanceof Error ? error.message : 'Permintaan gagal diproses.'
}

const isRefreshing = computed(
  () => currentPlanQuery.isFetching.value || invoicesQuery.isFetching.value,
)

function refreshBillingData() {
  void currentPlanQuery.refetch()
  void invoicesQuery.refetch()
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Plan & Billing"
      description="Pantau status langganan, invoice terbaru, dan ringkasan penggunaan workspace."
    >
      <BaseButton variant="outline" :disabled="isRefreshing" @click="refreshBillingData">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isRefreshing }" />
        Refresh
      </BaseButton>
    </PageHeader>

    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg"
      :class="heroTone"
    >
      <div class="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
      <div class="absolute bottom-0 right-12 h-28 w-28 rounded-full bg-black/10 blur-2xl"></div>
      <div class="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-2xl space-y-3">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]"
          >
            <CreditCard class="size-3.5" />
            Customer Billing
          </div>
          <div>
            <p class="text-sm text-white/80">Plan saat ini</p>
            <h2 class="text-3xl font-semibold tracking-tight">{{ currentPlanName }}</h2>
            <p class="mt-2 max-w-xl text-sm text-white/80">
              Status langganan Anda saat ini
              <span class="font-semibold text-white">{{ currentPlanStatus }}</span
              >.
              <span v-if="currentSubscription?.cancel_at_period_end">
                Akses masih aktif sampai akhir periode billing berjalan.
              </span>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <BaseButton
            variant="secondary"
            :disabled="scheduleCancellationMutation.isPending.value"
            @click="openCancelModal"
          >
            <CircleAlert class="size-4" />
            Jadwalkan Cancel
          </BaseButton>
          <BaseButton @click="openUpgradeModal">
            <ArrowUpRight class="size-4" />
            Upgrade Paket
          </BaseButton>
        </div>
      </div>
    </div>

    <div
      v-if="feedback"
      class="rounded-2xl border px-4 py-3 text-sm"
      :class="
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      "
    >
      {{ feedback.message }}
    </div>

    <div v-if="currentPlanQuery.isLoading.value" class="grid gap-4 md:grid-cols-3">
      <BaseCard
        v-for="index in 3"
        :key="index"
        class="h-32 animate-pulse bg-gray-50 dark:bg-gray-950"
      />
    </div>

    <div v-else class="grid gap-4 md:grid-cols-3">
      <BaseCard v-for="item in billingSummary" :key="item.label">
        <div class="flex items-start justify-between">
          <span
            class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <component :is="item.icon" class="size-5" />
          </span>
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
            :class="statusBadgeClass(currentPlanStatus)"
          >
            {{ currentPlanStatus }}
          </span>
        </div>
        <p class="mt-5 text-sm text-gray-500 dark:text-gray-400">{{ item.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ item.value }}</p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ item.helper }}</p>
      </BaseCard>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <BaseCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold">Usage bulan berjalan</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ringkasan fitur billing yang berbasis usage counter.
            </p>
          </div>
          <span
            class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {{ currentUsage.length }} metrics
          </span>
        </div>

        <div v-if="currentUsage.length" class="mt-6 space-y-4">
          <div
            v-for="usage in currentUsage"
            :key="usage.feature_key"
            class="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-800"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex gap-3">
                <span
                  class="grid size-11 place-items-center rounded-2xl bg-gray-50 text-brand-600 dark:bg-gray-950"
                >
                  <component :is="usageAccent(usage)" class="size-5" />
                </span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {{ usage.feature_key }}
                  </p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ usage.metric_key || 'usage' }}
                    <span v-if="usage.period_start && usage.period_end">
                      · {{ formatDate(usage.period_start) }} - {{ formatDate(usage.period_end) }}
                    </span>
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ usage.used_value }}
                  <span v-if="usage.limit_value" class="text-gray-400"
                    >/ {{ usage.limit_value }}</span
                  >
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Sisa {{ usage.remaining_value ?? '-' }}
                </p>
              </div>
            </div>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                class="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400"
                :style="{ width: `${usagePercent(usage)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-6 rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          Belum ada usage counter billing yang aktif untuk workspace ini.
        </div>
      </BaseCard>

      <BaseCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold">Invoice terbaru</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Invoice self-service terbaru untuk workspace aktif.
            </p>
          </div>
          <span
            v-if="invoicesMeta"
            class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {{ invoicesMeta.total }} invoices
          </span>
        </div>

        <div class="mt-5 flex items-center gap-3">
          <label class="text-sm text-gray-500 dark:text-gray-400">Status</label>
          <select
            v-model="invoiceFilters.status"
            class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
            <option value="expired">Expired</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div v-if="invoicesQuery.isLoading.value" class="mt-5 space-y-3">
          <div
            v-for="index in 3"
            :key="index"
            class="h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-950"
          ></div>
        </div>

        <div v-else-if="invoices.length" class="mt-5 space-y-3">
          <article
            v-for="invoice in invoices"
            :key="invoice.id"
            class="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-800"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">
                  {{ invoice.invoice_number }}
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Dibuat {{ formatDate(invoice.created_at) }}
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
                :class="statusBadgeClass(invoice.status)"
              >
                {{ invoice.status }}
              </span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p class="text-xs uppercase tracking-wide text-gray-400">Total</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatMoney(invoice.total_amount, invoice.currency) }}
                </p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-wide text-gray-400">Jatuh tempo</p>
                <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {{ invoice.due_date ? formatDate(invoice.due_date) : '-' }}
                </p>
              </div>
            </div>

            <p
              v-if="invoice.items?.[0]?.description"
              class="mt-4 text-sm text-gray-600 dark:text-gray-300"
            >
              {{ invoice.items[0].description }}
            </p>

            <div v-if="invoice.status === 'open'" class="mt-4">
              <BaseButton
                class="w-full"
                :disabled="createCheckoutMutation.isPending.value"
                @click="payInvoice(invoice.id)"
              >
                <Loader2 v-if="payingInvoiceId === invoice.id" class="size-4 animate-spin" />
                <CreditCard v-else class="size-4" />
                Bayar Sekarang
              </BaseButton>
            </div>
          </article>
        </div>

        <div
          v-else
          class="mt-5 rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          Belum ada invoice untuk workspace ini.
        </div>
      </BaseCard>
    </div>

    <BaseModal
      :open="upgradeModalOpen"
      title="Pilih paket upgrade"
      @close="upgradeModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitUpgrade">
        <div v-if="catalogLoading" class="space-y-3">
          <div
            v-for="index in 2"
            :key="index"
            class="h-20 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-950"
          ></div>
        </div>

        <p v-else-if="catalogError" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ catalogError }}
        </p>

        <p
          v-else-if="!selectablePlans.length"
          class="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          Tidak ada paket lain yang tersedia untuk upgrade saat ini.
        </p>

        <div v-else class="space-y-3">
          <button
            v-for="plan in selectablePlans"
            :key="plan.code"
            type="button"
            class="w-full rounded-2xl border p-4 text-left transition"
            :class="
              upgradeForm.plan_code === plan.code
                ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:bg-brand-950/40'
                : 'border-gray-200/80 hover:border-brand-300 dark:border-gray-800'
            "
            @click="selectUpgradePlan(plan)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-gray-900 dark:text-gray-100">{{ plan.name }}</p>
                <p v-if="plan.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ plan.description }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold text-brand-600">
                {{ planPriceLabel(plan) }}
              </p>
            </div>
          </button>

          <div v-if="selectedUpgradePlan" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200"
              >Billing interval</label
            >
            <select
              v-model="upgradeForm.billing_interval"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option v-for="interval in selectedPlanIntervals" :key="interval" :value="interval">
                {{
                  interval === 'yearly' ? 'Tahunan' : interval === 'monthly' ? 'Bulanan' : interval
                }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" @click="upgradeModalOpen = false">Batal</BaseButton>
          <BaseButton type="submit" :disabled="!upgradeForm.plan_code">
            Lanjut ke Checkout
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="cancelModalOpen"
      title="Jadwalkan penghentian langganan"
      @close="cancelModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitCancellation">
        <div
          class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          Workspace tetap aktif sampai akhir periode billing saat ini. Aksi ini tidak memutus akses
          secara langsung.
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Reason</label>
          <textarea
            v-model="cancelForm.reason"
            rows="3"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            placeholder="opsional"
          ></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" @click="cancelModalOpen = false">Batal</BaseButton>
          <BaseButton
            type="submit"
            variant="danger"
            :disabled="scheduleCancellationMutation.isPending.value"
          >
            <Loader2
              v-if="scheduleCancellationMutation.isPending.value"
              class="size-4 animate-spin"
            />
            Jadwalkan
          </BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
