<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, RefreshCw } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast'
import { pageTemplatesApi } from '@/features/landing/shared/api/page-templates.api'
import { PAGE_TEMPLATE_CATEGORIES } from '@/features/landing/shared/page-template-categories'
import type {
  PageTemplateAdminSummary,
  PageTemplateCategory,
  PageTemplateStatus,
} from '@/features/landing/shared/types/page-template.types'
import { useLandingChromeStore } from '@/stores/landingChrome'
import { useLandingPricingStore } from '@/stores/landingPricing'
import { useTenantStore } from '@/stores/tenant.store'
import { usePageSelection } from '../composables/usePageSelection'
import { createRenderQueue } from '../templates/gallery-logic'
import { buildTemplatePreviewChrome, toChromePlans } from '../templates/preview-chrome'
import SaveAsTemplateDialog from '../templates/SaveAsTemplateDialog.vue'
import {
  isPlatformLocked,
  rowActions,
  type TemplateRowAction,
} from '../templates/template-admin-logic'
import TemplateCard from '../templates/TemplateCard.vue'
import TemplatePreviewPane from '../templates/TemplatePreviewPane.vue'

withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: 'Galeri Template',
  description: 'Kelola template halaman yang tampil di galeri editor semua organisasi.',
})

const STATUS_LABEL: Record<PageTemplateStatus, string> = {
  draft: 'Draft',
  published: 'Terbit',
  archived: 'Arsip',
}
const ACTION_LABEL: Record<TemplateRowAction, string> = {
  preview: 'Preview',
  publish: 'Terbitkan',
  unpublish: 'Kembalikan ke draft',
  archive: 'Arsipkan',
  restore: 'Pulihkan',
  edit: 'Edit',
  'open-source': 'Buka halaman sumber',
  'copy-to-page': 'Salin ke halaman untuk diedit',
}

const router = useRouter()
const toast = useToast()
const { selectedPageId, loadPages } = usePageSelection()
const chromeStore = useLandingChromeStore()
const pricingStore = useLandingPricingStore()
const tenantStore = useTenantStore()

const items = ref<PageTemplateAdminSummary[]>([])
const loading = ref(false)
const loadError = ref('')
const statusFilter = ref<PageTemplateStatus | 'all'>('all')
const categoryFilter = ref<PageTemplateCategory | 'all'>('all')

const previewing = ref<PageTemplateAdminSummary | null>(null)
const archiving = ref<PageTemplateAdminSummary | null>(null)
const editing = ref<PageTemplateAdminSummary | null>(null)
const editLocked = ref(false)

const queue = createRenderQueue(4)

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

const rows = computed(() =>
  items.value
    .filter(
      (t) =>
        (statusFilter.value === 'all' || t.status === statusFilter.value) &&
        (categoryFilter.value === 'all' || t.category === categoryFilter.value),
    )
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
)

function categoryLabel(code: string): string {
  return PAGE_TEMPLATE_CATEGORIES.find((c) => c.code === code)?.label ?? code
}

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : ''
}

function messageOf(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  )
}

async function reload() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await pageTemplatesApi.listAll()
  } catch (error) {
    loadError.value = messageOf(error, 'Galeri template belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void chromeStore.load()
  void pricingStore.load()
  void reload()
})

async function changeStatus(t: PageTemplateAdminSummary, status: PageTemplateStatus, done: string) {
  try {
    await pageTemplatesApi.update(t.id, { status })
    toast.success(done)
    await reload()
  } catch (error) {
    toast.error(messageOf(error, 'Gagal mengubah template.'))
  }
}

async function openInEditor(pageId: string) {
  // Daftar halaman di-cache modul; muat ulang agar halaman baru hasil salinan ikut ada.
  await loadPages()
  selectedPageId.value = pageId
  await router.push({ name: 'platform-landing-pages-content' })
}

async function copyToPage(t: PageTemplateAdminSummary) {
  try {
    const { page_id } = await pageTemplatesApi.copyToPage(t.id)
    toast.success(`Template "${t.name}" disalin ke halaman baru.`)
    await openInEditor(page_id)
  } catch (error) {
    toast.error(messageOf(error, 'Gagal menyalin template ke halaman.'))
  }
}

async function startEdit(t: PageTemplateAdminSummary) {
  editLocked.value = t.platform_only
  try {
    // Kunci platform_only ditentukan dari isi template, jadi detail dibaca dulu.
    editLocked.value = isPlatformLocked((await pageTemplatesApi.get(t.id)).html)
  } catch {
    // Server tetap menegakkan kunci; dialog hanya tidak menandainya.
  }
  editing.value = t
}

async function submitEdit(values: {
  name: string
  category: PageTemplateCategory
  description: string
  sort_order: number
  platform_only: boolean
}) {
  const target = editing.value
  if (!target) return
  await pageTemplatesApi.update(target.id, {
    name: values.name,
    category: values.category,
    description: values.description,
    sort_order: values.sort_order,
    platform_only: values.platform_only,
  })
  toast.success(`Template "${values.name}" diperbarui.`)
  await reload()
}

function confirmArchive() {
  const t = archiving.value
  archiving.value = null
  if (t) void changeStatus(t, 'archived', `Template "${t.name}" diarsipkan.`)
}

function runAction(action: TemplateRowAction, t: PageTemplateAdminSummary) {
  switch (action) {
    case 'preview':
      previewing.value = t
      break
    case 'publish':
      void changeStatus(t, 'published', `Template "${t.name}" diterbitkan.`)
      break
    case 'unpublish':
      void changeStatus(t, 'draft', `Template "${t.name}" dikembalikan ke draft.`)
      break
    case 'restore':
      // Kembali ke draft (bukan terbit) supaya admin sempat me-review sebelum terlihat tenant.
      void changeStatus(t, 'draft', `Template "${t.name}" dipulihkan sebagai draft.`)
      break
    case 'archive':
      archiving.value = t
      break
    case 'edit':
      void startEdit(t)
      break
    case 'open-source':
      if (t.source_page_id) void openInEditor(t.source_page_id)
      break
    case 'copy-to-page':
      void copyToPage(t)
      break
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="title" :description="description">
      <BaseButton variant="outline" :disabled="loading" @click="reload">
        <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        Muat ulang
      </BaseButton>
    </PageHeader>

    <div class="flex flex-wrap gap-3">
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        Status
        <select
          v-model="statusFilter"
          name="status-filter"
          class="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="all">Semua</option>
          <option value="draft">Draft</option>
          <option value="published">Terbit</option>
          <option value="archived">Arsip</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        Kategori
        <select
          v-model="categoryFilter"
          name="category-filter"
          class="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="all">Semua</option>
          <option v-for="c in PAGE_TEMPLATE_CATEGORIES" :key="c.code" :value="c.code">
            {{ c.label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loadError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {{ loadError }}
    </p>

    <div
      class="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <table class="w-full min-w-[960px] text-left text-sm">
        <thead class="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800">
          <tr>
            <th class="p-3 font-medium">Thumbnail</th>
            <th class="p-3 font-medium">Template</th>
            <th class="p-3 font-medium">Kategori</th>
            <th class="p-3 font-medium">Status</th>
            <th class="p-3 font-medium">Sumber</th>
            <th class="p-3 font-medium">Urutan</th>
            <th class="p-3 font-medium">Diperbarui</th>
            <th class="p-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in rows"
            :key="t.id"
            class="border-b border-gray-100 align-top last:border-0 dark:border-gray-800"
            :data-template-id="t.id"
          >
            <td class="p-3">
              <TemplateCard
                compact
                :template="t"
                :chrome="chrome"
                :queue="queue"
                :load-detail="pageTemplatesApi.get"
                @open="previewing = t"
              />
            </td>
            <td class="max-w-xs p-3">
              <p class="font-semibold text-gray-900 dark:text-gray-100">{{ t.name }}</p>
              <p class="line-clamp-2 text-xs text-gray-500">{{ t.description }}</p>
              <p v-if="t.platform_only" class="mt-1 text-xs font-medium text-violet-700">
                Khusus platform
              </p>
            </td>
            <td class="p-3">{{ categoryLabel(t.category) }}</td>
            <td class="p-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-700': t.status === 'draft',
                  'bg-emerald-50 text-emerald-700': t.status === 'published',
                  'bg-amber-50 text-amber-700': t.status === 'archived',
                }"
              >
                {{ STATUS_LABEL[t.status] }}
              </span>
            </td>
            <td class="p-3">
              {{ t.source === 'seed' ? 'Bawaan' : 'Admin' }}
              <span v-if="t.seed_modified" class="ml-1 text-xs text-gray-500">diedit</span>
            </td>
            <td class="p-3">{{ t.sort_order }}</td>
            <td class="p-3">{{ formatDate(t.updated_at) }}</td>
            <td class="p-3">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="action in rowActions(t)"
                  :key="action"
                  type="button"
                  class="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  :data-action="action"
                  @click="runAction(action, t)"
                >
                  {{ ACTION_LABEL[action] }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && rows.length === 0">
            <td colspan="8" class="p-8 text-center text-sm text-gray-500">
              Belum ada template yang cocok dengan filter.
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 class="size-4 animate-spin" aria-hidden="true" />
        Memuat template…
      </p>
    </div>

    <BaseModal
      :open="!!previewing"
      :title="previewing?.name ?? 'Preview'"
      width-class="max-w-[1200px]"
      @close="previewing = null"
    >
      <TemplatePreviewPane
        v-if="previewing"
        :template="previewing"
        action-label=""
        @back="previewing = null"
      />
    </BaseModal>

    <SaveAsTemplateDialog
      v-if="editing"
      :open="!!editing"
      mode="edit"
      :initial="{
        name: editing.name,
        description: editing.description,
        category: editing.category,
        sort_order: editing.sort_order,
        platform_only: editing.platform_only || editLocked,
        locked: editLocked,
      }"
      :submit="submitEdit"
      @close="editing = null"
    />

    <ConfirmDialog
      :open="!!archiving"
      title="Arsipkan template?"
      :message="`Template &quot;${archiving?.name ?? ''}&quot; akan hilang dari galeri semua organisasi. Anda bisa memulihkannya sebagai draft.`"
      confirm-label="Arsipkan"
      tone="danger"
      @confirm="confirmArchive"
      @cancel="archiving = null"
    />
  </div>
</template>
