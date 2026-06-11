<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'danger'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60"
    :class="{
      'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-100 dark:focus:ring-brand-900':
        variant === 'primary',
      'border bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800':
        variant === 'secondary',
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-100': variant === 'danger',
    }"
  >
    <slot />
  </button>
</template>
