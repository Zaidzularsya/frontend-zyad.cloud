<script setup lang="ts">
import { useEntitlement } from '../composables/useEntitlement'
import { upgradeTarget } from '../utils/upgrade'

const props = defineProps<{
  featureKey: string
  noun: string
  planName?: string
}>()

const { atLimit, used, limit } = useEntitlement(() => props.featureKey)
</script>

<template>
  <div
    v-if="atLimit"
    role="status"
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
  >
    <p>
      Kuota {{ noun }}<template v-if="planName"> {{ planName }}</template> sudah penuh ({{
        used
      }}
      dari {{ limit }}). Upgrade plan untuk menambah {{ noun }} baru.
    </p>
    <RouterLink :to="upgradeTarget()" class="font-semibold underline underline-offset-2">
      Upgrade plan
    </RouterLink>
  </div>
</template>
