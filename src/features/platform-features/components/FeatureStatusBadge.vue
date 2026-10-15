<script setup lang="ts">
withDefaults(
  defineProps<{
    active: boolean
    activeLabel?: string
    inactiveLabel?: string
  }>(),
  {
    activeLabel: 'active',
    inactiveLabel: 'inactive',
  },
)
</script>

<template>
  <span
    class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
    :class="
      active
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
        : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-800'
    "
  >
    {{ active ? activeLabel : inactiveLabel }}
  </span>
</template>
