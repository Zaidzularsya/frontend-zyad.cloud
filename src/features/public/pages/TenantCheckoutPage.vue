<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import BaseCard from '@/components/ui/BaseCard.vue'
import { FREQUENCIES } from '@/features/catalog/utils/pricing'
import type { PublicListing, PublicListingVariant } from '@/features/public/api/public-catalog.api'
import { tenantCheckoutApi, tenantCheckoutMessage } from '@/features/public/api/tenant-checkout.api'
import { useGoogleCredential } from '@/features/public/composables/useGoogleCredential'
import { formatCurrency } from '@/lib/utils'

const route = useRoute()
const productId = computed(() =>
  typeof route.params.productId === 'string' ? route.params.productId.trim() : '',
)

const loading = ref(true)
const listing = ref<PublicListing | null>(null)
const variant = ref<PublicListingVariant | null>(null)
const errorMessage = ref('')
const isSubmitting = ref(false)
const googleButton = ref<HTMLElement | null>(null)

const frequency = computed(() =>
  FREQUENCIES.find((f) => f.value === variant.value?.billing_frequency),
)

function money(amount: string, currency: string) {
  const numeric = Number(amount)
  return Number.isNaN(numeric) ? amount : formatCurrency(numeric, currency || 'IDR')
}

// Tujuan harus http(s) tanpa kredensial. Tidak wajib same-origin: backend membangun link invoice
// dari APP_FRONTEND_URL yang bisa berbeda dari host tenant. Mengembalikan href hasil parse.
function safeRedirectUrl(raw: string): string | null {
  if (!raw || raw.includes('\\') || raw.startsWith('//')) return null
  try {
    const url = new URL(raw, window.location.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

async function onCredential(credential: string) {
  if (isSubmitting.value || !variant.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const result = await tenantCheckoutApi.checkout(credential, variant.value.product_id)
    const target = safeRedirectUrl(result.invoice_url)
    if (!target) {
      errorMessage.value = 'Pembayaran belum bisa disiapkan. Coba lagi.'
    } else {
      window.location.assign(target)
      return // tetap "pending" sampai halaman berpindah
    }
  } catch (error) {
    errorMessage.value = tenantCheckoutMessage(error)
  }
  isSubmitting.value = false
}

const { googleEnabled, googleError } = useGoogleCredential({
  buttonRef: googleButton,
  onCredential: (credential) => void onCredential(credential),
})

async function loadProduct(id: string) {
  loading.value = true
  listing.value = null
  variant.value = null
  errorMessage.value = ''
  try {
    const categories = await tenantCheckoutApi.listCatalog()
    if (id !== productId.value) return // param berubah selagi memuat
    for (const category of categories) {
      for (const item of category.listings) {
        const found = item.variants.find((v) => v.product_id === id)
        if (found && found.checkout_enabled) {
          listing.value = item
          variant.value = found
        }
      }
    }
  } catch {
    // Katalog tidak termuat diperlakukan sama dengan produk tidak tersedia.
  } finally {
    if (id === productId.value) loading.value = false
  }
}

watch(productId, (id) => void loadProduct(id), { immediate: true })
</script>

<template>
  <main class="mx-auto max-w-xl px-4 py-10">
    <BaseCard v-if="loading" class="h-48 animate-pulse bg-gray-50 dark:bg-gray-950" />

    <BaseCard v-else-if="!listing || !variant" data-testid="checkout-unavailable">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Paket tidak ditemukan atau tidak tersedia
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Paket yang Anda pilih tidak tersedia untuk dibeli saat ini. Hubungi penjual untuk bantuan.
      </p>
    </BaseCard>

    <BaseCard v-else>
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Paket dipilih</p>
      <h1 class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {{ listing.name }}
      </h1>
      <p v-if="frequency" class="mt-1 text-xs text-gray-500">{{ frequency.label }}</p>
      <p v-if="listing.description" class="mt-2 text-sm text-gray-500">
        {{ listing.description }}
      </p>
      <ul v-if="listing.benefits.length" class="mt-4 space-y-2 text-sm text-gray-600">
        <li v-for="benefit in listing.benefits" :key="benefit.label" class="flex gap-2">
          <span class="text-brand-600" aria-hidden="true">✓</span>
          <span>{{ benefit.label }}</span>
        </li>
      </ul>

      <div
        class="mt-6 flex items-center justify-between rounded-2xl border border-gray-200/80 px-4 py-3 text-sm dark:border-gray-800"
      >
        <span class="font-semibold text-gray-900 dark:text-gray-100">Total tagihan</span>
        <span data-testid="checkout-total" class="text-xl font-semibold">
          {{ money(variant.price_with_tax, variant.currency) }}
        </span>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <div v-if="googleEnabled" class="mt-6">
        <!-- Tombol resmi GIS tidak bisa di-disable; saat pending diblok lewat pointer-events. -->
        <div
          ref="googleButton"
          data-testid="google-button"
          :aria-busy="isSubmitting"
          :class="{ 'pointer-events-none opacity-60': isSubmitting }"
        ></div>
        <p
          v-if="isSubmitting"
          role="status"
          aria-live="polite"
          class="mt-2 text-center text-sm text-gray-500"
        >
          Menyiapkan pembayaran...
        </p>
        <p v-if="googleError" class="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {{ googleError }}
        </p>
      </div>
      <p v-else class="mt-6 text-sm text-gray-500">
        Pembayaran dengan Google belum dikonfigurasi. Hubungi penjual.
      </p>

      <p class="mt-4 text-center text-xs text-gray-500">
        Setelah membayar, masuk dengan akun Google yang sama untuk mengakses layanan Anda.
      </p>
    </BaseCard>
  </main>
</template>
