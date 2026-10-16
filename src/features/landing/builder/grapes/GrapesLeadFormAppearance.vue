<script setup lang="ts">
import { computed, ref } from 'vue'

import { contrastRatio } from '../../renderer/lead-form/contrast'
import {
  POPUP_LABEL_MAX,
  POPUP_TITLE_MAX,
  readLeadFormPresentation,
  supportsColumns,
  writeLeadFormPresentation,
  type LeadFormDisplay,
  type LeadFormPresentation,
  type LeadFormRadius,
  type LeadFormStyle,
} from '../../renderer/lead-form/lead-form-presentation'

/**
 * Bagian "Tampilan" panel Form Konsultasi: gaya, mode, tema, kolom, dan isi gaya Split.
 * Disimpan di atribut blok (`data-zyad-config`), jadi baru berlaku setelah halaman disimpan
 * atau dipublikasi (sama seperti blok Header).
 */
const MIN_CONTRAST = 4.5
const DEFAULT_ACCENT = '#0b1f3a'
const DEFAULT_BG = '#ffffff'
const DEFAULT_TEXT = '#191c1e'
const GLASS_TEXT = '#ffffff'

const props = defineProps<{
  component: {
    getAttributes: () => Record<string, string>
    addAttributes: (attrs: Record<string, string>) => void
  }
}>()

const read = () => readLeadFormPresentation(props.component.getAttributes()['data-zyad-config'])
const current = ref<LeadFormPresentation>(read())

// Selalu gabungkan dengan atribut terbaru: panel induk bisa mengganti form_id di antara perubahan.
function commit(change: Partial<LeadFormPresentation>) {
  const next = { ...read(), ...change }
  props.component.addAttributes({ 'data-zyad-config': writeLeadFormPresentation(next) })
  current.value = next
}

const STYLES: { id: LeadFormStyle; label: string }[] = [
  { id: 'kartu', label: 'Kartu' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'glass', label: 'Glass' },
  { id: 'split', label: 'Split' },
  { id: 'inline', label: 'Satu baris' },
]
const DISPLAYS: { id: LeadFormDisplay; label: string }[] = [
  { id: 'inline', label: 'Inline' },
  { id: 'popup', label: 'Popup' },
]
const POPUP_ICONS: { id: LeadFormPresentation['popup']['icon']; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'whatsapp', label: 'WhatsApp' },
]
const POPUP_POSITIONS: { id: LeadFormPresentation['popup']['position']; label: string }[] = [
  { id: 'right', label: 'Kanan bawah' },
  { id: 'left', label: 'Kiri bawah' },
]
const RADII: { id: LeadFormRadius; label: string }[] = [
  { id: 'page', label: 'Ikut halaman' },
  { id: 'sm', label: 'Tajam' },
  { id: 'md', label: 'Sedang' },
  { id: 'lg', label: 'Bulat' },
]

const p = computed(() => current.value)
const showColumns = computed(() => supportsColumns(p.value.style))
const customColors = computed(() => p.value.background !== null || p.value.text !== null)

const lowContrast = computed(() => {
  const { style, background, text } = p.value
  if (background === null && text === null) return false
  const isGlass = style === 'glass'
  const bg = background ?? (isGlass ? null : DEFAULT_BG)
  const fg = text ?? (isGlass ? GLASS_TEXT : DEFAULT_TEXT)
  if (!bg) return false // Glass dengan latar otomatis: kontras bergantung pada foto di belakangnya
  return contrastRatio(bg, fg) < MIN_CONTRAST
})

function setAccentMode(mode: 'page' | 'custom') {
  commit({ accent: mode === 'page' ? null : (p.value.accent ?? DEFAULT_ACCENT) })
}

function setColorsMode(mode: 'auto' | 'custom') {
  if (mode === 'auto') commit({ background: null, text: null })
  else {
    commit({
      background: p.value.background ?? DEFAULT_BG,
      text: p.value.text ?? DEFAULT_TEXT,
    })
  }
}

function inputValue(e: Event): string {
  return (e.target as HTMLInputElement).value
}

function setSplitTitle(e: Event) {
  commit({ split: { ...p.value.split, title: inputValue(e) } })
}

const pointInputs = computed(() => [0, 1, 2].map((i) => p.value.split.points[i] ?? ''))
// Poin dibaca ulang dari input yang tampil; yang kosong dibuang saat disimpan.
const pointDraft = ref<string[]>([...pointInputs.value])
function setPoint(index: number, e: Event) {
  pointDraft.value[index] = inputValue(e)
  commit({ split: { ...p.value.split, points: pointDraft.value.filter((x) => x.trim() !== '') } })
}
</script>

<template>
  <div class="ap">
    <div class="ap-group" role="radiogroup" aria-label="Gaya">
      <button
        v-for="s in STYLES"
        :key="s.id"
        type="button"
        role="radio"
        class="ap-style"
        :class="{ 'ap-style--on': p.style === s.id }"
        :aria-checked="p.style === s.id"
        :data-style="s.id"
        @click="commit({ style: s.id })"
      >
        <span class="ap-thumb" :class="`ap-thumb--${s.id}`" aria-hidden="true">
          <i></i><i></i><b></b>
        </span>
        {{ s.label }}
      </button>
    </div>

    <div class="ap-row">
      <span class="ap-label">Mode</span>
      <div class="ap-seg" role="radiogroup" aria-label="Mode">
        <button
          v-for="d in DISPLAYS"
          :key="d.id"
          type="button"
          role="radio"
          :aria-checked="p.display === d.id"
          :class="{ 'ap-seg--on': p.display === d.id }"
          :data-display="d.id"
          @click="commit({ display: d.id })"
        >
          {{ d.label }}
        </button>
      </div>
    </div>

    <div v-if="p.display === 'popup'" class="ap-split">
      <label class="ap-label">
        Teks launcher
        <input
          class="ap-input"
          type="text"
          aria-label="Teks launcher"
          :maxlength="POPUP_LABEL_MAX"
          :value="p.popup.label"
          @change="commit({ popup: { ...p.popup, label: inputValue($event) } })"
        />
      </label>
      <div class="ap-row">
        <span class="ap-label">Ikon</span>
        <div class="ap-seg" role="radiogroup" aria-label="Ikon launcher">
          <button
            v-for="i in POPUP_ICONS"
            :key="i.id"
            type="button"
            role="radio"
            :aria-checked="p.popup.icon === i.id"
            :class="{ 'ap-seg--on': p.popup.icon === i.id }"
            :data-popup-icon="i.id"
            @click="commit({ popup: { ...p.popup, icon: i.id } })"
          >
            {{ i.label }}
          </button>
        </div>
      </div>
      <div class="ap-row">
        <span class="ap-label">Posisi</span>
        <div class="ap-seg" role="radiogroup" aria-label="Posisi launcher">
          <button
            v-for="o in POPUP_POSITIONS"
            :key="o.id"
            type="button"
            role="radio"
            :aria-checked="p.popup.position === o.id"
            :class="{ 'ap-seg--on': p.popup.position === o.id }"
            :data-popup-position="o.id"
            @click="commit({ popup: { ...p.popup, position: o.id } })"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
      <label class="ap-label">
        Judul popup
        <input
          class="ap-input"
          type="text"
          aria-label="Judul popup"
          :maxlength="POPUP_TITLE_MAX"
          :value="p.popup.title"
          @change="commit({ popup: { ...p.popup, title: inputValue($event) } })"
        />
      </label>
    </div>

    <div class="ap-row">
      <span class="ap-label">Aksen</span>
      <div class="ap-seg" role="radiogroup" aria-label="Aksen">
        <button
          type="button"
          role="radio"
          data-accent-mode="page"
          :aria-checked="p.accent === null"
          :class="{ 'ap-seg--on': p.accent === null }"
          @click="setAccentMode('page')"
        >
          Ikut halaman
        </button>
        <button
          type="button"
          role="radio"
          data-accent-mode="custom"
          :aria-checked="p.accent !== null"
          :class="{ 'ap-seg--on': p.accent !== null }"
          @click="setAccentMode('custom')"
        >
          Warna
        </button>
      </div>
      <input
        v-if="p.accent !== null"
        class="ap-color"
        type="color"
        aria-label="Warna aksen"
        :value="p.accent"
        @change="commit({ accent: inputValue($event) })"
      />
    </div>

    <div class="ap-row">
      <span class="ap-label">Latar &amp; teks</span>
      <div class="ap-seg" role="radiogroup" aria-label="Latar dan teks">
        <button
          type="button"
          role="radio"
          data-colors-mode="auto"
          :aria-checked="!customColors"
          :class="{ 'ap-seg--on': !customColors }"
          @click="setColorsMode('auto')"
        >
          Otomatis
        </button>
        <button
          type="button"
          role="radio"
          data-colors-mode="custom"
          :aria-checked="customColors"
          :class="{ 'ap-seg--on': customColors }"
          @click="setColorsMode('custom')"
        >
          Warna
        </button>
      </div>
      <template v-if="customColors">
        <input
          class="ap-color"
          type="color"
          aria-label="Warna latar"
          :value="p.background ?? DEFAULT_BG"
          @change="commit({ background: inputValue($event) })"
        />
        <input
          class="ap-color"
          type="color"
          aria-label="Warna teks"
          :value="p.text ?? DEFAULT_TEXT"
          @change="commit({ text: inputValue($event) })"
        />
      </template>
    </div>
    <p v-if="lowContrast" class="ap-warn" role="alert">Kontras rendah, teks bisa sulit dibaca.</p>

    <div class="ap-row">
      <span class="ap-label">Sudut</span>
      <div class="ap-seg" role="radiogroup" aria-label="Sudut">
        <button
          v-for="r in RADII"
          :key="r.id"
          type="button"
          role="radio"
          :aria-checked="p.radius === r.id"
          :class="{ 'ap-seg--on': p.radius === r.id }"
          :data-radius="r.id"
          @click="commit({ radius: r.id })"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <div v-if="showColumns" class="ap-row">
      <span class="ap-label">Kolom</span>
      <div class="ap-seg" role="radiogroup" aria-label="Kolom">
        <button
          v-for="c in [1, 2] as const"
          :key="c"
          type="button"
          role="radio"
          :aria-checked="p.columns === c"
          :class="{ 'ap-seg--on': p.columns === c }"
          :data-columns="c"
          @click="commit({ columns: c })"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <label class="ap-check">
      <input
        type="checkbox"
        aria-label="Ikut font halaman"
        :checked="p.inheritFont"
        @change="commit({ inheritFont: ($event.target as HTMLInputElement).checked })"
      />
      Ikut font halaman
    </label>

    <div v-if="p.style === 'split'" class="ap-split">
      <label class="ap-label">
        Judul
        <input
          class="ap-input"
          type="text"
          aria-label="Judul"
          maxlength="80"
          :value="p.split.title"
          @change="setSplitTitle"
        />
      </label>
      <label v-for="(point, i) in pointInputs" :key="i" class="ap-label">
        Poin {{ i + 1 }}
        <input
          class="ap-input"
          type="text"
          :aria-label="`Poin ${i + 1}`"
          maxlength="60"
          :value="point"
          @change="setPoint(i, $event)"
        />
      </label>
    </div>

    <p class="ap-note">Tampilan tersimpan bersama halaman.</p>
  </div>
</template>

<style scoped>
.ap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 12px;
  font-size: 12px;
  color: #475569;
}
.ap-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.ap-style {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
}
.ap-style--on {
  border-color: #0369a1;
  box-shadow: 0 0 0 2px rgba(3, 105, 161, 0.15);
  color: #0369a1;
  font-weight: 600;
}
.ap-thumb {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 44px;
  height: 32px;
  padding: 4px;
  border-radius: 4px;
  background: #f1f5f9;
}
.ap-thumb i {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: #94a3b8;
}
.ap-thumb b {
  display: block;
  height: 6px;
  margin-top: auto;
  border-radius: 3px;
  background: #0b1f3a;
}
.ap-thumb--kartu {
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #cbd5e1;
}
.ap-thumb--minimal i {
  height: 2px;
  background: #475569;
}
.ap-thumb--minimal b {
  background: transparent;
  box-shadow: inset 0 0 0 1px #0b1f3a;
  border-radius: 999px;
}
.ap-thumb--glass {
  background: linear-gradient(135deg, #334155, #0f172a);
}
.ap-thumb--glass i {
  background: rgba(255, 255, 255, 0.5);
}
.ap-thumb--glass b {
  background: #ffffff;
}
.ap-thumb--split {
  flex-direction: row;
  flex-wrap: wrap;
}
.ap-thumb--split i {
  width: 40%;
}
.ap-thumb--inline {
  flex-direction: row;
  align-items: center;
}
.ap-thumb--inline i {
  flex: 1;
  height: 10px;
}
.ap-thumb--inline b {
  width: 10px;
  height: 10px;
  margin: 0;
}
.ap-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.ap-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 64px;
  font-size: 11px;
  color: #64748b;
}
.ap-row > .ap-label {
  flex-direction: row;
}
.ap-seg {
  display: inline-flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.ap-seg button {
  border: 0;
  border-right: 1px solid #e2e8f0;
  padding: 4px 8px;
  font-size: 11px;
  color: #64748b;
  background: #ffffff;
  cursor: pointer;
}
.ap-seg button:last-child {
  border-right: 0;
}
.ap-seg button.ap-seg--on {
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 600;
}
.ap-color {
  width: 32px;
  height: 26px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.ap-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.ap-split {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ap-input {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 8px;
  font: inherit;
  font-size: 12px;
  color: #0f172a;
}
.ap-input:focus {
  outline: none;
  border-color: #0369a1;
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
}
.ap-warn {
  margin: 0;
  font-size: 11px;
  color: #b45309;
}
.ap-note {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}
</style>
