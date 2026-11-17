<script setup lang="ts">
import { computed } from 'vue'

import { useEntitlement } from '../composables/useEntitlement'
import { upgradeTarget } from '../utils/upgrade'

const props = withDefaults(
  defineProps<{
    featureKey: string
    noun: string
    /** Cetak angka (mis. byte) agar terbaca manusia; default String(n). */
    format?: (n: number) => string
    /** Menimpa status penuh dari ringkasan (mis. halaman punya angka yang lebih segar). */
    full?: boolean
    usedOverride?: number
    limitOverride?: number
  }>(),
  { full: undefined, format: undefined, usedOverride: undefined, limitOverride: undefined },
)

const { atLimit, used, limit } = useEntitlement(() => props.featureKey)

const visible = computed(() => props.full ?? atLimit.value)
const fmt = (n: number | null | undefined) =>
  n == null ? '-' : props.format ? props.format(n) : String(n)
const usedText = computed(() => fmt(props.usedOverride ?? used.value))
const limitText = computed(() => fmt(props.limitOverride ?? limit.value))
</script>

<template>
  <div
    v-if="visible"
    role="status"
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
  >
    <p>
      Kuota {{ noun }} sudah penuh ({{ usedText }} dari {{ limitText }}). Upgrade plan untuk
      menambah {{ noun }} baru.
    </p>
    <RouterLink :to="upgradeTarget()" class="font-semibold underline underline-offset-2">
      Upgrade plan
    </RouterLink>
  </div>
</template>
