<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleAlert, CircleCheck, Clock, Info, Loader2 } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { selfServeApi, type SubscriptionView } from '@/features/customer/api/self-serve.api'
import {
  formatDay,
  invoiceStatusLabel,
  isPayable,
  statusBanner,
} from '@/features/customer/utils/subscription-view'
import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import {
  publicCatalogApi,
  type PublicListing,
  type PublicListingVariant,
} from '@/features/public/api/public-catalog.api'
import { formatCurrency } from '@/lib/utils'

const router = useRouter()

const view = ref<SubscriptionView | null>(null)
const loading = ref(true)
const loadError = ref('')

const banner = computed(() => (view.value ? statusBanner(view.value) : null))
const bannerClass = computed(() => {
  switch (banner.value?.tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-800'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800'
  }
})
const bannerIcon = computed(() => {
  switch (banner.value?.tone) {
    case 'success':
      return CircleCheck
    case 'warning':
      return Clock
    case 'danger':
      return CircleAlert
    default:
      return Info
  }
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    view.value = await selfServeApi.subscription()
  } catch {
    loadError.value = 'Data langganan tidak dapat dimuat. Coba lagi.'
  } finally {
    loading.value = false
  }
}

function money(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : formatCurrency(parsed)
}

// ---- Pilih paket (hanya saat Free): listing katalog → varian → /app/checkout?product= ----
const pickerOpen = ref(false)
const catalogListings = ref<PublicListing[]>([])
const catalogLoading = ref(false)
const catalogError = ref('')
const pick = reactive({ listing_code: '', product_id: '' })

const selectablePlans = computed(() =>
  catalogListings.value.filter((listing) => purchasable(listing).length > 0),
)
const selectedVariants = computed(() => {
  const listing = selectablePlans.value.find((l) => l.code === pick.listing_code)
  return listing ? purchasable(listing) : []
})

function purchasable(listing: PublicListing) {
  return listing.variants.filter((variant) => variant.checkout_enabled)
}

function frequencyLabel(variant: PublicListingVariant) {
  return FREQUENCIES.find((f) => f.value === variant.billing_frequency)?.label ?? 'Sekali bayar'
}

function priceLabel(listing: PublicListing) {
  const variants = purchasable(listing)
  const variant =
    variants.find((v) => v.product_id === pick.product_id) ??
    variants.find((v) => v.billing_frequency === 'monthly') ??
    variants[0]
  if (!variant) return '-'
  const suffix = FREQUENCIES.find((f) => f.value === variant.billing_frequency)?.suffix ?? ''
  return `${money(variant.price_with_tax)}${suffix}`
}

function selectPlan(listing: PublicListing) {
  pick.listing_code = listing.code
  const variants = purchasable(listing)
  if (!variants.some((v) => v.product_id === pick.product_id)) {
    const monthly = variants.find((v) => v.billing_frequency === 'monthly')
    pick.product_id = (monthly ?? variants[0])?.product_id ?? ''
  }
}

async function openPicker() {
  pick.listing_code = ''
  pick.product_id = ''
  pickerOpen.value = true
  if (catalogListings.value.length) return
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const categories = await publicCatalogApi.listListings()
    catalogListings.value = categories.flatMap((category) => category.listings)
  } catch {
    catalogError.value = 'Katalog paket tidak dapat dimuat.'
  } finally {
    catalogLoading.value = false
  }
}

function submitPick() {
  if (!pick.product_id) return
  pickerOpen.value = false
  void router.push(`/app/checkout?product=${encodeURIComponent(pick.product_id)}`)
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Langganan" description="Paket, fitur, dan tagihan workspace ini." />

    <div v-if="loading" class="space-y-3" data-testid="subscription-loading">
      <div class="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"></div>
      <div class="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"></div>
    </div>

    <div
      v-else-if="loadError"
      class="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      <span>{{ loadError }}</span>
      <BaseButton variant="outline" @click="load">Muat ulang</BaseButton>
    </div>

    <template v-else-if="view && banner">
      <div
        class="flex items-start gap-3 rounded-2xl border px-4 py-3"
        :class="bannerClass"
        data-testid="subscription-banner"
        role="status"
      >
        <component :is="bannerIcon" class="mt-0.5 size-5 shrink-0" />
        <div>
          <p class="font-semibold">{{ banner.title }}</p>
          <p class="text-sm">{{ banner.text }}</p>
        </div>
      </div>

      <BaseCard>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Paket</p>
            <p class="mt-1 text-lg font-semibold" data-testid="subscription-product">
              {{ view.product?.name ?? 'Free' }}
            </p>
            <p v-if="view.contract_number" class="text-xs text-gray-500">
              Kontrak {{ view.contract_number }}
            </p>
          </div>
          <BaseButton v-if="view.status === 'free'" @click="openPicker">Pilih paket</BaseButton>
        </div>
        <ul v-if="view.features.length" class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="feature in view.features"
            :key="feature.feature_key"
            class="flex items-center gap-2 text-sm"
          >
            <CircleCheck class="size-4 shrink-0 text-emerald-600" />
            {{ feature.label || feature.feature_key }}
          </li>
        </ul>
      </BaseCard>

      <BaseCard>
        <h2 class="text-base font-semibold">Invoice</h2>
        <p v-if="!view.invoices.length" class="mt-3 text-sm text-gray-500">Belum ada invoice.</p>
        <div v-else class="mt-3 overflow-x-auto">
          <table class="w-full text-left text-sm" data-testid="subscription-invoices">
            <thead class="text-xs uppercase text-gray-500">
              <tr>
                <th class="py-2 pr-4 font-medium">Nomor</th>
                <th class="py-2 pr-4 font-medium">Periode</th>
                <th class="py-2 pr-4 font-medium">Jatuh tempo</th>
                <th class="py-2 pr-4 text-right font-medium">Total</th>
                <th class="py-2 pr-4 font-medium">Status</th>
                <th class="py-2 font-medium"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="invoice in view.invoices" :key="invoice.number">
                <td class="py-2 pr-4 font-medium">{{ invoice.number }}</td>
                <td class="py-2 pr-4">{{ invoice.period_label || '-' }}</td>
                <td class="py-2 pr-4">{{ formatDay(invoice.due_date) }}</td>
                <td class="py-2 pr-4 text-right tabular-nums">{{ money(invoice.total) }}</td>
                <td class="py-2 pr-4">{{ invoiceStatusLabel(invoice.status) }}</td>
                <td class="py-2 text-right">
                  <a
                    v-if="isPayable(invoice.status) && invoice.url"
                    :href="invoice.url"
                    class="font-semibold text-brand-600 hover:underline"
                    data-testid="pay-link"
                    >Bayar</a
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </template>

    <BaseModal :open="pickerOpen" title="Pilih paket" @close="pickerOpen = false">
      <form class="space-y-4" @submit.prevent="submitPick">
        <div v-if="catalogLoading" class="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 class="size-4 animate-spin" /> Memuat paket…
        </div>
        <p v-else-if="catalogError" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ catalogError }}
        </p>
        <p v-else-if="!selectablePlans.length" class="text-sm text-gray-500">
          Belum ada paket yang bisa dibeli saat ini.
        </p>
        <div v-else class="space-y-3">
          <button
            v-for="plan in selectablePlans"
            :key="plan.code"
            type="button"
            class="w-full rounded-2xl border p-4 text-left transition"
            :class="
              pick.listing_code === plan.code
                ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                : 'border-gray-200/80 hover:border-brand-300 dark:border-gray-800'
            "
            @click="selectPlan(plan)"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="font-semibold">{{ plan.name }}</p>
              <p class="shrink-0 text-sm font-semibold text-brand-600">{{ priceLabel(plan) }}</p>
            </div>
          </button>
          <div v-if="selectedVariants.length > 1" class="space-y-2">
            <label class="text-sm font-medium" for="sub-frequency">Frekuensi penagihan</label>
            <select
              id="sub-frequency"
              v-model="pick.product_id"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option
                v-for="variant in selectedVariants"
                :key="variant.product_id"
                :value="variant.product_id"
              >
                {{ frequencyLabel(variant) }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" @click="pickerOpen = false">Batal</BaseButton>
          <BaseButton type="submit" :disabled="!pick.product_id">Lanjut ke Checkout</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
