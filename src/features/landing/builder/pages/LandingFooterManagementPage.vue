<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  CallToAction,
  LandingBranding,
  LandingForm,
  LandingMenu,
  LandingMenuItem,
  LandingPage,
} from '@/features/landing/shared/types/landing.types'

type LinkType = 'internal_page' | 'external_link' | 'anchor'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Footer',
    description: 'Susun footer dari link navigasi, social link, copyright, dan secondary CTA.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const pages = ref<LandingPage[]>([])
const selectedPageId = ref('')
const selectedPage = ref<LandingPage | null>(null)
const branding = ref<LandingBranding | null>(null)
const footerMenus = ref<LandingMenu[]>([])
const footerMenuItems = ref<Record<string, LandingMenuItem[]>>({})
const selectedFooterMenuId = ref('')
const ctas = ref<CallToAction[]>([])
const forms = ref<LandingForm[]>([])

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')
const editingItemId = ref('')

const itemForm = reactive({
  label: '',
  link_type: 'internal_page' as LinkType,
  destination: '',
  anchor: '',
  external_url: '',
  is_enabled: true,
})

const settingsForm = reactive({
  footer_copyright_text: '',
  trust_badges: [] as Array<{ image_url: string; label: string }>,
  secondary_cta_tracking_key: '',
  newsletter_form_id: '',
})

const selectedFooterItems = computed(() =>
  selectedFooterMenuId.value ? (footerMenuItems.value[selectedFooterMenuId.value] ?? []) : [],
)
const publishedPages = computed(() =>
  pages.value.filter((page) => page.status === 'published' && !page.is_template),
)

onMounted(async () => {
  await loadPages()
  await loadBranding()
})

watch(selectedPageId, async (pageId) => {
  if (!pageId) return
  await loadPageScopedData(pageId)
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

async function loadBranding() {
  try {
    const response = await landingApi.getDefaultBranding()
    branding.value = response.data
  } catch {
    // Non-fatal: footer brand-summary preview just stays empty.
  }
}

async function loadPageScopedData(pageId: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [pageResponse, menuResponse, ctaResponse, formResponse] = await Promise.all([
      landingApi.getPage(pageId),
      landingApi.getMenus(),
      landingApi.getCTAs({ per_page: 100 }),
      landingApi.getForms(pageId),
    ])
    selectedPage.value = pageResponse.data
    footerMenus.value = menuResponse.data.filter((menu) => menu.location === 'footer')
    ctas.value = ctaResponse.data
    forms.value = formResponse.data

    const settings = (pageResponse.data.settings ?? {}) as Record<string, unknown>
    settingsForm.footer_copyright_text = String(settings.footer_copyright_text ?? '')
    settingsForm.trust_badges = Array.isArray(settings.trust_badges)
      ? (settings.trust_badges as Array<{ image_url?: string; label?: string }>).map((badge) => ({
          image_url: badge.image_url ?? '',
          label: badge.label ?? '',
        }))
      : []
    settingsForm.secondary_cta_tracking_key = String(settings.secondary_cta_tracking_key ?? '')
    settingsForm.newsletter_form_id = String(settings.newsletter_form_id ?? '')

    selectedFooterMenuId.value = footerMenus.value[0]?.id ?? ''
    if (selectedFooterMenuId.value) await loadFooterItems(selectedFooterMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat data footer.')
  } finally {
    loading.value = false
  }
}

async function loadFooterItems(menuId: string) {
  const response = await landingApi.getMenuItems(menuId)
  footerMenuItems.value = { ...footerMenuItems.value, [menuId]: response.data }
}

function selectFooterMenu(menuId: string) {
  selectedFooterMenuId.value = menuId
  void loadFooterItems(menuId)
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

function resetItemForm() {
  editingItemId.value = ''
  itemForm.label = ''
  itemForm.link_type = 'internal_page'
  itemForm.destination = publishedPages.value[0]?.slug ?? ''
  itemForm.anchor = ''
  itemForm.external_url = ''
  itemForm.is_enabled = true
}

async function createFooterMenu() {
  saving.value = true
  errorMessage.value = ''
  try {
    const response = await landingApi.createMenu({
      name: `Footer Links ${footerMenus.value.length + 1}`,
      location: 'footer',
      is_active: true,
    })
    footerMenus.value = [...footerMenus.value, response.data]
    selectedFooterMenuId.value = response.data.id
    showNotice('Footer menu berhasil dibuat.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal membuat footer menu.')
  } finally {
    saving.value = false
  }
}

function destinationForApi() {
  if (itemForm.link_type === 'anchor') {
    const anchor = itemForm.anchor.trim().replace(/^#/, '')
    return anchor ? `#${anchor}` : ''
  }
  if (itemForm.link_type === 'external_link') return itemForm.external_url.trim()
  return itemForm.destination.trim().replace(/^\//, '')
}

function itemHref(item: LandingMenuItem) {
  if (item.link_type === 'anchor') {
    return item.destination.startsWith('#') ? item.destination : `#${item.destination}`
  }
  if (item.link_type === 'internal_page') return `/${item.destination.replace(/^\//, '')}`
  return item.destination || '#'
}

function fillItemForm(item: LandingMenuItem) {
  editingItemId.value = item.id
  itemForm.label = item.label
  itemForm.link_type =
    item.link_type === 'external_link' || item.link_type === 'anchor'
      ? item.link_type
      : 'internal_page'
  itemForm.is_enabled = item.is_enabled
  itemForm.destination = itemForm.link_type === 'internal_page' ? item.destination : ''
  itemForm.anchor = itemForm.link_type === 'anchor' ? item.destination.replace(/^#/, '') : ''
  itemForm.external_url = itemForm.link_type === 'external_link' ? item.destination : ''
}

async function saveFooterItem() {
  if (!selectedFooterMenuId.value) {
    errorMessage.value = 'Buat atau pilih footer menu terlebih dahulu.'
    return
  }
  if (!itemForm.label.trim()) {
    errorMessage.value = 'Label wajib diisi.'
    return
  }
  const destination = destinationForApi()
  if (!destination) {
    errorMessage.value = 'Destination wajib diisi.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      label: itemForm.label.trim(),
      link_type: itemForm.link_type,
      destination,
      target: 'self',
      sort_order: editingItemId.value ? undefined : selectedFooterItems.value.length * 10 + 10,
      is_enabled: itemForm.is_enabled,
    }
    if (editingItemId.value) {
      await landingApi.updateMenuItem(selectedFooterMenuId.value, editingItemId.value, payload)
      showNotice('Footer link berhasil diperbarui.')
    } else {
      await landingApi.createMenuItem(selectedFooterMenuId.value, payload)
      showNotice('Footer link berhasil ditambahkan.')
    }
    await loadFooterItems(selectedFooterMenuId.value)
    resetItemForm()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan footer link.')
  } finally {
    saving.value = false
  }
}

async function deleteFooterItem(item: LandingMenuItem) {
  if (!selectedFooterMenuId.value) return
  if (!window.confirm(`Hapus footer link "${item.label}"?`)) return
  errorMessage.value = ''
  try {
    await landingApi.deleteMenuItem(selectedFooterMenuId.value, item.id)
    await loadFooterItems(selectedFooterMenuId.value)
    showNotice('Footer link berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus footer link.')
  }
}

function addTrustBadge() {
  settingsForm.trust_badges = [...settingsForm.trust_badges, { image_url: '', label: '' }]
}

function removeTrustBadge(index: number) {
  settingsForm.trust_badges = settingsForm.trust_badges.filter((_, i) => i !== index)
}

async function saveFooterSettings() {
  if (!selectedPageId.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await landingApi.updatePage(selectedPageId.value, {
      settings: {
        footer_copyright_text: settingsForm.footer_copyright_text.trim(),
        trust_badges: settingsForm.trust_badges.filter((badge) => badge.image_url || badge.label),
        lead_notification_emails: [],
        publish_require_approval: false,
        secondary_cta_tracking_key: settingsForm.secondary_cta_tracking_key,
        newsletter_form_id: settingsForm.newsletter_form_id,
      },
    })
    showNotice('Footer settings berhasil disimpan.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan footer settings.')
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
          @click="loadPageScopedData(selectedPageId)"
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
        Footer disusun per landing page. Pilih page untuk mengatur footer-nya.
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
          <h2 class="font-black text-gray-900 dark:text-white">Brand summary &amp; social links</h2>
          <p class="mt-1 text-sm text-gray-500">
            Dikelola dari
            <RouterLink
              :to="{ name: `${props.parentRouteName}-brand-theme` }"
              class="text-brand-600 underline"
            >
              Brand &amp; Theme
            </RouterLink>
            — footer hanya menampilkan preview.
          </p>
          <div
            class="mt-4 flex items-center gap-3 rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <p class="font-bold text-gray-900 dark:text-white">
                {{ branding?.company_name || 'Brand name belum diatur' }}
              </p>
              <p class="text-sm text-gray-500">{{ branding?.tagline || '—' }}</p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="link in branding?.social_links ?? []"
              :key="String(link.platform)"
              class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ link.platform }}
            </span>
            <span v-if="!branding?.social_links?.length" class="text-xs text-gray-400">
              Belum ada social link.
            </span>
          </div>
        </section>

        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <h2 class="font-black text-gray-900 dark:text-white">Copyright, trust badge &amp; CTA</h2>
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

            <BaseButton type="button" class="w-full" :disabled="saving" @click="saveFooterSettings">
              <CheckCircle2 class="size-4" />
              Save footer settings
            </BaseButton>
          </div>
        </section>
      </div>

      <section
        class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-black text-gray-900 dark:text-white">Footer links</h2>
            <p class="text-sm text-gray-500">
              Menggunakan menu dengan location=footer — bisa lebih dari satu grup (quick links,
              support, legal).
            </p>
          </div>
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="saving"
            @click="createFooterMenu"
          >
            <Plus class="size-4" />
            New footer link group
          </BaseButton>
        </div>

        <div
          v-if="footerMenus.length === 0"
          class="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500"
        >
          Belum ada footer link group. Buat grup pertama untuk mulai menambahkan link.
        </div>

        <div v-else class="mt-5 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
          <div class="space-y-2">
            <button
              v-for="menu in footerMenus"
              :key="menu.id"
              type="button"
              class="w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold"
              :class="
                selectedFooterMenuId === menu.id
                  ? 'border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30'
                  : 'hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'
              "
              @click="selectFooterMenu(menu.id)"
            >
              {{ menu.name }}
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="item in selectedFooterItems"
              :key="item.id"
              class="flex items-center justify-between rounded-xl border p-3 dark:border-gray-800"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {{ item.label }}
                </p>
                <p class="truncate text-xs text-gray-500">{{ itemHref(item) }}</p>
              </div>
              <div class="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  class="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  @click="fillItemForm(item)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  @click="deleteFooterItem(item)"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            </div>
            <div
              v-if="selectedFooterMenuId && selectedFooterItems.length === 0"
              class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500"
            >
              Belum ada link di grup ini.
            </div>
          </div>

          <form
            class="space-y-3 rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
            @submit.prevent="saveFooterItem"
          >
            <label class="block text-sm font-medium">
              Label
              <input
                v-model="itemForm.label"
                placeholder="Privacy Policy"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label class="block text-sm font-medium">
              Link type
              <select
                v-model="itemForm.link_type"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="internal_page">Landing page</option>
                <option value="anchor">Section anchor</option>
                <option value="external_link">External URL</option>
              </select>
            </label>
            <label v-if="itemForm.link_type === 'internal_page'" class="block text-sm font-medium">
              Page
              <select
                v-model="itemForm.destination"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option v-for="page in publishedPages" :key="page.id" :value="page.slug">
                  {{ page.title || page.name }}
                </option>
              </select>
            </label>
            <label v-else-if="itemForm.link_type === 'anchor'" class="block text-sm font-medium">
              Anchor
              <input
                v-model="itemForm.anchor"
                placeholder="pricing"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label v-else class="block text-sm font-medium">
              External URL
              <input
                v-model="itemForm.external_url"
                placeholder="https://example.com"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <div class="flex gap-2">
              <BaseButton type="submit" :disabled="saving || !selectedFooterMenuId">
                <CheckCircle2 class="size-4" />
                {{ editingItemId ? 'Update link' : 'Add link' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="resetItemForm"
                >Reset</BaseButton
              >
            </div>
          </form>
        </div>
      </section>
    </template>
  </div>
</template>
