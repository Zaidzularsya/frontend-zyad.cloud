<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  publicCatalogApi,
  type PublicListing,
  type PublicListingCategory,
} from '@/features/public/api/public-catalog.api'
import { useAuthStore } from '@/stores/auth.store'
import {
  parseCatalogPricingConfig,
  type CatalogPricingConfig,
} from '../../catalog-pricing/catalog-pricing-config'
import { safeHref } from '../../grapes/chrome'
import {
  buildCards,
  checkoutTarget,
  defaultFrequency,
  frequenciesOf,
  frequencyLabel,
  maxYearlySavings,
  yearlySavings,
  type PricingCard,
} from '../../sections/pricing/pricing-view'
import { useLandingPageContext } from '../page-context'
import type { GrapesChrome } from '../../grapes/chrome'

const props = defineProps<{
  host: HTMLElement
  chrome: GrapesChrome
  dataset: Record<string, string>
}>()

const ctx = useLandingPageContext()
const router = useRouter()
const auth = useAuthStore()

const config = computed<CatalogPricingConfig>(() =>
  parseCatalogPricingConfig(props.dataset.zyadConfig),
)

const ANNUAL = 'annual'

const isPlatform = computed(() => ctx.orgType.value === 'platform')
const categories = ref<PublicListingCategory[]>([])
const loading = ref(true)
const failed = ref(false)
const activeCategoryId = ref('')
const chosenFrequency = ref<Record<string, string>>({})

onMounted(async () => {
  if (!isPlatform.value) return
  try {
    const all = (await publicCatalogApi.listListings())
      .filter((c) => c.listings.length > 0)
      .sort((a, b) => a.position - b.position)
    const wanted = config.value.categoryIds
    const picked = wanted.length ? all.filter((c) => wanted.includes(c.id)) : all
    categories.value = picked.length ? picked : all
    activeCategoryId.value = categories.value[0]?.id ?? ''
  } catch (err) {
    console.error('CatalogPricingSlot: failed to load public catalog listings', err)
    failed.value = true
  } finally {
    loading.value = false
  }
})

const visible = computed(
  () => isPlatform.value && (loading.value || failed.value || categories.value.length > 0),
)

const activeCategory = computed(
  () => categories.value.find((c) => c.id === activeCategoryId.value) ?? categories.value[0],
)
const frequencies = computed(() =>
  activeCategory.value ? frequenciesOf(activeCategory.value) : [],
)
const activeFrequency = computed<string | null>(() => {
  const category = activeCategory.value
  if (!category) return null
  const chosen = chosenFrequency.value[category.id]
  if (chosen && frequencies.value.includes(chosen)) return chosen
  const preferred = config.value.defaultFrequency === 'annual' ? ANNUAL : 'monthly'
  if (frequencies.value.includes(preferred)) return preferred
  return defaultFrequency(frequencies.value)
})
const isYearly = computed(() => activeFrequency.value === ANNUAL)
const showSavings = computed(() => config.value.showYearlySavings)
const toggleSavings = computed(() => {
  const category = activeCategory.value
  return showSavings.value && category ? maxYearlySavings(category) : null
})

interface CardView {
  card: PricingCard
  listing: PublicListing
  featured: boolean
  savings: number | null
}
const cards = computed<CardView[]>(() => {
  const category = activeCategory.value
  if (!category) return []
  const sorted = [...category.listings].sort((a, b) => a.order - b.order)
  return buildCards(category, activeFrequency.value).map((card, i) => ({
    card,
    listing: sorted[i]!,
    featured: card.code === config.value.featuredCode,
    savings: isYearly.value && showSavings.value ? yearlySavings(sorted[i]!) : null,
  }))
})

function goContact(interest: string) {
  ctx.interest.value = interest
  const href = safeHref(config.value.contactHref)
  if (href.startsWith('#')) {
    ctx.scrollToId(href.slice(1))
    return
  }
  void router.push(href)
}

function onCta(view: CardView) {
  const cta = view.card.cta
  switch (cta.kind) {
    case 'checkout':
      void router.push(checkoutTarget(cta.productId, auth.isAuthenticated))
      return
    case 'free':
      void router.push(auth.isAuthenticated ? '/app/dashboard' : '/auth/register')
      return
    case 'contact': {
      const label = frequencyLabel(activeFrequency.value)
      goContact(label ? `${view.card.name} · ${label}` : view.card.name)
      return
    }
    default:
      return
  }
}

function setFrequency(frequency: string) {
  const category = activeCategory.value
  if (!category) return
  chosenFrequency.value = { ...chosenFrequency.value, [category.id]: frequency }
}
</script>

<template>
  <section v-if="visible" class="zy-slot-catalog-pricing">
    <header v-if="config.title || config.subtitle" class="zy-slot-catalog-pricing__head">
      <h2 v-if="config.title" class="zy-slot-catalog-pricing__title">{{ config.title }}</h2>
      <p v-if="config.subtitle" class="zy-slot-catalog-pricing__subtitle">{{ config.subtitle }}</p>
    </header>

    <div v-if="loading" class="zy-slot-catalog-pricing__grid zy-stagger" aria-busy="true">
      <div
        v-for="n in 3"
        :key="n"
        class="zy-slot-catalog-pricing__card zy-slot-catalog-pricing__skeleton"
      ></div>
    </div>

    <div v-else-if="failed" class="zy-slot-catalog-pricing__error" role="alert">
      <p>Harga belum dapat dimuat.</p>
      <button type="button" class="zy-slot-catalog-pricing__cta" @click="goContact('')">
        Hubungi sales
      </button>
    </div>

    <template v-else>
      <div
        v-if="categories.length > 1"
        class="zy-slot-catalog-pricing__tabs"
        role="tablist"
        aria-label="Kategori paket"
      >
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          role="tab"
          class="zy-slot-catalog-pricing__tab"
          :aria-selected="category.id === activeCategory?.id"
          @click="activeCategoryId = category.id"
        >
          {{ category.name }}
        </button>
      </div>

      <div
        v-if="frequencies.length > 1"
        class="zy-slot-catalog-pricing__freq"
        role="group"
        aria-label="Frekuensi penagihan"
      >
        <button
          v-for="frequency in frequencies"
          :key="frequency"
          type="button"
          class="zy-slot-catalog-pricing__freq-btn"
          :aria-pressed="frequency === activeFrequency"
          @click="setFrequency(frequency)"
        >
          {{ frequencyLabel(frequency) }}
          <span
            v-if="frequency === ANNUAL && toggleSavings"
            class="zy-slot-catalog-pricing__savings"
            >Hemat s.d. {{ toggleSavings }}%</span
          >
        </button>
      </div>

      <div class="zy-slot-catalog-pricing__grid zy-stagger">
        <article
          v-for="view in cards"
          :key="view.card.code"
          class="zy-slot-catalog-pricing__card zy-hover-lift"
          :class="{ 'zy-slot-catalog-pricing__card--featured': view.featured }"
        >
          <div class="zy-slot-catalog-pricing__badges">
            <span v-if="view.featured" class="zy-slot-catalog-pricing__badge">Populer</span>
            <span
              v-if="view.savings"
              class="zy-slot-catalog-pricing__badge zy-slot-catalog-pricing__badge--savings"
              >Hemat {{ view.savings }}%</span
            >
          </div>
          <h3 class="zy-slot-catalog-pricing__name">{{ view.card.name }}</h3>
          <p v-if="view.card.description" class="zy-slot-catalog-pricing__desc">
            {{ view.card.description }}
          </p>
          <p class="zy-slot-catalog-pricing__price">{{ view.card.priceLabel }}</p>
          <ul v-if="view.card.benefits.length" class="zy-slot-catalog-pricing__points">
            <li v-for="benefit in view.card.benefits" :key="benefit">{{ benefit }}</li>
          </ul>
          <button
            type="button"
            class="zy-slot-catalog-pricing__cta"
            :disabled="view.card.cta.kind === 'unavailable'"
            @click="onCta(view)"
          >
            {{ view.card.ctaLabel }}
          </button>
        </article>

        <article
          v-if="config.enterpriseCard.enabled"
          class="zy-slot-catalog-pricing__card zy-slot-catalog-pricing__card--enterprise zy-hover-lift"
        >
          <h3 class="zy-slot-catalog-pricing__name">{{ config.enterpriseCard.title }}</h3>
          <ul class="zy-slot-catalog-pricing__points">
            <li v-for="point in config.enterpriseCard.points" :key="point">{{ point }}</li>
          </ul>
          <button
            type="button"
            class="zy-slot-catalog-pricing__cta"
            @click="goContact(config.enterpriseCard.title)"
          >
            Hubungi sales
          </button>
        </article>
      </div>
    </template>
  </section>
</template>
