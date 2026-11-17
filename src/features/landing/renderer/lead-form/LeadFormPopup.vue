<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'

import { presentationStyle, type LeadFormPresentation } from './lead-form-presentation'

/**
 * Launcher (tombol melayang di pojok) + dialog untuk Form Konsultasi mode popup. Launcher dan
 * dialog di-Teleport ke `target` (elemen overlay di tingkat shadow root) supaya `position: fixed`
 * tidak rusak oleh section beranimasi. Isi dialog adalah slot (LeadFormView); state form tetap
 * dimiliki slot pembungkus, jadi tidak hilang saat dialog ditutup.
 */
const THEME_TOKENS = [
  '--tp-primary',
  '--tp-accent',
  '--tp-ink',
  '--tp-muted',
  '--tp-surface',
  '--tp-line',
  '--tp-radius',
  '--tp-on-primary',
  '--tp-btn-bg',
  '--tp-btn-fg',
] as const

const props = defineProps<{
  presentation: LeadFormPresentation
  /** Elemen overlay; null = render di tempat (di luar renderer). */
  target: HTMLElement | null
  /**
   * Sentinel blok di halaman. Overlay berada di luar pohon halaman, jadi token tema template
   * (`--tp-*`) dan font disalin dari sini supaya popup tetap sesuai tema halaman.
   */
  themeSource: HTMLElement | null
}>()
const emit = defineEmits<{ (e: 'opened'): void }>()

const uid = useId()
const titleId = `${uid}-title`
const isOpen = ref(false)
const launcher = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const themeVars = ref<Record<string, string>>({})

const popup = computed(() => props.presentation.popup)
const rootStyle = computed(() => ({ ...themeVars.value, ...presentationStyle(props.presentation) }))

let savedOverflow: string | null = null

function readTheme() {
  const source = props.themeSource
  if (!source) return
  const computed = getComputedStyle(source)
  const vars: Record<string, string> = {}
  for (const token of THEME_TOKENS) {
    const value = computed.getPropertyValue(token).trim()
    if (value) vars[token] = value
  }
  if (props.presentation.inheritFont && computed.fontFamily)
    vars['font-family'] = computed.fontFamily
  themeVars.value = vars
}

function lockScroll() {
  if (savedOverflow !== null) return
  const el = document.documentElement
  savedOverflow = el.style.overflow
  el.style.overflow = 'hidden'
}

function unlockScroll() {
  if (savedOverflow === null) return
  document.documentElement.style.overflow = savedOverflow
  savedOverflow = null
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(): HTMLElement[] {
  return Array.from(dialog.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
}

async function open() {
  if (isOpen.value) return
  readTheme()
  isOpen.value = true
  lockScroll()
  // Di window supaya Esc dan Tab tetap tertangani walau fokus sempat lepas dari dialog.
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  // Fokus awal ke field pertama (atau tombol WhatsApp/Tutup bila form sudah terkirim).
  const items = focusables()
  const firstField = items.find((el) => !el.classList.contains('zy-lf-popup__close'))
  ;(firstField ?? items[0])?.focus()
  emit('opened')
}

async function close() {
  if (!isOpen.value) return
  isOpen.value = false
  unlockScroll()
  window.removeEventListener('keydown', onKeydown)
  await nextTick()
  launcher.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    void close()
    return
  }
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active =
    (dialog.value?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement ?? null
  if (e.shiftKey && (active === first || !dialog.value?.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !dialog.value?.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  unlockScroll()
  window.removeEventListener('keydown', onKeydown)
})

defineExpose({ open, close, isOpen })
</script>

<template>
  <Teleport :to="target" :disabled="!target">
    <div
      class="zy-lf-popup"
      :class="`zy-lf-popup--${popup.position}`"
      :style="rootStyle"
      data-zy-lead-popup
    >
      <button
        ref="launcher"
        type="button"
        class="zy-lf-popup__launcher"
        :aria-label="popup.label"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        @click="open"
      >
        <svg
          v-if="popup.icon === 'whatsapp'"
          class="zy-lf-popup__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M12.04 2a9.9 9.9 0 0 0-8.47 15.03L2 22l5.1-1.34A9.95 9.95 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.03.8.81-2.95-.2-.31A8.1 8.1 0 1 1 12.04 20.1Zm4.45-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06a6.6 6.6 0 0 1-1.94-1.2 7.3 7.3 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.47-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"
          />
        </svg>
        <svg
          v-else
          class="zy-lf-popup__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          />
        </svg>
        <span class="zy-lf-popup__label">{{ popup.label }}</span>
      </button>

      <div v-if="isOpen" class="zy-lf-popup__backdrop" @click.self="close">
        <div
          ref="dialog"
          class="zy-lf-popup__dialog"
          :class="{ 'zy-lf-popup__dialog--dark': presentation.style === 'glass' }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <header class="zy-lf-popup__head">
            <h2 :id="titleId" class="zy-lf-popup__title">{{ popup.title }}</h2>
            <button type="button" class="zy-lf-popup__close" aria-label="Tutup" @click="close">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            </button>
          </header>
          <div class="zy-lf-popup__body">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
