<script setup lang="ts">
import { computed } from 'vue'

// Saklar ON/PAUSE. Komponen ini tidak memanggil API: pemanggil memutuskan apa yang terjadi
// (PAUSE langsung dikirim, ON membuka dialog reaktivasi).
const props = defineProps<{
  mode: 'active' | 'paused'
  disabled?: boolean
  // Alasan kontrol nonaktif; dibaca pembaca layar lewat aria-describedby (bukan hanya title).
  hint?: string
}>()
const emit = defineEmits<{ (e: 'pause'): void; (e: 'resume'): void }>()

const isOn = computed(() => props.mode === 'active')

function toggle() {
  // aria-disabled tidak memblokir klik/Space, jadi dijaga di sini.
  if (props.disabled) return
  if (isOn.value) emit('pause')
  else emit('resume')
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      type="button"
      role="switch"
      :aria-checked="isOn"
      :aria-disabled="disabled ? 'true' : undefined"
      :aria-describedby="disabled && hint ? 'mode-switch-hint' : undefined"
      :title="disabled ? hint : undefined"
      aria-label="Isolir otomatis"
      class="relative h-8 w-14 shrink-0 rounded-full border outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      :class="[
        isOn ? 'border-brand-600 bg-brand-600' : 'border-gray-400 bg-gray-300 dark:bg-gray-700',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ]"
      @click="toggle"
    >
      <span
        class="absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left]"
        :class="isOn ? 'left-7' : 'left-0.5'"
      ></span>
    </button>
    <span class="text-sm font-semibold" data-testid="mode-label">{{ isOn ? 'ON' : 'PAUSE' }}</span>
    <span v-if="disabled && hint" id="mode-switch-hint" class="sr-only">{{ hint }}</span>
  </div>
</template>
