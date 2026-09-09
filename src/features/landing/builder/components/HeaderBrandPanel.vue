<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ChevronDown, Trash2 } from 'lucide-vue-next'

import { landingApi } from '@/features/landing/shared/api/landing.api'
import {
  buildDestination,
  destinationForApi,
  formFromItem,
  normalizeLinkType,
  type NavLinkType,
} from '@/features/landing/shared/nav/destination'
import type { LandingMenuItem, LandingPage } from '@/features/landing/shared/types/landing.types'
import { useLandingChromeStore } from '@/stores/landingChrome'
import ColorField from './fields/ColorField.vue'

const store = useLandingChromeStore()

const topLevelItems = computed(() =>
  [...store.navItems].filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order),
)

// ── Nav item editor ─────────────────────────────────────────────────────────
const publishedPages = ref<LandingPage[]>([])
const editingId = ref('')
const itemForm = reactive({
  label: '',
  link_type: 'internal_page' as NavLinkType,
  slug: '',
  anchor: '',
  externalUrl: '',
  target: 'self',
  is_enabled: true,
})

const previewHref = computed(() =>
  buildDestination({
    link_type: itemForm.link_type,
    slug: itemForm.slug,
    anchor: itemForm.anchor,
    externalUrl: itemForm.externalUrl,
  }),
)

onMounted(async () => {
  try {
    const res = await landingApi.getPages({ per_page: 100, is_template: false })
    publishedPages.value = res.data.filter((p) => p.status === 'published' && !p.is_template)
  } catch {
    publishedPages.value = []
  }
  resetItemForm()
})

function resetItemForm() {
  editingId.value = ''
  itemForm.label = ''
  itemForm.link_type = 'internal_page'
  itemForm.slug = publishedPages.value[0]?.slug ?? ''
  itemForm.anchor = ''
  itemForm.externalUrl = ''
  itemForm.target = 'self'
  itemForm.is_enabled = true
}

function editItem(item: LandingMenuItem) {
  editingId.value = item.id
  const f = formFromItem(item)
  itemForm.label = item.label
  itemForm.link_type = normalizeLinkType(item.link_type)
  itemForm.slug = f.slug
  itemForm.anchor = f.anchor
  itemForm.externalUrl = f.externalUrl
  itemForm.target = item.target || 'self'
  itemForm.is_enabled = item.is_enabled
}

const formError = ref('')

function validate(): boolean {
  formError.value = ''
  if (!itemForm.label.trim()) {
    formError.value = 'Label wajib diisi.'
    return false
  }
  const dest = destinationForApi({
    link_type: itemForm.link_type,
    slug: itemForm.slug,
    anchor: itemForm.anchor,
    externalUrl: itemForm.externalUrl,
  })
  if (!dest) {
    formError.value = 'Tujuan wajib dipilih.'
    return false
  }
  if (itemForm.link_type === 'external_link') {
    try {
      new URL(itemForm.externalUrl)
    } catch {
      formError.value = 'External URL harus valid (https://…).'
      return false
    }
  }
  return true
}

async function submitItem() {
  if (!validate()) return
  const payload = {
    label: itemForm.label.trim(),
    link_type: itemForm.link_type,
    destination: destinationForApi({
      link_type: itemForm.link_type,
      slug: itemForm.slug,
      anchor: itemForm.anchor,
      externalUrl: itemForm.externalUrl,
    }),
    target: itemForm.target,
    is_enabled: itemForm.is_enabled,
    parent_id: null,
  }
  if (editingId.value) await store.updateNavItem(editingId.value, payload)
  else await store.addNavItem(payload)
  if (!store.saveError) resetItemForm()
}

// ── Brand editor ────────────────────────────────────────────────────────────
const brand = reactive({
  company_name: '',
  tagline: '',
  logo_light_url: '',
  primary: '',
  secondary: '',
  accent: '',
  heading_font: '',
  body_font: '',
  email: '',
  phone: '',
})

function seedBrand() {
  const b = store.branding
  const colors = (b?.colors ?? {}) as Record<string, string>
  const typo = (b?.typography ?? {}) as Record<string, string>
  const contact = (b?.contact ?? {}) as Record<string, string>
  brand.company_name = b?.company_name ?? ''
  brand.tagline = b?.tagline ?? ''
  brand.logo_light_url = b?.logo_light_url ?? ''
  brand.primary = colors.primary ?? ''
  brand.secondary = colors.secondary ?? ''
  brand.accent = colors.accent ?? ''
  brand.heading_font = typo.heading_font ?? ''
  brand.body_font = typo.body_font ?? ''
  brand.email = contact.email ?? ''
  brand.phone = contact.phone ?? ''
}

watch(() => store.branding, seedBrand, { immediate: true })

async function saveBrand() {
  const existingColors = (store.branding?.colors ?? {}) as Record<string, unknown>
  const existingTypo = (store.branding?.typography ?? {}) as Record<string, unknown>
  const existingContact = (store.branding?.contact ?? {}) as Record<string, unknown>
  await store.saveBranding({
    company_name: brand.company_name,
    tagline: brand.tagline,
    logo_light_url: brand.logo_light_url,
    colors: {
      ...existingColors,
      primary: brand.primary || undefined,
      secondary: brand.secondary || undefined,
      accent: brand.accent || undefined,
    },
    typography: {
      ...existingTypo,
      heading_font: brand.heading_font || undefined,
      body_font: brand.body_font || undefined,
    },
    contact: {
      ...existingContact,
      email: brand.email || undefined,
      phone: brand.phone || undefined,
    },
  } as never)
}

const inputCls =
  'mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950'
</script>

<template>
  <div class="space-y-3">
    <div class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40">
      Header &amp; brand berlaku untuk <strong>semua halaman</strong> tenant ini. Perubahan langsung
      disimpan (tidak lewat tombol Publish page).
    </div>
    <p v-if="store.saveError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ store.saveError }}
    </p>
    <p
      v-if="store.readOnly"
      class="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800"
    >
      Mode baca saja — Anda tidak punya izin mengubah navigasi / brand.
    </p>

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700" open>
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Navigasi
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
        <ul v-if="topLevelItems.length" class="space-y-1.5">
          <li
            v-for="(item, index) in topLevelItems"
            :key="item.id"
            class="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm dark:border-gray-700"
          >
            <span class="min-w-0 flex-1 truncate">
              {{ item.label }}
              <span v-if="!item.is_enabled" class="text-xs text-gray-400">· nonaktif</span>
            </span>
            <button
              type="button"
              class="rounded px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              :disabled="index === 0 || store.saving"
              title="Naik"
              @click="store.moveNavItem(item.id, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="rounded px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              :disabled="index === topLevelItems.length - 1 || store.saving"
              title="Turun"
              @click="store.moveNavItem(item.id, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="rounded px-1.5 text-xs font-semibold text-brand-600 hover:underline"
              @click="editItem(item)"
            >
              Edit
            </button>
            <button
              type="button"
              class="rounded p-1 text-gray-400 hover:text-red-600"
              title="Hapus"
              @click="store.removeNavItem(item.id)"
            >
              <Trash2 class="size-3.5" />
            </button>
          </li>
        </ul>
        <p
          v-else
          class="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-400"
        >
          Belum ada item navigasi.
        </p>

        <div class="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <p class="text-xs font-semibold text-gray-500">
            {{ editingId ? 'Edit item' : 'Tambah item' }}
          </p>
          <label class="block text-xs text-gray-500">
            Label
            <input v-model="itemForm.label" :class="inputCls" placeholder="Pricing" />
          </label>
          <label class="block text-xs text-gray-500">
            Tipe tautan
            <select v-model="itemForm.link_type" :class="inputCls">
              <option value="internal_page">Halaman landing</option>
              <option value="anchor">Anchor section</option>
              <option value="external_link">URL eksternal</option>
              <option value="button">Tombol ke halaman landing</option>
            </select>
          </label>
          <label
            v-if="itemForm.link_type === 'internal_page' || itemForm.link_type === 'button'"
            class="block text-xs text-gray-500"
          >
            Halaman tujuan
            <select v-model="itemForm.slug" :class="inputCls">
              <option v-for="p in publishedPages" :key="p.id" :value="p.slug">
                {{ p.title || p.name }} — /{{ p.slug }}
              </option>
            </select>
          </label>
          <label v-else-if="itemForm.link_type === 'anchor'" class="block text-xs text-gray-500">
            Anchor
            <input v-model="itemForm.anchor" :class="inputCls" placeholder="pricing" />
          </label>
          <label v-else class="block text-xs text-gray-500">
            URL eksternal
            <input v-model="itemForm.externalUrl" :class="inputCls" placeholder="https://…" />
          </label>
          <label class="block text-xs text-gray-500">
            Buka di
            <select v-model="itemForm.target" :class="inputCls">
              <option value="self">Tab sama</option>
              <option value="new_tab">Tab baru</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-xs text-gray-500">
            <input v-model="itemForm.is_enabled" type="checkbox" />
            Aktif
          </label>
          <p class="text-xs text-gray-400">Preview: {{ previewHref || '—' }}</p>
          <p v-if="formError" class="text-xs text-red-600">{{ formError }}</p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border px-2 py-1 text-xs font-semibold hover:bg-white disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              :disabled="store.saving || store.readOnly"
              @click="submitItem"
            >
              {{ editingId ? 'Simpan item' : 'Tambah' }}
            </button>
            <button
              v-if="editingId"
              type="button"
              class="rounded border px-2 py-1 text-xs font-semibold hover:bg-white dark:border-gray-700 dark:hover:bg-gray-800"
              @click="resetItemForm"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </details>

    <details class="group rounded-lg border border-gray-200 dark:border-gray-700">
      <summary
        class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
      >
        Brand
        <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div class="space-y-3 border-t border-gray-100 px-3 py-3 text-sm dark:border-gray-800">
        <label class="block text-xs text-gray-500">
          Nama brand
          <input v-model="brand.company_name" :class="inputCls" />
        </label>
        <label class="block text-xs text-gray-500">
          Tagline
          <input v-model="brand.tagline" :class="inputCls" />
        </label>
        <label class="block text-xs text-gray-500">
          URL logo (light)
          <input v-model="brand.logo_light_url" :class="inputCls" placeholder="/uploads/logo.png" />
        </label>
        <div>
          <span class="text-xs font-medium text-gray-500">Warna primary</span>
          <ColorField v-model="brand.primary" class="mt-1" />
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500">Warna secondary</span>
          <ColorField v-model="brand.secondary" class="mt-1" />
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500">Warna accent</span>
          <ColorField v-model="brand.accent" class="mt-1" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-xs text-gray-500">
            Font judul
            <input v-model="brand.heading_font" :class="inputCls" placeholder="Inter" />
          </label>
          <label class="block text-xs text-gray-500">
            Font isi
            <input v-model="brand.body_font" :class="inputCls" placeholder="Inter" />
          </label>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-xs text-gray-500">
            Email kontak
            <input v-model="brand.email" :class="inputCls" />
          </label>
          <label class="block text-xs text-gray-500">
            Telepon
            <input v-model="brand.phone" :class="inputCls" />
          </label>
        </div>
        <button
          type="button"
          class="rounded border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
          :disabled="store.saving || store.readOnly"
          @click="saveBrand"
        >
          Simpan brand
        </button>
      </div>
    </details>
  </div>
</template>
