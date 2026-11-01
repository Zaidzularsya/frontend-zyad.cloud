<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import type { OnboardingStatus } from '@/features/mikrotik/types'

export type OnboardingStepKey = 'router' | 'setup' | 'secrets' | 'products' | 'sender'

const props = defineProps<{ status: OnboardingStatus }>()
const emit = defineEmits<{ (e: 'navigate', step: OnboardingStepKey): void }>()

interface Step {
  key: OnboardingStepKey
  title: string
  detail: string
  done: boolean
  action: string
}

const steps = computed<Step[]>(() => {
  const s = props.status
  return [
    {
      key: 'router',
      title: 'Daftarkan router',
      detail: s.router_registered ? 'Router sudah terdaftar.' : 'Belum ada router terdaftar.',
      done: s.router_registered,
      action: 'Lanjut',
    },
    {
      key: 'setup',
      title: 'Setup router',
      detail: s.router_ready
        ? 'Router sudah siap isolir.'
        : 'Pratinjau dan terapkan objek isolir di router.',
      done: s.router_ready,
      action: 'Lanjut',
    },
    {
      key: 'secrets',
      title: 'Impor & pasangkan secret',
      detail:
        `${s.secrets_total} diimpor, ${s.secrets_paired} terpasang` +
        (s.secrets_needs_profile > 0 ? `, ${s.secrets_needs_profile} perlu profile asli` : ''),
      done: s.secrets_paired >= 1 && s.secrets_needs_profile === 0,
      action: 'Lanjut',
    },
    {
      key: 'products',
      title: 'Tandai produk layanan PPPoE',
      detail: `${s.products_marked} produk ditandai`,
      done: s.products_marked >= 1,
      action: 'Lanjut',
    },
    {
      key: 'sender',
      title: 'Cek pengirim notifikasi',
      detail: s.sender_configured ? 'Pengirim notifikasi sudah diatur.' : 'Pengirim belum diatur.',
      done: s.sender_configured,
      action: 'Lanjut',
    },
  ]
})

const activeKey = computed(() => steps.value.find((s) => !s.done)?.key)
</script>

<template>
  <BaseCard>
    <ol class="divide-y divide-gray-100 dark:divide-gray-800">
      <li
        v-for="(step, i) in steps"
        :key="step.key"
        :data-step="step.key"
        :data-active="step.key === activeKey ? 'true' : 'false'"
        :data-done="step.done ? 'true' : 'false'"
        class="flex items-center gap-3 py-3"
      >
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="
            step.done
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
              : step.key === activeKey
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          "
        >
          <Check v-if="step.done" class="size-4" aria-hidden="true" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ step.title }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ step.detail }}</p>
        </div>
        <BaseButton
          :variant="step.key === activeKey ? 'primary' : 'outline'"
          @click="emit('navigate', step.key)"
        >
          {{ step.action }}
        </BaseButton>
      </li>
    </ol>
    <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
      Isolir otomatis belum aktif sampai langkah 3-5 selesai.
    </p>
  </BaseCard>
</template>
