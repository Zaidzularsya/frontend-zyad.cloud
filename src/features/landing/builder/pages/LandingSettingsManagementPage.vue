<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowLeft, CheckCircle2, Globe2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LandingPagePicker from '@/features/landing/builder/components/LandingPagePicker.vue'
import ReusableCtaManager from '@/features/landing/builder/components/ReusableCtaManager.vue'
import MediaLibraryManager from '@/features/landing/builder/components/MediaLibraryManager.vue'
import { usePageSelection } from '@/features/landing/builder/composables/usePageSelection'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  CallToAction,
  LandingDomainBinding,
  LandingForm,
  LandingPage,
} from '@/features/landing/shared/types/landing.types'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Settings',
    description:
      'Atur publish rules, lead notification, footer, dan preferensi page lain per landing page.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const { pages, selectedPageId, loadPages } = usePageSelection()
const selectedPage = ref<LandingPage | null>(null)
const pageBindings = ref<LandingDomainBinding[]>([])
const ctas = ref<CallToAction[]>([])
const forms = ref<LandingForm[]>([])

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')

const settingsForm = reactive({
  publish_require_approval: false,
  lead_notification_emails: [] as string[],
  footer_copyright_text: '',
  trust_badges: [] as Array<{ image_url: string; label: string }>,
  secondary_cta_tracking_key: '',
  newsletter_form_id: '',
})
const newEmail = ref('')

const boundDomainCount = computed(() => pageBindings.value.length)
const primaryBinding = computed(() => pageBindings.value.find((binding) => binding.is_primary))

// `immediate: true` supaya watcher ini satu-satunya pemicu load — menghindari
// race dua request bersamaan kalau onMounted juga memanggil load secara
// terpisah (selectedPageId berasal dari composable singleton yang bisa sudah
// terisi sebelum komponen ini mount, mis. datang dari menu Page/Content).
watch(
  selectedPageId,
  async (pageId) => {
    if (!pageId) return
    await loadPageData(pageId)
  },
  { immediate: true },
)

onMounted(async () => {
  if (pages.value.length === 0) await loadPages()
})

async function loadPageData(pageId: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [pageResponse, bindingsResponse, ctaResponse, formResponse] = await Promise.all([
      landingApi.getPage(pageId),
      landingApi.getDomainBindings(pageId),
      landingApi.getCTAs({ per_page: 100 }),
      landingApi.getForms(pageId),
    ])
    selectedPage.value = pageResponse.data
    pageBindings.value = bindingsResponse.data
    ctas.value = ctaResponse.data
    forms.value = formResponse.data

    const settings = (pageResponse.data.settings ?? {}) as Record<string, unknown>
    settingsForm.publish_require_approval = Boolean(settings.publish_require_approval)
    settingsForm.lead_notification_emails = Array.isArray(settings.lead_notification_emails)
      ? (settings.lead_notification_emails as unknown[]).map(String)
      : []
    settingsForm.footer_copyright_text = String(settings.footer_copyright_text ?? '')
    settingsForm.trust_badges = Array.isArray(settings.trust_badges)
      ? (settings.trust_badges as Array<{ image_url?: string; label?: string }>).map((badge) => ({
          image_url: badge.image_url ?? '',
          label: badge.label ?? '',
        }))
      : []
    settingsForm.secondary_cta_tracking_key = String(settings.secondary_cta_tracking_key ?? '')
    settingsForm.newsletter_form_id = String(settings.newsletter_form_id ?? '')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat settings landing page.')
  } finally {
    loading.value = false
  }
}

function getApiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

function showNotice(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 3000)
}

function addEmail() {
  const email = newEmail.value.trim()
  if (!email) return
  if (!settingsForm.lead_notification_emails.includes(email)) {
    settingsForm.lead_notification_emails = [...settingsForm.lead_notification_emails, email]
  }
  newEmail.value = ''
}

function removeEmail(email: string) {
  settingsForm.lead_notification_emails = settingsForm.lead_notification_emails.filter(
    (item) => item !== email,
  )
}

function addTrustBadge() {
  settingsForm.trust_badges = [...settingsForm.trust_badges, { image_url: '', label: '' }]
}

function removeTrustBadge(index: number) {
  settingsForm.trust_badges = settingsForm.trust_badges.filter((_, i) => i !== index)
}

async function saveSettings() {
  if (!selectedPageId.value || !selectedPage.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    // Selalu spread existingSettings dulu — field lain di page.settings (di luar
    // form ini) tidak boleh ikut ke-reset saat form ini disimpan.
    const existingSettings = (selectedPage.value.settings ?? {}) as Record<string, unknown>
    await landingApi.updatePage(selectedPageId.value, {
      settings: {
        ...existingSettings,
        publish_require_approval: settingsForm.publish_require_approval,
        lead_notification_emails: settingsForm.lead_notification_emails,
        footer_copyright_text: settingsForm.footer_copyright_text.trim(),
        trust_badges: settingsForm.trust_badges.filter((badge) => badge.image_url || badge.label),
        secondary_cta_tracking_key: settingsForm.secondary_cta_tracking_key,
        newsletter_form_id: settingsForm.newsletter_form_id,
      },
    })
    showNotice('Settings berhasil disimpan.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan settings.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="props.title" :description="props.description">
      <div class="flex flex-wrap gap-2">
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="loading"
          @click="loadPageData(selectedPageId)"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </BaseButton>
        <RouterLink
          :to="{ name: props.parentRouteName }"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <ArrowLeft class="size-4" />
          Back
        </RouterLink>
      </div>
    </PageHeader>

    <div
      v-if="notice"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
    >
      {{ notice }}
    </div>
    <div
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {{ errorMessage }}
    </div>

    <section
      class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      <ReusableCtaManager />
    </section>

    <section
      class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      <MediaLibraryManager />
    </section>

    <div class="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <LandingPagePicker v-model="selectedPageId" :pages="pages" />
      <p class="mt-2 text-xs text-gray-500">
        Settings di bawah berlaku per landing page. Reusable CTA &amp; Media library di atas berlaku
        untuk seluruh tenant.
      </p>
    </div>

    <div v-if="loading" class="grid min-h-[200px] place-items-center rounded-3xl border">
      <Loader2 class="size-8 animate-spin text-brand-500" />
    </div>

    <template v-else-if="selectedPageId">
      <div class="grid gap-6 xl:grid-cols-2">
        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <h2 class="font-black text-gray-900 dark:text-white">Publish rules</h2>
          <p class="mt-1 text-sm text-gray-500">
            Kontrol tambahan sebelum publish page ini dijalankan.
          </p>
          <label
            class="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-900"
          >
            <input v-model="settingsForm.publish_require_approval" type="checkbox" />
            <span>
              <span class="font-semibold text-gray-900 dark:text-white">Require approval</span>
              <span class="block text-xs text-gray-500">
                Tandai page ini butuh review manual sebelum publish (informational flag).
              </span>
            </span>
          </label>
        </section>

        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <h2 class="font-black text-gray-900 dark:text-white">Lead notification emails</h2>
          <p class="mt-1 text-sm text-gray-500">
            Email tambahan yang menerima notifikasi submission untuk page ini, di luar lead
            integrations.
          </p>
          <div class="mt-4 flex gap-2">
            <input
              v-model="newEmail"
              type="email"
              placeholder="ops@example.com"
              class="min-w-0 flex-1 rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              @keyup.enter="addEmail"
            />
            <BaseButton type="button" variant="secondary" @click="addEmail">
              <Plus class="size-4" />
            </BaseButton>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="email in settingsForm.lead_notification_emails"
              :key="email"
              class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ email }}
              <button type="button" @click="removeEmail(email)">
                <Trash2 class="size-3" />
              </button>
            </span>
          </div>
        </section>

        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <h2 class="font-black text-gray-900 dark:text-white">Footer content</h2>
          <p class="mt-1 text-sm text-gray-500">
            Copyright, trust badge, secondary CTA, dan newsletter yang tampil di footer page ini.
            Navigasi header dikelola dari panel <strong>Header &amp; Brand</strong> di menu
            <RouterLink
              :to="{ name: `${props.parentRouteName}-content` }"
              class="text-brand-600 underline"
            >
              Content
            </RouterLink>
            (klik "Header" di palette).
          </p>
          <div class="mt-4 space-y-4">
            <label class="block text-sm font-medium">
              Copyright text
              <input
                v-model="settingsForm.footer_copyright_text"
                placeholder="© 2026 Acme. All rights reserved."
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            <div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Trust badges</span>
                <button
                  type="button"
                  class="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  @click="addTrustBadge"
                >
                  <Plus class="inline size-3.5" /> Add badge
                </button>
              </div>
              <div class="mt-2 space-y-2">
                <div
                  v-for="(badge, index) in settingsForm.trust_badges"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="badge.image_url"
                    placeholder="Image URL"
                    class="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                  <input
                    v-model="badge.label"
                    placeholder="Label"
                    class="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    @click="removeTrustBadge(index)"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <label class="block text-sm font-medium">
              Secondary CTA
              <select
                v-model="settingsForm.secondary_cta_tracking_key"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">None</option>
                <option v-for="cta in ctas" :key="cta.id" :value="cta.tracking_key">
                  {{ cta.label }} ({{ cta.tracking_key }})
                </option>
              </select>
            </label>

            <label class="block text-sm font-medium">
              Newsletter form
              <select
                v-model="settingsForm.newsletter_form_id"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">None</option>
                <option v-for="form in forms" :key="form.id" :value="form.id">
                  {{ form.name }}
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <BaseButton type="button" :disabled="saving" @click="saveSettings">
        <CheckCircle2 class="size-4" />
        Save settings
      </BaseButton>

      <div class="grid gap-6 xl:grid-cols-3">
        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <h3 class="font-black text-gray-900 dark:text-white">SEO defaults</h3>
          <p class="mt-1 text-sm text-gray-500">
            Meta title, description, Open Graph, dan sitemap dikelola dari tab SEO pada halaman
            Page.
          </p>
          <RouterLink
            :to="{ name: props.parentRouteName }"
            class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"
          >
            Buka tab SEO di Page →
          </RouterLink>
        </section>

        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex items-center gap-2">
            <Globe2 class="size-4 text-gray-400" />
            <h3 class="font-black text-gray-900 dark:text-white">Domain binding</h3>
          </div>
          <p class="mt-2 text-sm text-gray-500">
            <template v-if="boundDomainCount > 0">
              {{ boundDomainCount }} domain terikat ke page ini.
              <span v-if="primaryBinding" class="block">Primary binding aktif.</span>
            </template>
            <template v-else> Belum ada domain yang terikat ke page ini. </template>
          </p>
          <RouterLink
            :to="{ name: `${props.parentRouteName}-domains` }"
            class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"
          >
            Kelola di Domains →
          </RouterLink>
        </section>

        <section
          class="rounded-3xl border border-dashed bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <h3 class="font-black text-gray-500 dark:text-gray-400">
            Workspace access, role scope, approval flow, analytics hooks
          </h3>
          <p class="mt-2 text-sm text-gray-400">
            Coming soon — membutuhkan subsistem RBAC approval-flow dan integrasi analytics yang
            belum ada di backend.
          </p>
        </section>
      </div>
    </template>
  </div>
</template>
