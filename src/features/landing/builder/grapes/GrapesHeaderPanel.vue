<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'

import LogoUploadField from '@/features/landing/builder/components/fields/LogoUploadField.vue'
import {
  buildDestination,
  destinationForApi,
  formFromItem,
  hrefForItem,
  normalizeLinkType,
  type NavLinkType,
} from '@/features/landing/shared/nav/destination'
import type { LandingMenuItem } from '@/features/landing/shared/types/landing.types'
import { useLandingChromeStore } from '@/stores/landingChrome'
import {
  DEFAULT_HEADER_PRESENTATION,
  parseHeaderPresentation,
  type TenantHeaderPresentation,
} from './grapes.header-component'

/**
 * Right-pane editor for a selected `zyad-tenant-header` component.
 * - Logo & Brand + Navigation → tenant-wide (`useLandingChromeStore`, persists
 *   immediately to /admin/landing/{branding,menus}).
 * - Action & Tampilan → per-page presentation, written onto the component as the
 *   `data-zyad-header` JSON attribute (picked up by autosave + publish).
 */

const props = defineProps<{
  component: {
    getAttributes: () => Record<string, string>
    addAttributes: (attrs: Record<string, string>) => void
  }
}>()

const chrome = useLandingChromeStore()

// ── Per-page presentation ──────────────────────────────────────────────────
const pres = reactive<TenantHeaderPresentation>({ ...DEFAULT_HEADER_PRESENTATION })

watch(
  () => props.component,
  (component) => {
    Object.assign(pres, parseHeaderPresentation(component.getAttributes()['data-zyad-header']))
  },
  { immediate: true },
)

function setPres<K extends keyof TenantHeaderPresentation>(
  key: K,
  value: TenantHeaderPresentation[K],
) {
  pres[key] = value
  props.component.addAttributes({ 'data-zyad-header': JSON.stringify({ ...pres }) })
}

const variantOpts = [
  { value: 'solid', label: 'Solid (putih)' },
  { value: 'transparent', label: 'Transparan' },
  { value: 'glass', label: 'Glass (blur)' },
]
const alignOpts = [
  { value: 'left', label: 'Kiri' },
  { value: 'center', label: 'Tengah' },
  { value: 'right', label: 'Kanan' },
]

// ── Brand (tenant-wide, live-previewed then persisted) ─────────────────────
const brand = reactive({ company_name: '', logo_light_url: '', logo_dark_url: '' })
const brandDirty = ref(false)

watch(
  () => chrome.canvasBranding,
  (b) => {
    if (brandDirty.value) return
    brand.company_name = b.companyName
    brand.logo_light_url = b.logoUrl
    brand.logo_dark_url = b.logoDarkUrl
  },
  { immediate: true, deep: true },
)

function touchBrand(patch: Partial<typeof brand>) {
  Object.assign(brand, patch)
  brandDirty.value = true
  chrome.setBrandDraft({ ...patch })
}

async function saveBrand() {
  await chrome.saveBranding({
    company_name: brand.company_name,
    logo_light_url: brand.logo_light_url,
    logo_dark_url: brand.logo_dark_url,
  })
  if (!chrome.saveError) brandDirty.value = false
}

// ── Navigation items (tenant-wide) ────────────────────────────────────────
const topLevelItems = computed(() =>
  [...chrome.navItems].filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order),
)

const showItemForm = ref(false)
const editingId = ref('')
const formError = ref('')
const itemForm = reactive({
  label: '',
  link_type: 'internal_page' as NavLinkType,
  slug: '',
  anchor: '',
  externalUrl: '',
  target: 'self',
})

const previewHref = computed(() =>
  buildDestination({
    link_type: itemForm.link_type,
    slug: itemForm.slug,
    anchor: itemForm.anchor,
    externalUrl: itemForm.externalUrl,
  }),
)

function resetItemForm() {
  editingId.value = ''
  formError.value = ''
  itemForm.label = ''
  itemForm.link_type = 'internal_page'
  itemForm.slug = ''
  itemForm.anchor = ''
  itemForm.externalUrl = ''
  itemForm.target = 'self'
}

function startAdd() {
  resetItemForm()
  showItemForm.value = true
}

function startEdit(item: LandingMenuItem) {
  const f = formFromItem(item)
  editingId.value = item.id
  formError.value = ''
  itemForm.label = item.label
  itemForm.link_type = normalizeLinkType(item.link_type)
  itemForm.slug = f.slug
  itemForm.anchor = f.anchor
  itemForm.externalUrl = f.externalUrl
  itemForm.target = item.target || 'self'
  showItemForm.value = true
}

function cancelItem() {
  resetItemForm()
  showItemForm.value = false
}

async function submitItem() {
  formError.value = ''
  if (!itemForm.label.trim()) {
    formError.value = 'Label wajib diisi.'
    return
  }
  const destination = destinationForApi({
    link_type: itemForm.link_type,
    slug: itemForm.slug,
    anchor: itemForm.anchor,
    externalUrl: itemForm.externalUrl,
  })
  if (!destination) {
    formError.value = 'Tujuan wajib diisi.'
    return
  }
  if (itemForm.link_type === 'external_link') {
    try {
      new URL(itemForm.externalUrl)
    } catch {
      formError.value = 'URL eksternal harus valid (https://…).'
      return
    }
  }
  const payload = {
    label: itemForm.label.trim(),
    link_type: itemForm.link_type,
    destination,
    target: itemForm.target,
    is_enabled: true,
    parent_id: null,
  }
  if (editingId.value) await chrome.updateNavItem(editingId.value, payload)
  else await chrome.addNavItem(payload)
  if (!chrome.saveError) cancelItem()
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Header</p>
    <p v-if="chrome.readOnly" class="hp-note">
      Anda tidak punya izin mengedit navigasi / brand tenant.
    </p>
    <p v-if="chrome.loadError" class="hp-error">{{ chrome.loadError }}</p>
    <p v-if="chrome.saveError" class="hp-error">{{ chrome.saveError }}</p>

    <!-- ── Logo & Brand ─────────────────────────────────────────────────── -->
    <details class="hp-sec" open>
      <summary>Logo &amp; Brand<ChevronDown class="hp-chev" /></summary>
      <div class="hp-body">
        <label class="hp-label">
          Nama brand
          <input
            :value="brand.company_name"
            type="text"
            class="hp-input"
            :disabled="chrome.readOnly"
            @input="touchBrand({ company_name: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <LogoUploadField
          :model-value="brand.logo_light_url"
          label="Logo (mode terang)"
          @update:model-value="touchBrand({ logo_light_url: $event })"
        />
        <LogoUploadField
          :model-value="brand.logo_dark_url"
          label="Logo (mode gelap)"
          hint="Dipakai saat header transparan / glass di atas area gelap."
          @update:model-value="touchBrand({ logo_dark_url: $event })"
        />
        <button
          type="button"
          class="hp-btn"
          :disabled="!brandDirty || chrome.saving || chrome.readOnly"
          @click="saveBrand"
        >
          <Loader2 v-if="chrome.saving" class="size-3.5 animate-spin" />
          Simpan brand
        </button>
      </div>
    </details>

    <!-- ── Navigation ──────────────────────────────────────────────────── -->
    <details class="hp-sec" open>
      <summary>Navigation<ChevronDown class="hp-chev" /></summary>
      <div class="hp-body">
        <ul v-if="topLevelItems.length" class="hp-items">
          <li v-for="(item, idx) in topLevelItems" :key="item.id" class="hp-item">
            <span class="hp-item-main">
              <span class="hp-item-label">{{ item.label }}</span>
              <span class="hp-item-dest">{{ hrefForItem(item) || '—' }}</span>
            </span>
            <span class="hp-item-actions">
              <button
                type="button"
                title="Naik"
                :disabled="idx === 0 || chrome.saving"
                @click="chrome.moveNavItem(item.id, -1)"
              >
                <ChevronUp class="size-3.5" />
              </button>
              <button
                type="button"
                title="Turun"
                :disabled="idx === topLevelItems.length - 1 || chrome.saving"
                @click="chrome.moveNavItem(item.id, 1)"
              >
                <ChevronDown class="size-3.5" />
              </button>
              <button type="button" title="Edit" @click="startEdit(item)">
                <Pencil class="size-3.5" />
              </button>
              <button
                type="button"
                title="Hapus"
                :disabled="chrome.saving"
                @click="chrome.removeNavItem(item.id)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </span>
          </li>
        </ul>
        <p v-else class="hp-empty">Belum ada item navigasi.</p>

        <button
          v-if="!showItemForm"
          type="button"
          class="hp-btn"
          :disabled="chrome.readOnly"
          @click="startAdd"
        >
          <Plus class="size-3.5" /> Tambah item
        </button>

        <div v-else class="hp-form">
          <label class="hp-label">
            Label
            <input v-model="itemForm.label" type="text" class="hp-input" placeholder="Pricing" />
          </label>
          <label class="hp-label">
            Jenis tautan
            <select v-model="itemForm.link_type" class="hp-input">
              <option value="internal_page">Halaman internal</option>
              <option value="anchor">Anchor (#bagian)</option>
              <option value="external_link">URL eksternal</option>
              <option value="button">Tombol</option>
            </select>
          </label>
          <label v-if="itemForm.link_type === 'anchor'" class="hp-label">
            Anchor
            <input v-model="itemForm.anchor" type="text" class="hp-input" placeholder="faq" />
          </label>
          <label v-else-if="itemForm.link_type === 'external_link'" class="hp-label">
            URL
            <input
              v-model="itemForm.externalUrl"
              type="url"
              class="hp-input"
              placeholder="https://…"
            />
          </label>
          <label v-else class="hp-label">
            Slug halaman
            <input v-model="itemForm.slug" type="text" class="hp-input" placeholder="pricing" />
          </label>
          <p class="hp-hint">Tujuan: {{ previewHref || '—' }}</p>
          <p v-if="formError" class="hp-error">{{ formError }}</p>
          <div class="hp-form-actions">
            <button type="button" class="hp-btn" :disabled="chrome.saving" @click="submitItem">
              {{ editingId ? 'Simpan' : 'Tambah' }}
            </button>
            <button type="button" class="hp-btn hp-btn--ghost" @click="cancelItem">Batal</button>
          </div>
        </div>
      </div>
    </details>

    <!-- ── Action & Tampilan (per halaman) ─────────────────────────────── -->
    <details class="hp-sec" open>
      <summary>Action &amp; Tampilan<ChevronDown class="hp-chev" /></summary>
      <div class="hp-body">
        <label class="hp-check">
          <input
            type="checkbox"
            :checked="pres.showAction"
            @change="setPres('showAction', ($event.target as HTMLInputElement).checked)"
          />
          Tampilkan tombol action
        </label>
        <template v-if="pres.showAction">
          <label class="hp-label">
            Label tombol
            <input
              :value="pres.actionLabel"
              type="text"
              class="hp-input"
              @input="setPres('actionLabel', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="hp-label">
            URL tombol
            <input
              :value="pres.actionUrl"
              type="text"
              class="hp-input"
              placeholder="/login"
              @input="setPres('actionUrl', ($event.target as HTMLInputElement).value)"
            />
          </label>
        </template>
        <label class="hp-label">
          Gaya
          <select
            :value="pres.variant"
            class="hp-input"
            @change="setPres('variant', ($event.target as HTMLSelectElement).value as never)"
          >
            <option v-for="o in variantOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label class="hp-label">
          Posisi konten
          <select
            :value="pres.align"
            class="hp-input"
            @change="setPres('align', ($event.target as HTMLSelectElement).value as never)"
          >
            <option v-for="o in alignOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label class="hp-check">
          <input
            type="checkbox"
            :checked="pres.sticky"
            @change="setPres('sticky', ($event.target as HTMLInputElement).checked)"
          />
          Sticky (menempel saat scroll)
        </label>
      </div>
    </details>
  </div>
</template>

<style scoped>
.hp {
  padding: 12px 12px 24px;
  font-size: 12px;
  color: #475569;
}
.hp-title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}
.hp-note {
  margin: 0 0 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff7ed;
  color: #b45309;
}
.hp-error {
  margin: 6px 0;
  color: #dc2626;
}
.hp-sec {
  border-top: 1px solid #f1f5f9;
}
.hp-sec > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
  cursor: pointer;
  list-style: none;
}
.hp-sec > summary::-webkit-details-marker {
  display: none;
}
.hp-chev {
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease;
}
.hp-sec[open] > summary .hp-chev {
  transform: rotate(180deg);
}
.hp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 12px;
}
.hp-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}
.hp-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
}
.hp-input:focus {
  outline: none;
  border-color: #465fff;
  box-shadow: 0 0 0 3px rgba(70, 95, 255, 0.12);
}
.hp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}
.hp-hint {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}
.hp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: #465fff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.hp-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.hp-btn--ghost {
  background: #f1f5f9;
  color: #475569;
}
.hp-form,
.hp-form-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hp-form-actions {
  flex-direction: row;
}
.hp-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.hp-item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.hp-item-label {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}
.hp-item-dest {
  font-size: 10px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hp-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.hp-item-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}
.hp-item-actions button:hover:not(:disabled) {
  background: #f1f5f9;
  color: #465fff;
}
.hp-item-actions button:disabled {
  opacity: 0.4;
  cursor: default;
}
.hp-empty {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}
</style>
