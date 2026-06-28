<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type {
  LandingMenu,
  LandingMenuItem,
  LandingPage,
} from '@/features/landing/shared/types/landing.types'

type LinkType = 'internal_page' | 'external_link' | 'anchor' | 'button'
type MenuLocation = 'header' | 'footer' | 'sidebar'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    mode?: 'workspace' | 'platform'
    parentRouteName?: string
  }>(),
  {
    title: 'Landing Navigation',
    description: 'Kelola menu landing page dengan destination builder yang aman.',
    mode: 'workspace',
    parentRouteName: 'landing-pages',
  },
)

const menus = ref<LandingMenu[]>([])
const menuItems = ref<Record<string, LandingMenuItem[]>>({})
const pages = ref<LandingPage[]>([])
const selectedMenuId = ref('')
const editingItemId = ref('')
const loading = ref(false)
const saving = ref(false)
const actionBusy = ref('')
const errorMessage = ref('')
const notice = ref('')

const menuForm = reactive({
  name: 'Header Menu',
  location: 'header' as MenuLocation,
  is_active: true,
})

const itemForm = reactive({
  label: '',
  link_type: 'internal_page' as LinkType,
  destination: '',
  anchor: '',
  external_url: '',
  target: 'self',
  is_enabled: true,
})

const selectedMenu = computed(
  () => menus.value.find((menu) => menu.id === selectedMenuId.value) ?? null,
)
const selectedItems = computed(() =>
  selectedMenuId.value ? (menuItems.value[selectedMenuId.value] ?? []) : [],
)
const publishedPages = computed(() =>
  pages.value.filter((page) => page.status === 'published' && !page.is_template),
)
const previewDestination = computed(() => buildDestination())

onMounted(() => {
  void loadAll()
})

watch(selectedMenu, (menu) => {
  if (!menu) return
  menuForm.name = menu.name
  menuForm.location = menu.location as MenuLocation
  menuForm.is_active = menu.is_active
})

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [menuResponse, pageResponse] = await Promise.all([
      landingApi.getMenus(),
      landingApi.getPages({ per_page: 100, is_template: false }),
    ])
    menus.value = menuResponse.data
    pages.value = pageResponse.data.filter((page) => !page.is_template)
    selectedMenuId.value = selectedMenuId.value || menus.value[0]?.id || ''
    if (selectedMenuId.value) await loadItems(selectedMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal memuat data navigation.')
  } finally {
    loading.value = false
  }
}

async function loadItems(menuId: string) {
  const response = await landingApi.getMenuItems(menuId)
  menuItems.value = {
    ...menuItems.value,
    [menuId]: response.data,
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

function resetItemForm() {
  editingItemId.value = ''
  itemForm.label = ''
  itemForm.link_type = 'internal_page'
  itemForm.destination = publishedPages.value[0]?.slug ?? ''
  itemForm.anchor = ''
  itemForm.external_url = ''
  itemForm.target = 'self'
  itemForm.is_enabled = true
}

function selectMenu(menuId: string) {
  selectedMenuId.value = menuId
  void loadItems(menuId)
  resetItemForm()
}

function startCreateMenu() {
  selectedMenuId.value = ''
  menuForm.name = 'Header Menu'
  menuForm.location = 'header'
  menuForm.is_active = true
  resetItemForm()
}

function fillItemForm(item: LandingMenuItem) {
  editingItemId.value = item.id
  itemForm.label = item.label
  itemForm.link_type = normalizeLinkType(item.link_type)
  itemForm.target = item.target || 'self'
  itemForm.is_enabled = item.is_enabled

  if (itemForm.link_type === 'anchor') {
    itemForm.anchor = item.destination.replace(/^#/, '')
    itemForm.destination = ''
    itemForm.external_url = ''
    return
  }

  if (itemForm.link_type === 'external_link') {
    itemForm.external_url = item.destination
    itemForm.destination = ''
    itemForm.anchor = ''
    return
  }

  itemForm.destination = item.destination.replace(/^\//, '')
  itemForm.anchor = ''
  itemForm.external_url = ''
}

function normalizeLinkType(value: string): LinkType {
  if (value === 'external_link' || value === 'anchor' || value === 'button') return value
  return 'internal_page'
}

function buildDestination() {
  if (itemForm.link_type === 'anchor') {
    const anchor = itemForm.anchor.trim().replace(/^#/, '')
    return anchor ? `#${anchor}` : ''
  }
  if (itemForm.link_type === 'external_link') return itemForm.external_url.trim()
  const slug = itemForm.destination.trim().replace(/^\//, '')
  if (!slug || slug === 'public-marketing') return '/'
  return `/${slug}`
}

function destinationForApi() {
  const destination = buildDestination()
  if (itemForm.link_type === 'internal_page' || itemForm.link_type === 'button') {
    return destination === '/' ? 'public-marketing' : destination.replace(/^\//, '')
  }
  return destination
}

function itemHref(item: LandingMenuItem) {
  if (item.link_type === 'anchor')
    return item.destination.startsWith('#') ? item.destination : `#${item.destination}`
  if (item.link_type === 'internal_page' || item.link_type === 'button') {
    const slug = item.destination.replace(/^\//, '')
    return !slug || slug === 'public-marketing' ? '/' : `/${slug}`
  }
  return item.destination || '#'
}

function validateItem() {
  if (!selectedMenuId.value) return 'Pilih menu terlebih dahulu.'
  if (!itemForm.label.trim()) return 'Label menu wajib diisi.'
  if (!destinationForApi()) return 'Destination wajib dipilih.'
  if (itemForm.link_type === 'external_link') {
    try {
      new URL(itemForm.external_url)
    } catch {
      return 'External URL harus valid, contoh https://example.com.'
    }
  }
  return ''
}

async function saveMenu() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      name: menuForm.name.trim(),
      location: menuForm.location,
      is_active: menuForm.is_active,
    }
    if (selectedMenu.value) {
      const response = await landingApi.updateMenu(selectedMenu.value.id, payload)
      menus.value = menus.value.map((menu) => (menu.id === response.data.id ? response.data : menu))
      showNotice('Menu berhasil diperbarui.')
    } else {
      const response = await landingApi.createMenu(payload)
      menus.value = [response.data, ...menus.value]
      selectedMenuId.value = response.data.id
      showNotice('Menu berhasil dibuat.')
    }
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan menu.')
  } finally {
    saving.value = false
  }
}

async function saveItem() {
  const validationError = validateItem()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      label: itemForm.label.trim(),
      link_type: itemForm.link_type,
      destination: destinationForApi(),
      target: itemForm.target,
      sort_order: editingItemId.value ? undefined : selectedItems.value.length * 10 + 10,
      is_enabled: itemForm.is_enabled,
    }
    if (editingItemId.value) {
      await landingApi.updateMenuItem(selectedMenuId.value, editingItemId.value, payload)
      showNotice('Menu item berhasil diperbarui.')
    } else {
      await landingApi.createMenuItem(selectedMenuId.value, payload)
      showNotice('Menu item berhasil ditambahkan.')
    }
    await loadItems(selectedMenuId.value)
    resetItemForm()
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menyimpan menu item.')
  } finally {
    saving.value = false
  }
}

async function deleteItem(item: LandingMenuItem) {
  if (!selectedMenuId.value) return
  if (!window.confirm(`Hapus menu item "${item.label}"?`)) return
  actionBusy.value = `delete:${item.id}`
  errorMessage.value = ''
  try {
    await landingApi.deleteMenuItem(selectedMenuId.value, item.id)
    await loadItems(selectedMenuId.value)
    showNotice('Menu item berhasil dihapus.')
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal menghapus menu item.')
  } finally {
    actionBusy.value = ''
  }
}

async function moveItem(item: LandingMenuItem, direction: -1 | 1) {
  if (!selectedMenuId.value) return
  const items = [...selectedItems.value]
  const index = items.findIndex((entry) => entry.id === item.id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return
  const [selected] = items.splice(index, 1)
  if (!selected) return
  items.splice(targetIndex, 0, selected)
  actionBusy.value = `move:${item.id}`
  try {
    await landingApi.reorderMenuItems(selectedMenuId.value, {
      item_ids: items.map((entry) => entry.id),
    })
    await loadItems(selectedMenuId.value)
  } catch (error) {
    errorMessage.value = getApiMessage(error, 'Gagal mengubah urutan menu.')
  } finally {
    actionBusy.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="props.title" :description="props.description">
      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadAll">
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

    <div v-if="loading" class="grid min-h-[420px] place-items-center rounded-3xl border">
      <Loader2 class="size-8 animate-spin text-brand-500" />
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="space-y-4">
        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-gray-900 dark:text-white">Menu surfaces</h2>
              <p class="text-sm text-gray-500">Header, footer, atau sidebar.</p>
            </div>
            <BaseButton type="button" variant="secondary" @click="startCreateMenu">
              <Plus class="size-4" />
            </BaseButton>
          </div>
          <div class="mt-4 space-y-2">
            <button
              v-for="menu in menus"
              :key="menu.id"
              type="button"
              class="w-full rounded-2xl border px-4 py-3 text-left transition"
              :class="
                selectedMenuId === menu.id
                  ? 'border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30'
                  : 'hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'
              "
              @click="selectMenu(menu.id)"
            >
              <span class="flex items-center justify-between gap-3">
                <span class="font-bold text-gray-900 dark:text-white">{{ menu.name }}</span>
                <span
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {{ menu.location }}
                </span>
              </span>
              <span class="mt-1 block text-xs text-gray-500">
                {{ menu.is_active ? 'Active' : 'Inactive' }}
              </span>
            </button>
          </div>
        </section>

        <form
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
          @submit.prevent="saveMenu"
        >
          <h3 class="font-black text-gray-900 dark:text-white">
            {{ selectedMenu ? 'Edit menu' : 'Create menu' }}
          </h3>
          <div class="mt-4 space-y-3">
            <label class="block text-sm font-medium">
              Name
              <input
                v-model="menuForm.name"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label class="block text-sm font-medium">
              Location
              <select
                v-model="menuForm.location"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </label>
            <label
              class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-900"
            >
              <input v-model="menuForm.is_active" type="checkbox" />
              Active menu
            </label>
          </div>
          <BaseButton class="mt-4 w-full" type="submit" :disabled="saving">
            <CheckCircle2 class="size-4" />
            Save menu
          </BaseButton>
        </form>
      </aside>

      <main class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-xs font-black uppercase tracking-wide text-brand-600">
                Navigation items
              </p>
              <h2 class="text-2xl font-black text-gray-900 dark:text-white">
                {{ selectedMenu?.name || 'Pilih menu dulu' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                Destination internal page disimpan sebagai slug backend, tapi dipreview sebagai
                route Vue publik.
              </p>
            </div>
            <BaseButton
              v-if="selectedMenuId"
              type="button"
              variant="secondary"
              @click="loadItems(selectedMenuId)"
            >
              <RefreshCw class="size-4" />
              Reload items
            </BaseButton>
          </div>

          <div
            v-if="!selectedMenuId"
            class="mt-8 rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500"
          >
            Pilih atau buat menu surface terlebih dahulu.
          </div>

          <div
            v-else-if="selectedItems.length === 0"
            class="mt-8 rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500"
          >
            Belum ada item. Tambahkan item dari form di kanan.
          </div>

          <div v-else class="mt-6 space-y-3">
            <article
              v-for="(item, index) in selectedItems"
              :key="item.id"
              class="rounded-2xl border p-4 dark:border-gray-800"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-black text-gray-400">#{{ index + 1 }}</span>
                    <h3 class="font-black text-gray-900 dark:text-white">{{ item.label }}</h3>
                    <span
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {{ item.link_type.replaceAll('_', ' ') }}
                    </span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                      :class="
                        item.is_enabled
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      "
                    >
                      {{ item.is_enabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <p class="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Link2 class="size-4" />
                    <span class="break-all">{{ itemHref(item) }}</span>
                  </p>
                </div>
                <div class="flex flex-wrap gap-2 lg:justify-end">
                  <BaseButton
                    type="button"
                    variant="secondary"
                    :disabled="index === 0"
                    @click="moveItem(item, -1)"
                    >Up</BaseButton
                  >
                  <BaseButton
                    type="button"
                    variant="secondary"
                    :disabled="index === selectedItems.length - 1"
                    @click="moveItem(item, 1)"
                    >Down</BaseButton
                  >
                  <BaseButton type="button" variant="secondary" @click="fillItemForm(item)"
                    >Edit</BaseButton
                  >
                  <BaseButton
                    type="button"
                    variant="secondary"
                    :disabled="actionBusy === `delete:${item.id}`"
                    @click="deleteItem(item)"
                  >
                    <Trash2 class="size-4" />
                  </BaseButton>
                </div>
              </div>
            </article>
          </div>
        </section>

        <form
          class="rounded-3xl border bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
          @submit.prevent="saveItem"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-wide text-brand-600">
                Destination builder
              </p>
              <h2 class="text-xl font-black text-gray-900 dark:text-white">
                {{ editingItemId ? 'Edit menu item' : 'Add menu item' }}
              </h2>
            </div>
            <BaseButton type="button" variant="secondary" @click="resetItemForm">Reset</BaseButton>
          </div>

          <div class="mt-5 space-y-4">
            <label class="block text-sm font-medium">
              Label
              <input
                v-model="itemForm.label"
                placeholder="Pricing"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            <label class="block text-sm font-medium">
              Link type
              <select
                v-model="itemForm.link_type"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="internal_page">Landing page</option>
                <option value="anchor">Section anchor</option>
                <option value="external_link">External URL</option>
                <option value="button">CTA button to landing page</option>
              </select>
            </label>

            <label
              v-if="itemForm.link_type === 'internal_page' || itemForm.link_type === 'button'"
              class="block text-sm font-medium"
            >
              Landing page destination
              <select
                v-model="itemForm.destination"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option v-for="page in publishedPages" :key="page.id" :value="page.slug">
                  {{ page.title || page.name }} /{{ page.slug }}
                </option>
              </select>
              <span class="mt-1 block text-xs text-gray-500">
                Disimpan sebagai slug backend, dipakai frontend sebagai route publik.
              </span>
            </label>

            <label v-else-if="itemForm.link_type === 'anchor'" class="block text-sm font-medium">
              Section anchor
              <input
                v-model="itemForm.anchor"
                placeholder="pricing"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
              <span class="mt-1 block text-xs text-gray-500"
                >Contoh: pricing menjadi #pricing.</span
              >
            </label>

            <label v-else class="block text-sm font-medium">
              External URL
              <input
                v-model="itemForm.external_url"
                placeholder="https://example.com"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            <label class="block text-sm font-medium">
              Target
              <select
                v-model="itemForm.target"
                class="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="self">Same tab</option>
                <option value="new_tab">New tab</option>
              </select>
            </label>

            <label
              class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-900"
            >
              <input v-model="itemForm.is_enabled" type="checkbox" />
              Enabled
            </label>

            <div class="rounded-2xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p class="text-xs font-black uppercase tracking-wide text-gray-400">Preview route</p>
              <p class="mt-2 break-all text-sm font-semibold text-gray-900 dark:text-white">
                {{ previewDestination || 'Destination belum dipilih' }}
              </p>
              <a
                v-if="previewDestination"
                class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600"
                :href="previewDestination"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye class="size-4" />
                Open preview
              </a>
            </div>
          </div>

          <BaseButton class="mt-5 w-full" type="submit" :disabled="saving || !selectedMenuId">
            <CheckCircle2 class="size-4" />
            {{ editingItemId ? 'Save item' : 'Add item' }}
          </BaseButton>
        </form>
      </main>
    </div>
  </div>
</template>
