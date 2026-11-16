<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'

export interface RowActionItem {
  key: string
  label: string
  description: string
  destructive?: boolean
}

defineProps<{ items: RowActionItem[]; label: string }>()
const emit = defineEmits<{ select: [key: string] }>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

const MENU_WIDTH = 288 // 18rem; dijepit ke lebar viewport supaya tidak meluber di layar sempit

function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const width = Math.min(MENU_WIDTH, window.innerWidth - 16)
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
  pos.value = { top: rect.bottom + 4, left }
}

function itemEls(): HTMLElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function onOutside(e: Event) {
  const t = e.target as Node
  if (trigger.value?.contains(t) || menu.value?.contains(t)) return
  close(false)
}

async function openMenu() {
  place()
  open.value = true
  document.addEventListener('mousedown', onOutside)
  window.addEventListener('resize', place)
  await nextTick()
  itemEls()[0]?.focus()
}

function close(restoreFocus: boolean) {
  open.value = false
  document.removeEventListener('mousedown', onOutside)
  window.removeEventListener('resize', place)
  if (restoreFocus) trigger.value?.focus()
}

function toggle() {
  if (open.value) close(true)
  else void openMenu()
}

function onMenuKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
    return
  }
  if (e.key === 'Tab') {
    close(false)
    return
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  e.preventDefault()
  const els = itemEls()
  if (!els.length) return
  const i = els.indexOf(document.activeElement as HTMLElement)
  const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
  els[next]?.focus()
}

function onTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' && !open.value) {
    e.preventDefault()
    void openMenu()
  }
}

function pick(key: string) {
  close(true)
  emit('select', key)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  window.removeEventListener('resize', place)
})
</script>

<template>
  <span class="inline-block">
    <button
      ref="trigger"
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="label"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <MoreHorizontal class="size-4" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        role="menu"
        :aria-label="label"
        class="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-1 text-left shadow-lg dark:border-gray-700 dark:bg-gray-900"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        @keydown="onMenuKey"
      >
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          role="menuitem"
          tabindex="-1"
          class="block w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
          @click="pick(item.key)"
        >
          <span
            class="block text-sm font-medium"
            :class="
              item.destructive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
            "
          >
            {{ item.label }}
          </span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ item.description }}</span>
        </button>
      </div>
    </Teleport>
  </span>
</template>
