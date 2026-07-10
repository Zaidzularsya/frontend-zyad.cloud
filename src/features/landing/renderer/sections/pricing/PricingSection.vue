<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { publicCatalogApi, type PublicCatalogPlan } from '@/features/public/api/public-catalog.api'
import { useAuthStore } from '@/stores/auth.store'

type PricingPlan = {
  name: string
  priceLabel: string
  features?: string[]
  code?: string
  interval?: string
  isFree?: boolean
  hasPrice?: boolean
}

const props = defineProps<{
  content: {
    title?: string
    source?: 'custom' | 'platform_catalog'
    billingInterval?: string
    plans?: PricingPlan[]
  }
}>()

const router = useRouter()
const auth = useAuthStore()

const catalogPlans = ref<PublicCatalogPlan[]>([])
const catalogLoading = ref(false)
const catalogError = ref(false)

const isCatalogSource = computed(() => props.content.source === 'platform_catalog')

onMounted(async () => {
  if (!isCatalogSource.value) return
  catalogLoading.value = true
  catalogError.value = false
  try {
    catalogPlans.value = await publicCatalogApi.listPlans()
  } catch (err) {
    console.error('PricingSection: failed to load public catalog plans', err)
    catalogError.value = true
  } finally {
    catalogLoading.value = false
  }
})

function formatAmount(amount: string, currency: string): string {
  const numeric = Number(amount)
  if (Number.isNaN(numeric)) return amount
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(numeric)
  } catch {
    return `${currency} ${amount}`
  }
}

const preferredInterval = computed(() => props.content.billingInterval || 'monthly')

const displayPlans = computed<PricingPlan[]>(() => {
  if (!isCatalogSource.value) return props.content.plans || []

  return catalogPlans.value.map((plan) => {
    const price =
      plan.prices.find((p) => p.billing_interval === preferredInterval.value) || plan.prices[0]
    const benefits = (plan.benefits ?? []).map((benefit) =>
      benefit.value ? `${benefit.label}: ${benefit.value}` : benefit.label,
    )
    const isFree = !price || Number(price.amount) === 0
    return {
      name: plan.name,
      priceLabel: price
        ? isFree
          ? 'Gratis'
          : `${formatAmount(price.amount, price.currency)} / ${price.billing_interval}`
        : 'Gratis',
      features: benefits.length ? benefits : plan.description ? [plan.description] : [],
      code: plan.code,
      interval: price?.billing_interval ?? preferredInterval.value,
      isFree,
      hasPrice: Boolean(price),
    }
  })
})

function checkoutPath(plan: PricingPlan) {
  const params = new URLSearchParams({
    plan: plan.code ?? '',
    interval: plan.interval ?? 'monthly',
  })
  return `/app/checkout?${params.toString()}`
}

function selectPlan(plan: PricingPlan) {
  if (!plan.code) return

  if (plan.isFree) {
    // Paket gratis: cukup punya akun — subscription free dibuat otomatis
    // saat registrasi.
    void router.push(auth.isAuthenticated ? '/app/dashboard' : '/auth/register')
    return
  }

  const target = checkoutPath(plan)
  if (auth.isAuthenticated) {
    void router.push(target)
    return
  }
  void router.push(`/auth/register?redirect=${encodeURIComponent(target)}`)
}
</script>

<template>
  <section id="pricing" class="bg-surface py-section-gap">
    <div class="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <h2 class="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          {{ content.title || 'Choose the right package' }}
        </h2>
      </div>

      <div v-if="isCatalogSource && catalogLoading" class="text-center text-on-surface-variant">
        Memuat paket...
      </div>
      <div v-else-if="isCatalogSource && catalogError" class="text-center text-on-surface-variant">
        Paket tidak dapat dimuat saat ini.
      </div>
      <div v-else class="grid gap-5 md:grid-cols-3">
        <article
          v-for="plan in displayPlans"
          :key="plan.name"
          class="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm transition hover:-translate-y-1 hover:border-secondary"
        >
          <h3 class="text-xl font-bold text-primary">{{ plan.name }}</h3>
          <p class="mt-3 text-3xl font-black text-secondary">{{ plan.priceLabel }}</p>
          <ul class="mt-6 flex-1 space-y-3 text-sm text-on-surface-variant">
            <li v-for="feature in plan.features || []" :key="feature" class="flex gap-2">
              <span class="text-secondary">✓</span>
              <span>{{ feature }}</span>
            </li>
          </ul>
          <button
            v-if="plan.code"
            type="button"
            class="mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition"
            :class="
              plan.isFree
                ? 'border border-secondary text-secondary hover:bg-secondary/10'
                : 'bg-secondary text-on-secondary shadow-md shadow-secondary/25 hover:opacity-90'
            "
            @click="selectPlan(plan)"
          >
            {{ plan.isFree ? 'Mulai Gratis' : 'Pilih Paket' }}
          </button>
        </article>
      </div>
    </div>
  </section>
</template>
