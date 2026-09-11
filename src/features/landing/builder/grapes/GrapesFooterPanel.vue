<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-vue-next'

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

/**
 * Right-pane editor for a selected `zyad-tenant-footer` component.
 * Only the footer nav items are edited here (tenant-wide, persists immediately
 * to /admin/landing/menus) — brand comes from the same tenant branding edited
 * in the header panel, and copyright/columns are out of scope (see
 * grapes.footer-component.ts doc comment). Removing this component from the
 * canvas is the "don't use a footer" toggle — there is no separate flag.
 */

const chrome = useLandingChromeStore()

const items = computed(() =>
  [...chrome.footerItems].filter((i) => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order),
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
  if (editingId.value) await chrome.updateFooterNavItem(editingId.value, payload)
  else await chrome.addFooterNavItem(payload)
  if (!chrome.saveError) cancelItem()
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Footer</p>
    <p v-if="chrome.readOnly" class="hp-note">
      Anda tidak punya izin mengedit navigasi / brand tenant.
    </p>
    <p v-if="chrome.loadError" class="hp-error">{{ chrome.loadError }}</p>
    <p v-if="chrome.saveError" class="hp-error">{{ chrome.saveError }}</p>

    <details class="hp-sec" open>
      <summary>Navigation<ChevronDown class="hp-chev" /></summary>
      <div class="hp-body">
        <p class="hp-hint">
          Hapus block ini dari kanvas kalau halaman ini tidak perlu footer tenant.
        </p>
        <ul v-if="items.length" class="hp-items">
          <li v-for="(item, idx) in items" :key="item.id" class="hp-item">
            <span class="hp-item-main">
              <span class="hp-item-label">{{ item.label }}</span>
              <span class="hp-item-dest">{{ hrefForItem(item) || '—' }}</span>
            </span>
            <span class="hp-item-actions">
              <button
                type="button"
                title="Naik"
                :disabled="idx === 0 || chrome.saving"
                @click="chrome.moveFooterNavItem(item.id, -1)"
              >
                <ChevronUp class="size-3.5" />
              </button>
              <button
                type="button"
                title="Turun"
                :disabled="idx === items.length - 1 || chrome.saving"
                @click="chrome.moveFooterNavItem(item.id, 1)"
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
                @click="chrome.removeFooterNavItem(item.id)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </span>
          </li>
        </ul>
        <p v-else class="hp-empty">Belum ada item navigasi footer.</p>

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
            <input v-model="itemForm.label" type="text" class="hp-input" placeholder="Kebijakan" />
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
            <input v-model="itemForm.slug" type="text" class="hp-input" placeholder="privacy" />
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
