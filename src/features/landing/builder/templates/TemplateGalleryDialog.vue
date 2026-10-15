<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Plus, Search } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { pageTemplatesApi } from '@/features/landing/shared/api/page-templates.api'
import type {
  PageTemplateCategory,
  PageTemplateDetail,
  PageTemplateSummary,
} from '@/features/landing/shared/types/page-template.types'
import { useLandingChromeStore } from '@/stores/landingChrome'
import { useLandingPricingStore } from '@/stores/landingPricing'
import { useTenantStore } from '@/stores/tenant.store'
import { BLANK_TEMPLATE } from './blank-template'
import { createRenderQueue, filterTemplates, visibleCategories } from './gallery-logic'
import { buildTemplatePreviewChrome, toChromePlans } from './preview-chrome'
import TemplateCard from './TemplateCard.vue'
import TemplatePreviewPane from './TemplatePreviewPane.vue'

const props = defineProps<{
  open: boolean
  /** true → tombol "Gunakan" nonaktif (editor belum siap). */
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [payload: { name: string; html: string; css: string }]
}>()

const chromeStore = useLandingChromeStore()
const pricingStore = useLandingPricingStore()
const tenantStore = useTenantStore()

const templates = ref<PageTemplateSummary[]>([])
const loading = ref(false)
const listError = ref('')
const notice = ref('')
const query = ref('')
const category = ref<PageTemplateCategory | 'all'>('all')
const previewing = ref<PageTemplateSummary | null>(null)
const using = ref(false)

const queue = createRenderQueue(4)
// Detail di-cache selama dialog terbuka; promise disimpan agar permintaan ganda berbagi hasil.
let detailCache = new Map<string, Promise<PageTemplateDetail>>()

const chrome = computed(() =>
  buildTemplatePreviewChrome({
    isPlatform: tenantStore.isPlatformOrganization,
    brand: {
      name: chromeStore.canvasBranding.companyName,
      logoUrl: chromeStore.canvasBranding.logoUrl,
    },
    nav: chromeStore.canvasNav,
    footerNav: chromeStore.canvasFooterNav,
    plans: toChromePlans(pricingStore.canvasPlans),
  }),
)

const categories = computed(() => visibleCategories(templates.value))
const shown = computed(() =>
  filterTemplates(templates.value, { category: category.value, query: query.value }),
)

function getDetail(id: string): Promise<PageTemplateDetail> {
  let pending = detailCache.get(id)
  if (!pending) {
    pending = pageTemplatesApi.get(id)
    detailCache.set(id, pending)
    // Kegagalan tidak boleh tersimpan di cache: kartu bisa mencoba lagi.
    pending.catch(() => detailCache.delete(id))
  }
  return pending
}

async function reload() {
  loading.value = true
  listError.value = ''
  try {
    templates.value = await pageTemplatesApi.list()
  } catch {
    listError.value = 'Galeri belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    detailCache = new Map()
    previewing.value = null
    notice.value = ''
    query.value = ''
    category.value = 'all'
    // Chrome dan paket harga best-effort; load() menelan errornya sendiri.
    void chromeStore.load()
    void pricingStore.load()
    void reload()
  },
  { immediate: true },
)

function applyBlank() {
  emit('apply', { name: 'Kosong', ...BLANK_TEMPLATE })
}

async function useTemplate(t: PageTemplateSummary) {
  if (using.value) return
  using.value = true
  notice.value = ''
  try {
    const detail = await getDetail(t.id)
    emit('apply', { name: detail.name, html: detail.html, css: detail.css })
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      notice.value = 'Template tidak lagi tersedia.'
      previewing.value = null
      void reload()
    } else {
      notice.value = 'Template belum dapat dimuat. Coba lagi.'
    }
  } finally {
    using.value = false
  }
}

defineExpose({ reload })
</script>

<template>
  <BaseModal
    :open="open"
    title="Pilih template"
    width-class="max-w-[1200px]"
    @close="emit('close')"
  >
    <TemplatePreviewPane
      v-if="previewing"
      :template="previewing"
      :busy="busy || using"
      @back="previewing = null"
      @use="useTemplate"
    />

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <label class="relative min-w-60 flex-1">
          <span class="sr-only">Cari template</span>
          <Search
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            v-model="query"
            type="search"
            placeholder="Cari template…"
            class="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
      </div>

      <div class="flex flex-wrap gap-2" role="group" aria-label="Kategori template">
        <button
          type="button"
          class="rounded-full border px-3 py-1 text-sm transition"
          :class="
            category === 'all'
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          "
          :aria-pressed="category === 'all'"
          @click="category = 'all'"
        >
          Semua
        </button>
        <button
          v-for="c in categories"
          :key="c.code"
          type="button"
          class="rounded-full border px-3 py-1 text-sm transition"
          :class="
            category === c.code
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          "
          :aria-pressed="category === c.code"
          @click="category = c.code"
        >
          {{ c.label }}
        </button>
      </div>

      <p v-if="notice" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
        {{ notice }}
      </p>

      <div
        v-if="listError"
        class="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        role="alert"
      >
        <span>{{ listError }}</span>
        <BaseButton variant="outline" @click="reload">Coba lagi</BaseButton>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          class="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-6 text-center transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="applyBlank"
        >
          <Plus class="size-6 text-gray-500" aria-hidden="true" />
          <span class="font-semibold text-gray-900">Mulai dari kosong</span>
          <span class="text-sm text-gray-600">Kanvas bersih dengan satu section.</span>
        </button>

        <TemplateCard
          v-for="t in shown"
          :key="t.id"
          :template="t"
          :chrome="chrome"
          :queue="queue"
          :load-detail="getDetail"
          @open="previewing = $event"
        />
      </div>

      <p v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 class="size-4 animate-spin" aria-hidden="true" />
        Memuat template…
      </p>
      <p
        v-else-if="!listError && shown.length === 0"
        class="py-6 text-center text-sm text-gray-500"
      >
        Tidak ada template yang cocok.
      </p>
    </div>
  </BaseModal>
</template>
