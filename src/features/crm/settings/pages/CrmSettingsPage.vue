<script setup lang="ts">
import { computed } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import { useToast } from '@/components/ui/toast'
import {
  useCrmSettingsQuery,
  useUpdateCrmSettingsMutation,
} from '@/features/crm/settings/api/crm-settings.queries'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const settings = useCrmSettingsQuery()
const mutation = useUpdateCrmSettingsMutation()
const canEdit = computed(() => auth.can('crm_settings.update'))
const enabled = computed(() => settings.data.value?.lead_playbook_enabled ?? true)

async function toggle() {
  try {
    await mutation.mutateAsync(!enabled.value)
    toast.success(enabled.value ? 'SOP lead otomatis diaktifkan.' : 'SOP lead otomatis dimatikan.')
  } catch {
    toast.error('Pengaturan gagal disimpan.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold">Pengaturan CRM</h1>
    <BaseCard class="flex items-start justify-between gap-4">
      <div>
        <h2 class="font-semibold">SOP lead otomatis</h2>
        <p class="text-sm text-gray-500">
          Setiap lead baru otomatis mendapat langkah "Kontak pertama" (1 jam kerja) dan dipandu
          sampai qualified. Mematikan pengaturan ini tidak menghentikan SOP yang sedang berjalan.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        aria-label="SOP lead otomatis"
        :disabled="!canEdit || mutation.isPending.value || settings.isPending.value"
        class="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50"
        :class="enabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'"
        @click="toggle"
      >
        <span
          class="absolute top-0.5 size-5 rounded-full bg-white shadow transition-all"
          :class="enabled ? 'left-5' : 'left-0.5'"
        />
      </button>
    </BaseCard>
    <p v-if="!canEdit" class="text-sm text-gray-500">
      Hanya owner organisasi yang dapat mengubah pengaturan ini.
    </p>
  </div>
</template>
