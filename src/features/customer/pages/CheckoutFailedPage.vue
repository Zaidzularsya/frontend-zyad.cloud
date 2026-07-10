<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

const route = useRoute()

const retryTarget = computed(() => {
  const plan = typeof route.query.plan === 'string' ? route.query.plan.trim() : ''
  if (!plan) return '/app/billing'
  const interval =
    typeof route.query.interval === 'string' && route.query.interval.trim()
      ? route.query.interval.trim()
      : 'monthly'
  return `/app/checkout?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}`
})
</script>

<template>
  <div class="mx-auto max-w-xl py-8">
    <BaseCard class="text-center">
      <span
        class="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950"
      >
        <CircleAlert class="size-7" />
      </span>
      <h1 class="mt-5 text-2xl font-semibold">Pembayaran gagal atau kedaluwarsa</h1>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Sesi pembayaran Anda tidak selesai. Tidak ada dana yang ditagihkan — silakan coba lagi kapan
        saja.
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <RouterLink to="/app/billing">
          <BaseButton variant="outline">Lihat Billing</BaseButton>
        </RouterLink>
        <RouterLink :to="retryTarget">
          <BaseButton>Coba Lagi</BaseButton>
        </RouterLink>
      </div>
    </BaseCard>
  </div>
</template>
