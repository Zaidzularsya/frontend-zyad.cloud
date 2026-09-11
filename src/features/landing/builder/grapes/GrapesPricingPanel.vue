<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ChevronDown, ChevronUp, Pencil, Plus, Star, Trash2 } from 'lucide-vue-next'

import { useLandingPricingStore } from '@/stores/landingPricing'
import type { LandingPricingPlan } from '@/features/landing/shared/types/landing.types'

/**
 * Right-pane editor for a selected `zyad-pricing-plans` component. Manages
 * the tenant's OWN pricing-plan cards (landing_pricing_plans) — marketing
 * content the tenant writes themselves for their landing pages, not an
 * integration with the platform's own subscription plans. Persists
 * immediately to /admin/landing/pricing-plans, same pattern as
 * GrapesFooterPanel.vue's nav items. Removing this component from the canvas
 * is the "don't show pricing" toggle — there is no separate flag.
 */

const pricing = useLandingPricingStore()

const showForm = ref(false)
const editingId = ref('')
const formError = ref('')
const form = reactive({
  name: '',
  price_label: '',
  interval_label: '',
  description: '',
  featuresText: '',
  cta_label: 'Pilih paket',
  cta_url: '',
  is_featured: false,
  is_enabled: true,
})

function resetForm() {
  editingId.value = ''
  formError.value = ''
  form.name = ''
  form.price_label = ''
  form.interval_label = ''
  form.description = ''
  form.featuresText = ''
  form.cta_label = 'Pilih paket'
  form.cta_url = ''
  form.is_featured = false
  form.is_enabled = true
}

function startAdd() {
  resetForm()
  showForm.value = true
}

function startEdit(plan: LandingPricingPlan) {
  editingId.value = plan.id
  formError.value = ''
  form.name = plan.name
  form.price_label = plan.price_label
  form.interval_label = plan.interval_label || ''
  form.description = plan.description || ''
  form.featuresText = plan.features.join('\n')
  form.cta_label = plan.cta_label || 'Pilih paket'
  form.cta_url = plan.cta_url || ''
  form.is_featured = plan.is_featured
  form.is_enabled = plan.is_enabled
  showForm.value = true
}

function cancel() {
  resetForm()
  showForm.value = false
}

async function submit() {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Nama paket wajib diisi.'
    return
  }
  if (!form.price_label.trim()) {
    formError.value = 'Harga wajib diisi.'
    return
  }
  const payload = {
    name: form.name.trim(),
    price_label: form.price_label.trim(),
    interval_label: form.interval_label.trim(),
    description: form.description.trim(),
    features: form.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
    cta_label: form.cta_label.trim() || 'Pilih paket',
    cta_url: form.cta_url.trim(),
    is_featured: form.is_featured,
    is_enabled: form.is_enabled,
  }
  if (editingId.value) await pricing.update(editingId.value, payload)
  else await pricing.add(payload)
  if (!pricing.saveError) cancel()
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Pricing</p>
    <p v-if="pricing.readOnly" class="hp-note">
      Anda tidak punya izin mengedit paket harga tenant.
    </p>
    <p v-if="pricing.loadError" class="hp-error">{{ pricing.loadError }}</p>
    <p v-if="pricing.saveError" class="hp-error">{{ pricing.saveError }}</p>

    <details class="hp-sec" open>
      <summary>Paket harga<ChevronDown class="hp-chev" /></summary>
      <div class="hp-body">
        <p class="hp-hint">Hapus block ini dari kanvas kalau halaman ini tidak perlu pricing.</p>

        <ul v-if="pricing.orderedPlans.length" class="hp-items">
          <li v-for="(plan, idx) in pricing.orderedPlans" :key="plan.id" class="hp-item">
            <span class="hp-item-main">
              <span class="hp-item-label">
                {{ plan.name }}
                <Star v-if="plan.is_featured" class="hp-star" />
                <span v-if="!plan.is_enabled" class="hp-off">nonaktif</span>
              </span>
              <span class="hp-item-dest">{{ plan.price_label }} {{ plan.interval_label }}</span>
            </span>
            <span class="hp-item-actions">
              <button
                type="button"
                title="Naik"
                :disabled="idx === 0 || pricing.saving"
                @click="pricing.move(plan.id, -1)"
              >
                <ChevronUp class="size-3.5" />
              </button>
              <button
                type="button"
                title="Turun"
                :disabled="idx === pricing.orderedPlans.length - 1 || pricing.saving"
                @click="pricing.move(plan.id, 1)"
              >
                <ChevronDown class="size-3.5" />
              </button>
              <button type="button" title="Edit" @click="startEdit(plan)">
                <Pencil class="size-3.5" />
              </button>
              <button
                type="button"
                title="Hapus"
                :disabled="pricing.saving"
                @click="pricing.remove(plan.id)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </span>
          </li>
        </ul>
        <p v-else class="hp-empty">Belum ada paket harga.</p>

        <button
          v-if="!showForm"
          type="button"
          class="hp-btn"
          :disabled="pricing.readOnly"
          @click="startAdd"
        >
          <Plus class="size-3.5" /> Tambah paket
        </button>

        <div v-else class="hp-form">
          <label class="hp-label">
            Nama paket
            <input v-model="form.name" type="text" class="hp-input" placeholder="Starter" />
          </label>
          <label class="hp-label">
            Harga
            <input
              v-model="form.price_label"
              type="text"
              class="hp-input"
              placeholder="Rp 199.000"
            />
          </label>
          <label class="hp-label">
            Interval (opsional)
            <input
              v-model="form.interval_label"
              type="text"
              class="hp-input"
              placeholder="/bulan"
            />
          </label>
          <label class="hp-label">
            Deskripsi (opsional)
            <input
              v-model="form.description"
              type="text"
              class="hp-input"
              placeholder="Cocok untuk tim kecil"
            />
          </label>
          <label class="hp-label">
            Fitur (satu baris satu fitur)
            <textarea
              v-model="form.featuresText"
              class="hp-input hp-textarea"
              rows="4"
              placeholder="5 halaman&#10;Domain kustom"
            ></textarea>
          </label>
          <label class="hp-label">
            Label tombol
            <input
              v-model="form.cta_label"
              type="text"
              class="hp-input"
              placeholder="Pilih paket"
            />
          </label>
          <label class="hp-label">
            URL tombol
            <input v-model="form.cta_url" type="text" class="hp-input" placeholder="/daftar" />
          </label>
          <label class="hp-check">
            <input v-model="form.is_featured" type="checkbox" />
            Tandai sebagai paling populer
          </label>
          <label class="hp-check">
            <input v-model="form.is_enabled" type="checkbox" />
            Aktif (tampil di halaman)
          </label>
          <p v-if="formError" class="hp-error">{{ formError }}</p>
          <div class="hp-form-actions">
            <button type="button" class="hp-btn" :disabled="pricing.saving" @click="submit">
              {{ editingId ? 'Simpan' : 'Tambah' }}
            </button>
            <button type="button" class="hp-btn hp-btn--ghost" @click="cancel">Batal</button>
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
  font-family: inherit;
}
.hp-textarea {
  resize: vertical;
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
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}
.hp-star {
  width: 12px;
  height: 12px;
  color: #f59e0b;
  fill: #f59e0b;
}
.hp-off {
  font-size: 10px;
  font-weight: 500;
  color: #94a3b8;
  font-style: italic;
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
