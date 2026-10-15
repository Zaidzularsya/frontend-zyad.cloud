<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  publicCatalogApi,
  type PublicListingCategory,
} from '@/features/public/api/public-catalog.api'
import { useAuthStore } from '@/stores/auth.store'
import { useEditMode } from '../../composables/useEditMode'
import {
  buildCards,
  checkoutTarget,
  defaultFrequency,
  frequenciesOf,
  frequencyLabel,
  type PricingCard,
} from './pricing-view'

const editMode = useEditMode()

type PricingPlan = {
  name: string
  priceLabel: string
  features?: string[]
}

const props = defineProps<{
  content: {
    title?: string
    source?: 'custom' | 'platform_catalog'
    plans?: PricingPlan[]
    contactSalesHref?: string
  }
}>()

const router = useRouter()
const auth = useAuthStore()

const FEATURE_PREVIEW_LIMIT = 6
const expandedPlans = ref<Set<string>>(new Set())

function isExpanded(planName: string) {
  return expandedPlans.value.has(planName)
}

function toggleExpanded(planName: string) {
  const next = new Set(expandedPlans.value)
  if (next.has(planName)) {
    next.delete(planName)
  } else {
    next.add(planName)
  }
  expandedPlans.value = next
}

function visibleFeatures(features: string[]) {
  return features.length <= FEATURE_PREVIEW_LIMIT
    ? features
    : features.slice(0, FEATURE_PREVIEW_LIMIT)
}

function shownFeatures(name: string, features: string[]) {
  return isExpanded(name) ? features : visibleFeatures(features)
}

function hiddenFeatureCount(features: string[]) {
  return Math.max(features.length - FEATURE_PREVIEW_LIMIT, 0)
}

const isCatalogSource = computed(() => props.content.source === 'platform_catalog')

// ---- sumber katalog platform: tab kategori → kartu → toggle frekuensi ----
const categories = ref<PublicListingCategory[]>([])
const catalogLoading = ref(false)
const catalogError = ref(false)
const activeCategoryId = ref('')
const chosenFrequency = ref<Record<string, string | null>>({})

onMounted(async () => {
  // Di canvas builder jangan panggil API katalog publik.
  if (editMode.value) return
  if (!isCatalogSource.value) return
  catalogLoading.value = true
  catalogError.value = false
  try {
    const all = await publicCatalogApi.listListings()
    categories.value = all
      .filter((c) => c.listings.length > 0)
      .sort((a, b) => a.position - b.position)
    activeCategoryId.value = categories.value[0]?.id ?? ''
  } catch (err) {
    console.error('PricingSection: failed to load public catalog listings', err)
    catalogError.value = true
  } finally {
    catalogLoading.value = false
  }
})

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
  return defaultFrequency(frequencies.value)
})

const cards = computed<PricingCard[]>(() =>
  activeCategory.value ? buildCards(activeCategory.value, activeFrequency.value) : [],
)

function setFrequency(frequency: string) {
  const category = activeCategory.value
  if (!category) return
  chosenFrequency.value = { ...chosenFrequency.value, [category.id]: frequency }
}

function onCta(card: PricingCard) {
  if (editMode.value) return
  switch (card.cta.kind) {
    case 'checkout':
      void router.push(checkoutTarget(card.cta.productId, auth.isAuthenticated))
      return
    case 'free':
      // Paket gratis: cukup punya akun — subscription free dibuat otomatis saat registrasi.
      void router.push(auth.isAuthenticated ? '/app/dashboard' : '/auth/register')
      return
    default:
      return
  }
}

const contactHref = computed(() => props.content.contactSalesHref || '#contact')
</script>

<template>
  <section id="pricing" class="bg-surface py-section-gap">
    <div class="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <h2 class="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
          {{ content.title || 'Choose the right package' }}
        </h2>
      </div>

      <template v-if="isCatalogSource">
        <div v-if="catalogLoading" class="text-center text-on-surface-variant">Memuat paket...</div>
        <div v-else-if="catalogError" class="text-center text-on-surface-variant">
          Paket tidak dapat dimuat saat ini.
        </div>
        <template v-else>
          <div
            v-if="categories.length > 1"
            class="mb-6 flex flex-wrap justify-center gap-2"
            role="tablist"
            aria-label="Kategori paket"
          >
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              role="tab"
              data-testid="pricing-tab"
              :aria-selected="category.id === activeCategory?.id"
              class="rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="
                category.id === activeCategory?.id
                  ? 'border-secondary bg-secondary text-on-secondary'
                  : 'border-outline-variant/40 text-on-surface-variant hover:border-secondary'
              "
              @click="activeCategoryId = category.id"
            >
              {{ category.name }}
            </button>
          </div>

          <div
            v-if="frequencies.length > 1"
            class="mb-8 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Frekuensi penagihan"
          >
            <button
              v-for="frequency in frequencies"
              :key="frequency"
              type="button"
              data-testid="pricing-frequency"
              :aria-pressed="frequency === activeFrequency"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
              :class="
                frequency === activeFrequency
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              "
              @click="setFrequency(frequency)"
            >
              {{ frequencyLabel(frequency) }}
            </button>
          </div>

          <div class="grid gap-5 md:grid-cols-3">
            <article
              v-for="card in cards"
              :key="card.code"
              data-testid="pricing-card"
              class="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm transition hover:-translate-y-1 hover:border-secondary"
            >
              <h3 class="text-xl font-bold text-primary">{{ card.name }}</h3>
              <p class="mt-3 text-3xl font-black text-secondary">{{ card.priceLabel }}</p>
              <ul class="mt-6 flex-1 space-y-3 text-sm text-on-surface-variant">
                <li
                  v-for="feature in shownFeatures(card.code, card.benefits)"
                  :key="feature"
                  class="flex gap-2"
                >
                  <span class="text-secondary">✓</span>
                  <span>{{ feature }}</span>
                </li>
              </ul>
              <button
                v-if="hiddenFeatureCount(card.benefits) > 0"
                type="button"
                class="mt-3 text-left text-sm font-semibold text-secondary hover:underline"
                @click="toggleExpanded(card.code)"
              >
                {{
                  isExpanded(card.code)
                    ? 'Sembunyikan fitur'
                    : `Lihat ${hiddenFeatureCount(card.benefits)} fitur lainnya`
                }}
              </button>
              <a
                v-if="card.cta.kind === 'contact'"
                :href="contactHref"
                data-testid="pricing-cta"
                class="mt-8 block w-full rounded-xl border border-secondary px-4 py-3 text-center text-sm font-semibold text-secondary transition hover:bg-secondary/10"
              >
                {{ card.ctaLabel }}
              </a>
              <button
                v-else
                type="button"
                data-testid="pricing-cta"
                :disabled="card.cta.kind === 'unavailable'"
                class="mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="
                  card.cta.kind === 'checkout'
                    ? 'bg-secondary text-on-secondary shadow-md shadow-secondary/25 hover:opacity-90'
                    : 'border border-secondary text-secondary hover:bg-secondary/10'
                "
                @click="onCta(card)"
              >
                {{ card.ctaLabel }}
              </button>
            </article>
          </div>
        </template>
      </template>

      <div v-else class="grid gap-5 md:grid-cols-3">
        <article
          v-for="plan in content.plans || []"
          :key="plan.name"
          class="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm transition hover:-translate-y-1 hover:border-secondary"
        >
          <h3 class="text-xl font-bold text-primary">{{ plan.name }}</h3>
          <p class="mt-3 text-3xl font-black text-secondary">{{ plan.priceLabel }}</p>
          <ul class="mt-6 flex-1 space-y-3 text-sm text-on-surface-variant">
            <li
              v-for="feature in shownFeatures(plan.name, plan.features || [])"
              :key="feature"
              class="flex gap-2"
            >
              <span class="text-secondary">✓</span>
              <span>{{ feature }}</span>
            </li>
          </ul>
          <button
            v-if="hiddenFeatureCount(plan.features || []) > 0"
            type="button"
            class="mt-3 text-left text-sm font-semibold text-secondary hover:underline"
            @click="toggleExpanded(plan.name)"
          >
            {{
              isExpanded(plan.name)
                ? 'Sembunyikan fitur'
                : `Lihat ${hiddenFeatureCount(plan.features || [])} fitur lainnya`
            }}
          </button>
        </article>
      </div>
    </div>
  </section>
</template>
