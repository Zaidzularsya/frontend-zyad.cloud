<script setup lang="ts">
import { ref, watch } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import OrganizationPicker from '@/features/platform/components/OrganizationPicker.vue'
import type { PlatformOrganizationSummary } from '@/features/platform/api/organizations.api'
import {
  storageQuotaApi,
  type OrganizationStorageUsage,
} from '@/features/platform/api/storageQuota.api'
import { formatBytes } from '@/features/storage/utils/formatBytes'

const selectedOrg = ref<PlatformOrganizationSummary | null>(null)
const usage = ref<OrganizationStorageUsage | null>(null)
const loadingUsage = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')
const limitInputMb = ref<number | null>(null)

watch(selectedOrg, async (org) => {
  usage.value = null
  limitInputMb.value = null
  errorMessage.value = ''
  if (!org) return
  loadingUsage.value = true
  try {
    const result = await storageQuotaApi.getUsage(org.id)
    usage.value = result
    if (result.limit_bytes) {
      limitInputMb.value = Math.round(result.limit_bytes / (1024 * 1024))
    }
  } catch {
    errorMessage.value = 'Gagal memuat pemakaian storage organisasi ini.'
  } finally {
    loadingUsage.value = false
  }
})

function apiMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

async function saveQuota() {
  if (!selectedOrg.value || !limitInputMb.value || limitInputMb.value <= 0) return
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const limitBytes = Math.round(limitInputMb.value * 1024 * 1024)
    await storageQuotaApi.setQuota(selectedOrg.value.id, limitBytes)
    usage.value = { ...(usage.value ?? { used_bytes: 0 }), limit_bytes: limitBytes }
    notice.value = `Kuota storage untuk ${selectedOrg.value.name} berhasil diperbarui.`
  } catch (error) {
    errorMessage.value = apiMessage(error, 'Gagal menyimpan kuota storage.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Storage Quota"
      description="Atur batas kapasitas storage per tenant. Tanpa limit yang diset, tenant tidak dibatasi."
    />

    <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
      <BaseCard>
        <h2 class="mb-3 font-semibold text-gray-900 dark:text-gray-100">Pilih organisasi</h2>
        <OrganizationPicker v-model="selectedOrg" />
      </BaseCard>

      <BaseCard v-if="!selectedOrg" class="flex items-center justify-center text-sm text-gray-500">
        Pilih organisasi di sebelah kiri untuk melihat dan mengatur kuota storage-nya.
      </BaseCard>

      <div v-else class="space-y-4">
        <div
          v-if="notice"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200"
        >
          {{ notice }}
        </div>
        <div
          v-if="errorMessage"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
        >
          {{ errorMessage }}
        </div>

        <BaseCard>
          <h2 class="font-semibold text-gray-900 dark:text-gray-100">
            {{ selectedOrg.name }}
            <span class="text-sm font-normal text-gray-500">/{{ selectedOrg.slug }}</span>
          </h2>

          <p v-if="loadingUsage" class="mt-3 text-sm text-gray-500">Memuat pemakaian...</p>
          <template v-else-if="usage">
            <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Pemakaian saat ini:
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                formatBytes(usage.used_bytes)
              }}</span>
              <template v-if="usage.limit_bytes">
                dari {{ formatBytes(usage.limit_bytes) }}
              </template>
              <template v-else> (belum ada batas)</template>
            </p>
          </template>

          <form class="mt-4 flex items-end gap-3" @submit.prevent="saveQuota">
            <label class="block text-sm font-medium">
              Batas kuota (MB)
              <input
                v-model.number="limitInputMb"
                type="number"
                min="1"
                placeholder="mis. 500"
                class="mt-1 w-40 rounded-lg border px-3 py-2 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <BaseButton type="submit" :disabled="saving || !limitInputMb">
              {{ saving ? 'Menyimpan...' : 'Simpan kuota' }}
            </BaseButton>
          </form>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
