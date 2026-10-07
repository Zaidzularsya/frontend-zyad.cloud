<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  ANIMATION_GROUPS,
  applyGroupChoice,
  readGroupChoice,
  type AnimationGroup,
} from '../../renderer/motion/animation-classes'

/**
 * Panel "Animasi": mengatur kelas `zy-*` pada komponen terpilih. Satu kelompok =
 * satu kelas (memilih efek baru mengganti yang lama). Kelas di luar kelompok
 * (zy-anim-hero, zy-aurora, kelas author, ...) tidak disentuh.
 */
const props = defineProps<{
  component: {
    getClasses: () => string[] | string
    addClass: (c: string | string[]) => unknown
    removeClass: (c: string | string[]) => unknown
  }
}>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const SELECTS: AnimationGroup[] = ['entrance', 'delay', 'duration', 'parallax', 'hover']
const TOGGLES: AnimationGroup[] = ['stagger', 'tilt']

function readClasses(): string[] {
  const raw = props.component.getClasses()
  return Array.isArray(raw) ? raw : String(raw).split(/\s+/).filter(Boolean)
}

const classes = ref<string[]>(readClasses())
watch(
  () => props.component,
  () => {
    classes.value = readClasses()
  },
)

function choose(group: AnimationGroup, value: string) {
  const { add, remove } = applyGroupChoice(readClasses(), group, value)
  if (remove.length) props.component.removeClass(remove)
  if (add.length) props.component.addClass(add)
  classes.value = readClasses()
  if (add.length || remove.length) emit('changed')
}

function current(group: AnimationGroup): string {
  return readGroupChoice(classes.value, group)
}
function onSelect(group: AnimationGroup, e: Event) {
  choose(group, (e.target as HTMLSelectElement).value)
}
function onToggle(group: AnimationGroup, e: Event) {
  const on = (e.target as HTMLInputElement).checked
  choose(group, on ? ANIMATION_GROUPS[group].options[1]!.value : '')
}
</script>

<template>
  <div class="hp">
    <p class="hp-title">Animasi</p>
    <p class="hp-hint">
      Efek berjalan saat elemen terlihat di layar. Gunakan "Putar animasi" untuk melihatnya.
    </p>

    <div class="hp-body">
      <label v-for="g in SELECTS" :key="g" class="hp-label">
        {{ ANIMATION_GROUPS[g].label }}
        <select class="hp-input" :data-group="g" :value="current(g)" @change="onSelect(g, $event)">
          <option v-for="o in ANIMATION_GROUPS[g].options" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
      </label>

      <label v-for="g in TOGGLES" :key="g" class="hp-check">
        <input
          type="checkbox"
          role="switch"
          :data-group="g"
          :checked="current(g) !== ''"
          @change="onToggle(g, $event)"
        />
        {{ ANIMATION_GROUPS[g].label }}
      </label>
    </div>
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
.hp-hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: #94a3b8;
}
.hp-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
</style>
