<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'

import {
  platformOrganizationsApi,
  type PlatformOrganizationSummary,
} from '@/features/platform/api/organizations.api'

const modelValue = defineModel<PlatformOrganizationSummary | null>({ default: null })

const organizations = ref<PlatformOrganizationSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')

onMounted(load)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await platformOrganizationsApi.list({ per_page: 100 })
    organizations.value = response.data
  } catch {
    errorMessage.value = 'Gagal memuat daftar organisasi.'
  } finally {
    loading.value = false
  }
}

function select(org: PlatformOrganizationSummary) {
  modelValue.value = org
}

function filtered() {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return organizations.value
  return organizations.value.filter((org) =>
    [org.name, org.slug].join(' ').toLowerCase().includes(keyword),
  )
}
</script>

<template>
  <div class="space-y-3">
    <label
      class="flex items-center gap-2 rounded-xl border px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
    >
      <Search class="size-4 text-gray-400" />
      <input
        v-model="search"
        type="search"
        placeholder="Cari nama atau slug organisasi..."
        class="w-full bg-transparent text-sm outline-none"
      />
    </label>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <p v-else-if="loading" class="text-sm text-gray-500">Memuat organisasi...</p>

    <div v-else class="max-h-64 space-y-1 overflow-y-auto">
      <button
        v-for="org in filtered()"
        :key="org.id"
        type="button"
        class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
        :class="
          modelValue?.id === org.id
            ? 'border-brand-500 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/40'
            : ''
        "
        @click="select(org)"
      >
        <span class="font-medium text-gray-900 dark:text-gray-100">{{ org.name }}</span>
        <span class="text-xs text-gray-500">/{{ org.slug }}</span>
      </button>
      <p v-if="!filtered().length" class="py-4 text-center text-sm text-gray-500">
        Tidak ada organisasi ditemukan.
      </p>
    </div>
  </div>
</template>
