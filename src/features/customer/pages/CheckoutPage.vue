<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCreateInvoiceCheckoutMutation,
  useCurrentBillingPlanQuery,
  useRequestBillingUpgradeMutation,
} from '@/features/billing/api/billing.queries'
import type { BillingInterval } from '@/features/billing/api/billing.api'
import { publicCatalogApi, type PublicCatalogPlan } from '@/features/public/api/public-catalog.api'
import { formatCurrency } from '@/lib/utils'
import { useTenantStore } from '@/stores/tenant.store'

const route = useRoute()
const router = useRouter()
const tenantStore = useTenantStore()
const { activeTenantId } = storeToRefs(tenantStore)
const organizationId = computed(() => activeTenantId.value ?? undefined)

const planCode = computed(() =>
  typeof route.query.plan === 'string' ? route.query.plan.trim() : '',
)
const requestedInterval = computed(() =>
  typeof route.query.interval === 'string' && route.query.interval.trim()
    ? route.query.interval.trim()
    : 'monthly',
)

const catalogLoading = ref(true)
const catalogError = ref('')
const plan = ref<PublicCatalogPlan | null>(null)

const currentPlanQuery = useCurrentBillingPlanQuery(organizationId)
const requestUpgradeMutation = useRequestBillingUpgradeMutation()
const createCheckoutMutation = useCreateInvoiceCheckoutMutation()

const selectedPrice = computed(() => {
  if (!plan.value) return null
  return (
    plan.value.prices.find((price) => price.billing_interval === requestedInterval.value) ??
    plan.value.prices[0] ??
    null
  )
})

const isFreePlan = computed(() => !selectedPrice.value || Number(selectedPrice.value.amount) === 0)

const isCurrentPlan = computed(() => {
  const currentCode = currentPlanQuery.data.value?.subscription?.plan?.code
  return Boolean(currentCode && plan.value && currentCode === plan.value.code)
})

const submitError = ref('')
const isSubmitting = computed(
  () => requestUpgradeMutation.isPending.value || createCheckoutMutation.isPending.value,
)

onMounted(async () => {
  if (!planCode.value) {
    void router.replace('/app/billing')
    return
  }
  try {
    const plans = await publicCatalogApi.listPlans()
    const found = plans.find((item) => item.code === planCode.value) ?? null
    if (!found) {
      void router.replace('/app/billing')
      return
    }
    plan.value = found
    if (!found.prices.length || Number(found.prices[0]?.amount ?? '0') === 0) {
      const hasPaidPrice = found.prices.some((price) => Number(price.amount) > 0)
      if (!hasPaidPrice) {
        // Paket gratis tidak melewati checkout — subscription free sudah
        // otomatis tersedia.
        void router.replace('/app/billing')
        return
      }
    }
  } catch {
    catalogError.value = 'Katalog paket tidak dapat dimuat. Coba muat ulang halaman.'
  } finally {
    catalogLoading.value = false
  }
})

function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount)
  if (Number.isNaN(numeric)) return amount
  return formatCurrency(numeric, currency || 'IDR')
}

function extractError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Permintaan gagal diproses.'
  }
  return error instanceof Error ? error.message : 'Permintaan gagal diproses.'
}

async function proceedToPayment() {
  if (!plan.value || !selectedPrice.value) return
  submitError.value = ''
  try {
    const invoice = await requestUpgradeMutation.mutateAsync({
      plan_id: plan.value.id,
      billing_interval: selectedPrice.value.billing_interval as BillingInterval,
    })
    const checkout = await createCheckoutMutation.mutateAsync(invoice.id)
    window.location.href = checkout.payment_url
  } catch (error) {
    submitError.value = extractError(error)
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <PageHeader
      title="Checkout"
      description="Periksa ringkasan pesanan Anda sebelum melanjutkan ke pembayaran."
    />

    <div v-if="catalogLoading" class="space-y-4">
      <BaseCard class="h-48 animate-pulse bg-gray-50 dark:bg-gray-950" />
    </div>

    <BaseCard v-else-if="catalogError">
      <p class="text-sm text-red-700">{{ catalogError }}</p>
    </BaseCard>

    <template v-else-if="plan && selectedPrice && !isFreePlan">
      <BaseCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Paket dipilih</p>
            <h2 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {{ plan.name }}
            </h2>
            <p v-if="plan.description" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ plan.description }}
            </p>
          </div>
          <span
            class="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950"
          >
            <ShieldCheck class="size-5" />
          </span>
        </div>

        <ul
          v-if="plan.benefits.length"
          class="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-300"
        >
          <li v-for="benefit in plan.benefits" :key="benefit.label" class="flex gap-2">
            <span class="text-brand-600">✓</span>
            <span>
              {{ benefit.label }}<template v-if="benefit.value">: {{ benefit.value }}</template>
            </span>
          </li>
        </ul>

        <div
          class="mt-6 flex items-center justify-between rounded-2xl border border-gray-200/80 px-4 py-3 dark:border-gray-800"
        >
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-400">Total tagihan</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {{ formatMoney(selectedPrice.amount, selectedPrice.currency) }}
            </p>
          </div>
          <span
            class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            per {{ selectedPrice.billing_interval === 'yearly' ? 'tahun' : 'bulan' }}
          </span>
        </div>

        <p
          v-if="isCurrentPlan"
          class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          Anda sudah berada di paket ini. Pilih paket lain dari halaman
          <RouterLink to="/app/billing" class="font-semibold underline">Billing</RouterLink>.
        </p>

        <p v-if="submitError" class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ submitError }}
        </p>

        <BaseButton
          class="mt-6 w-full"
          :disabled="isSubmitting || isCurrentPlan"
          @click="proceedToPayment"
        >
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          <ArrowRight v-else class="size-4" />
          {{ isSubmitting ? 'Menyiapkan pembayaran...' : 'Lanjut ke Pembayaran' }}
        </BaseButton>

        <p class="mt-4 text-center text-xs text-gray-500">
          Pembayaran diproses aman oleh DOKU. Dengan melanjutkan, Anda menyetujui
          <RouterLink :to="{ name: 'legal-terms' }" class="font-semibold underline"
            >Syarat &amp; Ketentuan</RouterLink
          >
          dan
          <RouterLink :to="{ name: 'legal-refund' }" class="font-semibold underline"
            >Kebijakan Refund</RouterLink
          >.
        </p>
      </BaseCard>
    </template>
  </div>
</template>
