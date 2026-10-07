<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { PencilLine, Plus, Power, RefreshCw, Search } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import FeatureFormModal from '@/features/platform-features/components/FeatureFormModal.vue'
import FeatureStatusBadge from '@/features/platform-features/components/FeatureStatusBadge.vue'
import {
  type CreatePlatformFeaturePayload,
  type PlatformFeature,
  type PlatformFeatureListParams,
  type UpdatePlatformFeaturePayload,
} from '@/features/platform-features/api/platform-features.api'
import {
  useCreatePlatformFeatureMutation,
  usePlatformFeaturesQuery,
  useUpdatePlatformFeatureMutation,
} from '@/features/platform-features/api/platform-features.queries'

type BooleanFilter = '' | 'true' | 'false'

const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

const featureFilters = reactive({
  page: 1,
  per_page: 50,
  module: '',
  search: '',
  is_active: '' as BooleanFilter,
})

const featureListParams = computed<PlatformFeatureListParams>(() => ({
  page: featureFilters.page,
  per_page: featureFilters.per_page,
  module: featureFilters.module || undefined,
  search: featureFilters.search || undefined,
  is_active: featureFilters.is_active === '' ? undefined : featureFilters.is_active === 'true',
}))

const featuresQuery = usePlatformFeaturesQuery(featureListParams)
const createFeatureMutation = useCreatePlatformFeatureMutation()
const updateFeatureMutation = useUpdatePlatformFeatureMutation()

const features = computed(() => featuresQuery.data.value?.data ?? [])
const featureModules = computed(() => {
  const modules = new Set(features.value.map((feature) => feature.module))
  return [...modules].sort()
})

const featureFormOpen = ref(false)
const featureFormMode = ref<'create' | 'edit'>('create')
const featureFormError = ref('')
const featureBeingEdited = ref<PlatformFeature | null>(null)

function openCreateFeatureModal() {
  featureFormMode.value = 'create'
  featureBeingEdited.value = null
  featureFormError.value = ''
  featureFormOpen.value = true
}

function openEditFeatureModal(feature: PlatformFeature) {
  featureFormMode.value = 'edit'
  featureBeingEdited.value = feature
  featureFormError.value = ''
  featureFormOpen.value = true
}

async function submitCreateFeature(payload: CreatePlatformFeaturePayload) {
  try {
    await createFeatureMutation.mutateAsync(payload)
    feedback.value = { tone: 'success', message: `Fitur "${payload.name}" berhasil ditambahkan.` }
    featureFormOpen.value = false
  } catch (error) {
    featureFormError.value = extractError(error)
  }
}

async function submitUpdateFeature(payload: UpdatePlatformFeaturePayload) {
  if (!featureBeingEdited.value) return
  try {
    await updateFeatureMutation.mutateAsync({ id: featureBeingEdited.value.id, payload })
    feedback.value = { tone: 'success', message: 'Fitur berhasil diperbarui.' }
    featureFormOpen.value = false
  } catch (error) {
    featureFormError.value = extractError(error)
  }
}

async function toggleFeature(feature: PlatformFeature) {
  try {
    await updateFeatureMutation.mutateAsync({
      id: feature.id,
      payload: { is_active: !feature.is_active },
    })
    feedback.value = {
      tone: 'success',
      message: `Fitur "${feature.name}" ${feature.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`,
    }
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
  }
}

function extractError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Permintaan gagal diproses.'
  }
  if (error instanceof Error) return error.message
  return 'Permintaan gagal diproses.'
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Fitur Platform"
      description="Daftar fitur & kuota yang bisa diberikan produk."
    >
      <div class="flex flex-wrap gap-3">
        <BaseButton
          variant="secondary"
          :disabled="featuresQuery.isFetching.value"
          @click="featuresQuery.refetch()"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': featuresQuery.isFetching.value }" />
          Refresh
        </BaseButton>
        <PermissionGate permission="platform.product.feature.manage">
          <BaseButton data-test="add-feature" @click="openCreateFeatureModal">
            <Plus class="size-4" />
            Tambah fitur
          </BaseButton>
        </PermissionGate>
      </div>
    </PageHeader>

    <div
      v-if="feedback"
      class="rounded-xl border px-4 py-3 text-sm"
      :class="
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
      "
    >
      {{ feedback.message }}
    </div>

    <BaseCard>
      <div class="grid gap-3 md:grid-cols-3">
        <label class="relative block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Cari</span
          >
          <Search class="pointer-events-none absolute left-3 top-[42px] size-4 text-gray-400" />
          <input
            v-model="featureFilters.search"
            type="search"
            placeholder="Feature key atau nama"
            class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-gray-800 dark:bg-gray-950"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Module</span
          >
          <select
            v-model="featureFilters.module"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option value="">Semua module</option>
            <option v-for="mod in featureModules" :key="mod" :value="mod">{{ mod }}</option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Status</span
          >
          <select
            v-model="featureFilters.is_active"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </label>
      </div>

      <div v-if="featuresQuery.isLoading.value" class="mt-6 space-y-3">
        <div
          v-for="index in 3"
          :key="index"
          class="h-16 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-950"
        ></div>
      </div>

      <div
        v-else-if="features.length"
        class="mt-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead class="bg-gray-50/80 dark:bg-gray-950/50">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">Feature</th>
                <th class="px-4 py-3 text-left font-semibold">Module</th>
                <th class="px-4 py-3 text-left font-semibold">Tipe nilai</th>
                <th class="px-4 py-3 text-left font-semibold">Reset</th>
                <th class="px-4 py-3 text-left font-semibold">Status</th>
                <th class="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="feature in features" :key="feature.id" class="bg-white dark:bg-gray-900">
                <td class="px-4 py-4 align-top">
                  <div class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ feature.name }}
                  </div>
                  <div class="mt-1 text-xs uppercase tracking-wide text-gray-500">
                    {{ feature.feature_key }}
                  </div>
                  <p
                    v-if="feature.description"
                    class="mt-2 max-w-md text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ feature.description }}
                  </p>
                </td>
                <td class="px-4 py-4 align-top">
                  <span
                    class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {{ feature.module }}
                  </span>
                </td>
                <td class="px-4 py-4 align-top text-xs text-gray-600 dark:text-gray-300">
                  {{ feature.value_type }}<span v-if="feature.unit"> · {{ feature.unit }}</span>
                </td>
                <td class="px-4 py-4 align-top text-xs text-gray-600 dark:text-gray-300">
                  {{ feature.reset_strategy }}
                </td>
                <td class="px-4 py-4 align-top">
                  <FeatureStatusBadge :active="feature.is_active" />
                </td>
                <td class="px-4 py-4 align-top">
                  <div class="flex justify-end gap-2">
                    <PermissionGate permission="platform.product.feature.manage">
                      <BaseButton
                        variant="outline"
                        :data-test="`edit-feature-${feature.id}`"
                        @click="openEditFeatureModal(feature)"
                      >
                        <PencilLine class="size-4" />
                        Edit
                      </BaseButton>
                      <BaseButton
                        variant="outline"
                        :data-test="`toggle-feature-${feature.id}`"
                        :disabled="updateFeatureMutation.isPending.value"
                        @click="toggleFeature(feature)"
                      >
                        <Power class="size-4" />
                        {{ feature.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                      </BaseButton>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-else
        class="mt-6 rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
      >
        Belum ada feature katalog yang cocok dengan filter saat ini.
      </div>
    </BaseCard>

    <FeatureFormModal
      :is-open="featureFormOpen"
      :mode="featureFormMode"
      :feature-to-edit="featureBeingEdited"
      :is-submitting="
        createFeatureMutation.isPending.value || updateFeatureMutation.isPending.value
      "
      :server-error="featureFormError"
      @close="featureFormOpen = false"
      @create="submitCreateFeature"
      @update="submitUpdateFeature"
    />
  </div>
</template>
