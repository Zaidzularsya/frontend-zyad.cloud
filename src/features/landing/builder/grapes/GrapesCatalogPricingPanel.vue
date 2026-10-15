<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import type { PublicListingCategory } from '@/features/public/api/public-catalog.api'
import {
  parseCatalogPricingConfig,
  serializeCatalogPricingConfig,
  type CatalogPricingConfig,
} from '../../renderer/catalog-pricing/catalog-pricing-config'
import { safeHref } from '../../renderer/grapes/chrome'

/**
 * Panel pengaturan blok "Pricing Katalog". Setiap perubahan valid langsung
 * ditulis ke atribut `data-zyad-config`. Batas di sini sengaja sama dengan
 * parseCatalogPricingConfig (title ≤120, subtitle ≤240, points ≤6×120):
 * nilai yang akan dibuang parser tidak disimpan, dan penulis diberi tahu.
 */
const TITLE_MAX = 120
const SUBTITLE_MAX = 240
const POINTS_MAX = 6
const POINT_MAX = 120

const props = defineProps<{
  component: {
    getAttributes: () => Record<string, string>
    addAttributes: (attrs: Record<string, string>) => void
  }
  categories: PublicListingCategory[]
}>()

const cfg = reactive<CatalogPricingConfig>(
  parseCatalogPricingConfig(props.component.getAttributes()['data-zyad-config']),
)
const pointsText = ref(cfg.enterpriseCard.points.join('\n'))
const contactHref = ref(cfg.contactHref)
const errors = reactive<Record<string, string>>({})

const listings = computed(() =>
  [...props.categories]
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => [...c.listings].sort((a, b) => a.order - b.order)),
)

function persist() {
  props.component.addAttributes({
    'data-zyad-config': serializeCatalogPricingConfig(JSON.parse(JSON.stringify(cfg))),
  })
}

function setText(field: 'title' | 'subtitle', value: string, max: number, label: string) {
  if (value.trim() === '') {
    errors[field] = `${label} wajib diisi.`
    return
  }
  if (value.length > max) {
    errors[field] = `${label} maksimal ${max} karakter.`
    return
  }
  errors[field] = ''
  cfg[field] = value
  persist()
}

function onTitle(e: Event) {
  setText('title', (e.target as HTMLInputElement).value, TITLE_MAX, 'Judul')
}
function onSubtitle(e: Event) {
  setText('subtitle', (e.target as HTMLInputElement).value, SUBTITLE_MAX, 'Subjudul')
}

function onCategory(id: string, checked: boolean) {
  const set = new Set(cfg.categoryIds)
  if (checked) set.add(id)
  else set.delete(id)
  cfg.categoryIds = [...set]
  persist()
}

function onFrequency(value: 'monthly' | 'annual') {
  cfg.defaultFrequency = value
  persist()
}

function onFeatured(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  cfg.featuredCode = v === '' ? null : v
  persist()
}

function onSavings(e: Event) {
  cfg.showYearlySavings = (e.target as HTMLInputElement).checked
  persist()
}

function onEnterpriseEnabled(e: Event) {
  cfg.enterpriseCard.enabled = (e.target as HTMLInputElement).checked
  persist()
}

function onEnterpriseTitle(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (value.trim() === '') {
    errors.enterpriseTitle = 'Judul kartu wajib diisi.'
    return
  }
  if (value.length > TITLE_MAX) {
    errors.enterpriseTitle = `Judul kartu maksimal ${TITLE_MAX} karakter.`
    return
  }
  errors.enterpriseTitle = ''
  cfg.enterpriseCard.title = value
  persist()
}

function onPoints(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  pointsText.value = value
  const points = value
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
  if (points.length > POINTS_MAX) {
    errors.points = `Poin maksimal ${POINTS_MAX} baris.`
    return
  }
  if (points.some((p) => p.length > POINT_MAX)) {
    errors.points = `Setiap poin maksimal ${POINT_MAX} karakter.`
    return
  }
  errors.points = ''
  cfg.enterpriseCard.points = points
  persist()
}

function onContact(e: Event) {
  const value = (e.target as HTMLInputElement).value.trim()
  contactHref.value = value
  const safe = safeHref(value)
  if (!value || safe === '#' || safe !== value) {
    errors.contactHref = 'Tujuan tidak valid. Gunakan #anchor, /path, https://, mailto: atau tel:.'
    return
  }
  errors.contactHref = ''
  cfg.contactHref = value
  persist()
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Pricing Katalog</p>
    <p class="hp-hint">Harga dan fitur diambil dari Sales → Produk.</p>

    <details class="hp-sec" open>
      <summary>Judul</summary>
      <div class="hp-body">
        <label class="hp-label">
          Judul
          <input
            class="hp-input"
            type="text"
            aria-label="Judul"
            :value="cfg.title"
            @input="onTitle"
          />
        </label>
        <p v-if="errors.title" class="hp-error" role="alert">{{ errors.title }}</p>
        <label class="hp-label">
          Subjudul
          <input
            class="hp-input"
            type="text"
            aria-label="Subjudul"
            :value="cfg.subtitle"
            @input="onSubtitle"
          />
        </label>
        <p v-if="errors.subtitle" class="hp-error" role="alert">{{ errors.subtitle }}</p>
      </div>
    </details>

    <details class="hp-sec" open>
      <summary>Produk</summary>
      <div class="hp-body">
        <fieldset class="hp-fieldset">
          <legend>Kategori</legend>
          <p class="hp-hint">Kosongkan untuk menampilkan semua kategori publik.</p>
          <p v-if="!categories.length" class="hp-hint">Belum ada kategori publik.</p>
          <label v-for="c in categories" :key="c.id" class="hp-check">
            <input
              type="checkbox"
              :value="c.id"
              :checked="cfg.categoryIds.includes(c.id)"
              @change="onCategory(c.id, ($event.target as HTMLInputElement).checked)"
            />
            {{ c.name }}
          </label>
        </fieldset>

        <fieldset class="hp-fieldset">
          <legend>Frekuensi awal</legend>
          <label class="hp-check">
            <input
              type="radio"
              name="catalog-pricing-frequency"
              value="monthly"
              :checked="cfg.defaultFrequency === 'monthly'"
              @change="onFrequency('monthly')"
            />
            Bulanan
          </label>
          <label class="hp-check">
            <input
              type="radio"
              name="catalog-pricing-frequency"
              value="annual"
              :checked="cfg.defaultFrequency === 'annual'"
              @change="onFrequency('annual')"
            />
            Tahunan
          </label>
        </fieldset>

        <label class="hp-label">
          Kartu unggulan
          <select
            class="hp-input"
            aria-label="Kartu unggulan"
            :value="cfg.featuredCode ?? ''"
            @change="onFeatured"
          >
            <option value="">Tidak ada</option>
            <option v-for="l in listings" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>
        </label>

        <label class="hp-check">
          <input
            type="checkbox"
            aria-label="Tampilkan badge hemat tahunan"
            :checked="cfg.showYearlySavings"
            @change="onSavings"
          />
          Tampilkan badge hemat tahunan
        </label>
      </div>
    </details>

    <details class="hp-sec" open>
      <summary>Kartu Enterprise</summary>
      <div class="hp-body">
        <label class="hp-check">
          <input
            type="checkbox"
            aria-label="Tampilkan kartu Enterprise"
            :checked="cfg.enterpriseCard.enabled"
            @change="onEnterpriseEnabled"
          />
          Tampilkan kartu Enterprise
        </label>
        <template v-if="cfg.enterpriseCard.enabled">
          <label class="hp-label">
            Judul kartu
            <input
              class="hp-input"
              type="text"
              aria-label="Judul kartu Enterprise"
              :value="cfg.enterpriseCard.title"
              @input="onEnterpriseTitle"
            />
          </label>
          <p v-if="errors.enterpriseTitle" class="hp-error" role="alert">
            {{ errors.enterpriseTitle }}
          </p>
          <label class="hp-label">
            Poin (satu baris per poin)
            <textarea
              class="hp-input hp-textarea"
              rows="5"
              aria-label="Poin Enterprise"
              :value="pointsText"
              @input="onPoints"
            ></textarea>
          </label>
          <p v-if="errors.points" class="hp-error" role="alert">{{ errors.points }}</p>
        </template>
      </div>
    </details>

    <details class="hp-sec" open>
      <summary>Hubungi sales</summary>
      <div class="hp-body">
        <label class="hp-label">
          Tujuan Hubungi sales
          <input
            class="hp-input"
            type="text"
            aria-label="Tujuan Hubungi sales"
            :value="contactHref"
            @input="onContact"
          />
        </label>
        <p v-if="errors.contactHref" class="hp-error" role="alert">{{ errors.contactHref }}</p>
        <p class="hp-hint">Default #konsultasi: menggulir ke form konsultasi di halaman.</p>
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
.hp-error {
  margin: 0;
  color: #dc2626;
}
.hp-sec {
  border-top: 1px solid #f1f5f9;
}
.hp-sec > summary {
  padding: 10px 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
  cursor: pointer;
}
.hp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 12px;
}
.hp-fieldset {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}
.hp-fieldset legend {
  padding: 0;
  margin-bottom: 4px;
  font-size: 11px;
  color: #64748b;
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
  border-color: #0369a1;
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
}
.hp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}
.hp-hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: #94a3b8;
}
</style>
