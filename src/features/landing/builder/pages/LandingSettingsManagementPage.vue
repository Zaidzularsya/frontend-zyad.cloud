<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowLeft, CheckCircle2, Globe2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  LandingDomainBinding,
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
      'Atur publish rules, lead notification, dan preferensi page lain per landing page.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const pages = ref<LandingPage[]>([])
const selectedPageId = ref('')
const selectedPage = ref<LandingPage | null>(null)
const pageBindings = ref<LandingDomainBinding[]>([])

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')

const settingsForm = reactive({
  publish_require_approval: false,
  lead_notification_emails: [] as string[],
})
const newEmail = ref('')

const boundDomainCount = computed(() => pageBindings.value.length)
const primaryBinding = computed(() => pageBindings.value.find((binding) => binding.is_primary))

onMounted(loadPages)

watch(selectedPageId, async (pageId) => {
  if (!pageId) return
  await loadPageData(pageId)
})

async function loadPages() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.getPages({ per_page: 100, is_template: false })
    pages.value = response.data
    if (!selectedPageId.value && pages.value.length > 0) {
      selectedPageId.value = pages.value[0]!.id
    }
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat daftar landing page.')
  } finally {
    loading.value = false
  }
}

async function loadPageData(pageId: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [pageResponse, bindingsResponse] = await Promise.all([
      landingApi.getPage(pageId),
      landingApi.getDomainBindings(pageId),
    ])
    selectedPage.value = pageResponse.data
    pageBindings.value = bindingsResponse.data

    const settings = (pageResponse.data.settings ?? {}) as Record<string, unknown>
    settingsForm.publish_require_approval = Boolean(settings.publish_require_approval)
    settingsForm.lead_notification_emails = Array.isArray(settings.lead_notification_emails)
      ? (settings.lead_notification_emails as unknown[]).map(String)
      : []
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

async function saveSettings() {
  if (!selectedPageId.value || !selectedPage.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const existingSettings = (selectedPage.value.settings ?? {}) as Record<string, unknown>
    await landingApi.updatePage(selectedPageId.value, {
      settings: {
        ...existingSettings,
        publish_require_approval: settingsForm.publish_require_approval,
        lead_notification_emails: settingsForm.lead_notification_emails,
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

    <div class="rounded-2xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <label class="block text-sm font-medium">
        Landing page
        <select
          v-model="selectedPageId"
          class="mt-1 w-full max-w-md rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
        >
          <option v-for="page in pages" :key="page.id" :value="page.id">
            {{ page.title || page.name }} — /{{ page.slug }}
          </option>
        </select>
      </label>
      <p class="mt-2 text-xs text-gray-500">
        Settings di halaman ini berlaku per landing page, bukan per workspace.
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
