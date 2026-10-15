<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import { selfServeApi, selfServeErrorCode } from '@/features/customer/api/self-serve.api'
import {
  publicCatalogApi,
  type PublicListing,
  type PublicListingVariant,
} from '@/features/public/api/public-catalog.api'
import { formatCurrency } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const RETRY_DELAY_MS = 2000
const MAX_RETRIES = 5

const productId = computed(() =>
  typeof route.query.product === 'string' ? route.query.product.trim() : '',
)

const loading = ref(true)
const loadError = ref('')
const listing = ref<PublicListing | null>(null)
const variant = ref<PublicListingVariant | null>(null)

const frequency = computed(() =>
  FREQUENCIES.find((f) => f.value === variant.value?.billing_frequency),
)
const frequencyUnit = computed(() => frequency.value?.suffix.replace('/', '') ?? '')

type Notice = 'processing' | 'already-subscribed' | 'step-failed' | 'generic' | ''
const notice = ref<Notice>('')
const isSubmitting = ref(false)
let retries = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  if (!productId.value) {
    void router.replace('/app/billing')
    return
  }
  try {
    const categories = await publicCatalogApi.listListings()
    for (const category of categories) {
      for (const item of category.listings) {
        const found = item.variants.find((v) => v.product_id === productId.value)
        if (found) {
          listing.value = item
          variant.value = found
        }
      }
    }
    if (!variant.value || !variant.value.checkout_enabled) {
      void router.replace('/app/billing')
      return
    }
  } catch {
    loadError.value = 'Katalog paket tidak dapat dimuat. Coba muat ulang halaman.'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (retryTimer) clearTimeout(retryTimer)
})

function money(amount: string, currency: string) {
  const numeric = Number(amount)
  return Number.isNaN(numeric) ? amount : formatCurrency(numeric, currency || 'IDR')
}

async function pay() {
  if (isSubmitting.value || !variant.value) return
  isSubmitting.value = true
  notice.value = ''
  try {
    const result = await selfServeApi.checkout(variant.value.product_id)
    window.location.assign(result.invoice_url)
    return
  } catch (error) {
    const code = selfServeErrorCode(error)
    if (code === 'SELF_SERVE_IN_PROGRESS' && retries < MAX_RETRIES) {
      retries += 1
      notice.value = 'processing'
      retryTimer = setTimeout(() => {
        isSubmitting.value = false
        void pay()
      }, RETRY_DELAY_MS)
      return
    }
    if (code === 'SELF_SERVE_ALREADY_SUBSCRIBED') notice.value = 'already-subscribed'
    else if (code === 'SELF_SERVE_STEP_FAILED') notice.value = 'step-failed'
    else notice.value = 'generic'
  }
  isSubmitting.value = false
}

function retryManually() {
  retries = 0
  void pay()
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <PageHeader
      title="Checkout"
      description="Periksa ringkasan pesanan Anda sebelum melanjutkan ke pembayaran."
    />

    <div v-if="loading" class="space-y-4">
      <BaseCard class="h-48 animate-pulse bg-gray-50 dark:bg-gray-950" />
    </div>

    <BaseCard v-else-if="loadError">
      <p class="text-sm text-red-700">{{ loadError }}</p>
    </BaseCard>

    <BaseCard v-else-if="listing && variant">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Paket dipilih</p>
          <h2 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {{ listing.name }}
          </h2>
          <p class="mt-1 text-xs text-gray-500">
            <span data-testid="checkout-sku">{{ variant.sku }}</span>
            <template v-if="frequency"> · {{ frequency.label }}</template>
          </p>
          <p v-if="listing.description" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ listing.description }}
          </p>
        </div>
        <span
          class="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950"
        >
          <ShieldCheck class="size-5" />
        </span>
      </div>

      <ul
        v-if="listing.benefits.length"
        class="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-300"
      >
        <li v-for="benefit in listing.benefits" :key="benefit.label" class="flex gap-2">
          <span class="text-brand-600">✓</span>
          <span>{{ benefit.label }}</span>
        </li>
      </ul>

      <dl
        class="mt-6 space-y-2 rounded-2xl border border-gray-200/80 px-4 py-3 text-sm dark:border-gray-800"
      >
        <div class="flex justify-between">
          <dt class="text-gray-500">Harga</dt>
          <dd data-testid="checkout-base">{{ money(variant.base_price, variant.currency) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-gray-500">Pajak ({{ Number(variant.tax_percent) }}%)</dt>
          <dd data-testid="checkout-tax">
            {{
              money(
                String(Number(variant.price_with_tax) - Number(variant.base_price)),
                variant.currency,
              )
            }}
          </dd>
        </div>
        <div
          class="flex items-center justify-between border-t border-gray-200/80 pt-2 dark:border-gray-800"
        >
          <dt class="font-semibold text-gray-900 dark:text-gray-100">Total tagihan</dt>
          <dd
            data-testid="checkout-total"
            class="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ money(variant.price_with_tax, variant.currency) }}
          </dd>
        </div>
      </dl>

      <p
        v-if="frequencyUnit"
        data-testid="checkout-billing-note"
        class="mt-3 text-sm text-gray-500"
      >
        Mulai hari ini, ditagih ulang setiap {{ frequencyUnit }}.
      </p>

      <p
        v-if="notice === 'processing'"
        data-testid="checkout-notice"
        class="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700"
      >
        Memproses…
      </p>
      <p
        v-else-if="notice === 'already-subscribed'"
        data-testid="checkout-notice"
        class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
      >
        Workspace ini sudah berlangganan. Hubungi sales untuk pindah paket.
        <RouterLink to="/app/billing" class="font-semibold underline"
          >Ke halaman Billing</RouterLink
        >
      </p>
      <p
        v-else-if="notice === 'step-failed' || notice === 'generic'"
        data-testid="checkout-notice"
        class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{
          notice === 'step-failed'
            ? 'Pembayaran belum bisa disiapkan. Coba lagi.'
            : 'Permintaan gagal diproses. Coba lagi.'
        }}
      </p>

      <BaseButton
        v-if="notice === 'step-failed' || notice === 'generic'"
        class="mt-4 w-full"
        data-testid="checkout-retry"
        variant="outline"
        :disabled="isSubmitting"
        @click="retryManually"
      >
        Coba lagi
      </BaseButton>
      <BaseButton
        v-else-if="notice !== 'already-subscribed'"
        class="mt-6 w-full"
        data-testid="checkout-pay"
        :disabled="isSubmitting"
        @click="pay"
      >
        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
        <ArrowRight v-else class="size-4" />
        {{ isSubmitting ? 'Menyiapkan pembayaran...' : 'Bayar sekarang' }}
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
  </div>
</template>
