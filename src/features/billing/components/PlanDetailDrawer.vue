<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PencilLine, Plus, Save, SlidersHorizontal, Tag, Trash2, X } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import TextField from '@/components/form/TextField.vue'
import PlanStatusBadge from '@/features/billing/components/PlanStatusBadge.vue'
import PlanPriceFormModal from '@/features/billing/components/PlanPriceFormModal.vue'
import type {
  PlatformBillingFeature,
  PlatformBillingPlanEntitlement,
  PlatformBillingPlanPrice,
  PlatformBillingPlanPricePayload,
  ReplacePlatformBillingPlanEntitlementsPayload,
} from '@/features/billing/api/platform-billing.api'
import {
  useCreatePlatformBillingPlanPriceMutation,
  useDeletePlatformBillingPlanPriceMutation,
  usePlatformBillingFeaturesQuery,
  usePlatformBillingPlanDetailQuery,
  usePlatformBillingPlanEntitlementsQuery,
  usePlatformBillingPlanPricesQuery,
  useReplacePlatformBillingPlanEntitlementsMutation,
  useUpdatePlatformBillingPlanPriceMutation,
} from '@/features/billing/api/platform-billing.queries'
import { formatCurrency, formatDate } from '@/lib/utils'

type DrawerTab = 'overview' | 'prices' | 'entitlements'

interface EntitlementDraft {
  feature_id: string
  feature_key: string
  module: string
  name: string
  description?: string
  value_type: PlatformBillingFeature['value_type']
  reset_strategy: PlatformBillingFeature['reset_strategy']
  unit?: string
  enabled: boolean
  value_bool: boolean
  value_int: string
  value_decimal: string
  value_string: string
  limits_text: string
}

const props = defineProps<{
  isOpen: boolean
  planId: string
}>()

const emit = defineEmits<{
  close: []
  'edit-plan': [planId: string]
}>()

const planIdRef = computed(() => props.planId)
const drawerTab = ref<DrawerTab>('overview')
const includeDeletedPrices = ref(false)

const priceModalOpen = ref(false)
const priceFormMode = ref<'create' | 'edit'>('create')
const selectedPriceId = ref('')
const priceFormError = ref('')

const priceDeleteModalOpen = ref(false)
const priceDeleteError = ref('')

const entitlementError = ref('')
const entitlementSuccess = ref(false)

const featureFiltersRef = computed(() => ({ page: 1, per_page: 100, is_active: true }))

const planDetailQuery = usePlatformBillingPlanDetailQuery(planIdRef)
const planPricesQuery = usePlatformBillingPlanPricesQuery(planIdRef, includeDeletedPrices)
const featuresQuery = usePlatformBillingFeaturesQuery(featureFiltersRef)
const entitlementsQuery = usePlatformBillingPlanEntitlementsQuery(planIdRef)

const createPriceMutation = useCreatePlatformBillingPlanPriceMutation()
const updatePriceMutation = useUpdatePlatformBillingPlanPriceMutation()
const deletePriceMutation = useDeletePlatformBillingPlanPriceMutation()
const replaceEntitlementsMutation = useReplacePlatformBillingPlanEntitlementsMutation()

const selectedPlan = computed(() => planDetailQuery.data.value ?? null)
const selectedPlanPrices = computed(
  () => planPricesQuery.data.value ?? selectedPlan.value?.prices ?? [],
)
const selectedPrice = computed(
  () => selectedPlanPrices.value.find((price) => price.id === selectedPriceId.value) ?? null,
)
const features = computed(() => featuresQuery.data.value?.data ?? [])
const planEntitlements = computed(() => entitlementsQuery.data.value ?? [])
const entitlementDrafts = ref<EntitlementDraft[]>([])

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    drawerTab.value = 'overview'
    includeDeletedPrices.value = false
    entitlementError.value = ''
    entitlementSuccess.value = false
  },
)

watch(
  [features, planEntitlements, () => props.isOpen],
  ([featureList, entitlements, isOpen]) => {
    if (!isOpen || !featureList.length) return
    entitlementDrafts.value = buildEntitlementDrafts(featureList, entitlements)
  },
  { immediate: true },
)

function buildEntitlementDrafts(
  featureList: PlatformBillingFeature[],
  entitlements: PlatformBillingPlanEntitlement[],
) {
  const entitlementMap = new Map(entitlements.map((item) => [item.feature_key, item]))

  return featureList.map((feature) => {
    const current = entitlementMap.get(feature.feature_key)
    return {
      feature_id: feature.id,
      feature_key: feature.feature_key,
      module: feature.module,
      name: feature.name,
      description: feature.description,
      value_type: feature.value_type,
      reset_strategy: feature.reset_strategy,
      unit: feature.unit,
      enabled: Boolean(current),
      value_bool: current?.value_bool ?? false,
      value_int: current?.value_int != null ? String(current.value_int) : '',
      value_decimal: current?.value_decimal ?? '',
      value_string: current?.value_string ?? '',
      limits_text:
        current && Object.keys(current.limits ?? {}).length
          ? JSON.stringify(current.limits, null, 2)
          : '',
    }
  })
}

function featureValuePreview(item: EntitlementDraft) {
  if (!item.enabled) return 'Belum dipetakan'
  switch (item.value_type) {
    case 'boolean':
      return item.value_bool ? 'true' : 'false'
    case 'integer':
      return item.value_int || '0'
    case 'decimal':
      return item.value_decimal || '0'
    case 'string':
      return item.value_string || '-'
    default:
      return '-'
  }
}

function parseJsonObject(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  const parsed = JSON.parse(trimmed)
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('JSON harus berupa object.')
  }
  return parsed as Record<string, unknown>
}

function extractError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Permintaan gagal diproses.'
  }
  return 'Permintaan gagal diproses.'
}

function openCreatePriceModal() {
  priceFormMode.value = 'create'
  selectedPriceId.value = ''
  priceFormError.value = ''
  priceModalOpen.value = true
}

function openEditPriceModal(price: PlatformBillingPlanPrice) {
  priceFormMode.value = 'edit'
  selectedPriceId.value = price.id
  priceFormError.value = ''
  priceModalOpen.value = true
}

function openDeletePriceModal(price: PlatformBillingPlanPrice) {
  selectedPriceId.value = price.id
  priceDeleteError.value = ''
  priceDeleteModalOpen.value = true
}

async function submitPrice(payload: PlatformBillingPlanPricePayload) {
  if (!props.planId) return
  try {
    if (priceFormMode.value === 'create') {
      await createPriceMutation.mutateAsync({ id: props.planId, payload })
    } else if (selectedPriceId.value) {
      await updatePriceMutation.mutateAsync({
        id: props.planId,
        priceId: selectedPriceId.value,
        payload,
      })
    }
    priceModalOpen.value = false
  } catch (error) {
    priceFormError.value = extractError(error)
  }
}

async function confirmDeletePrice() {
  if (!props.planId || !selectedPriceId.value) return
  try {
    await deletePriceMutation.mutateAsync({ id: props.planId, priceId: selectedPriceId.value })
    priceDeleteModalOpen.value = false
  } catch (error) {
    priceDeleteError.value = extractError(error)
  }
}

async function saveEntitlements() {
  if (!props.planId) return
  entitlementError.value = ''
  entitlementSuccess.value = false

  try {
    const entitlements = entitlementDrafts.value
      .filter((item) => item.enabled)
      .map((item) => {
        const payload: ReplacePlatformBillingPlanEntitlementsPayload['entitlements'][number] = {
          feature_key: item.feature_key,
        }

        switch (item.value_type) {
          case 'boolean':
            payload.value_bool = item.value_bool
            break
          case 'integer':
            if (!item.value_int.trim()) {
              throw new Error(`Value integer untuk ${item.feature_key} wajib diisi.`)
            }
            payload.value_int = Number(item.value_int)
            break
          case 'decimal':
            if (!item.value_decimal.trim()) {
              throw new Error(`Value decimal untuk ${item.feature_key} wajib diisi.`)
            }
            payload.value_decimal = item.value_decimal.trim()
            break
          case 'string':
            if (!item.value_string.trim()) {
              throw new Error(`Value string untuk ${item.feature_key} wajib diisi.`)
            }
            payload.value_string = item.value_string.trim()
            break
        }

        if (item.limits_text.trim()) {
          payload.limits = parseJsonObject(item.limits_text)
        }

        return payload
      })

    await replaceEntitlementsMutation.mutateAsync({
      id: props.planId,
      payload: { entitlements },
    })
    entitlementSuccess.value = true
  } catch (error) {
    entitlementError.value = extractError(error)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex bg-gray-900/40 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <aside
        class="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-xl dark:bg-gray-950"
      >
        <div
          class="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800"
        >
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
              Detail Plan Katalog
            </p>
            <h2 class="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ selectedPlan?.name || 'Memuat plan...' }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ selectedPlan?.code }} · {{ selectedPlan?.plan_type }}
            </p>
          </div>
          <button
            class="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            @click="emit('close')"
          >
            <X class="size-5" />
          </button>
        </div>

        <div
          v-if="selectedPlan"
          class="flex items-center gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-800"
        >
          <button
            class="rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="
              drawerTab === 'overview'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
            "
            @click="drawerTab = 'overview'"
          >
            Ringkasan
          </button>
          <button
            class="rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="
              drawerTab === 'prices'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
            "
            @click="drawerTab = 'prices'"
          >
            Harga
          </button>
          <button
            class="rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="
              drawerTab === 'entitlements'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
            "
            @click="drawerTab = 'entitlements'"
          >
            Pemetaan Feature
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div v-if="planDetailQuery.isLoading.value" class="space-y-3">
            <div class="h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
            <div class="h-48 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
          </div>

          <template v-else-if="selectedPlan">
            <div v-if="drawerTab === 'overview'" class="space-y-6">
              <div class="grid gap-4 md:grid-cols-2">
                <BaseCard>
                  <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Visibilitas</p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    <PlanStatusBadge :active="selectedPlan.is_active" />
                    <PlanStatusBadge
                      :active="selectedPlan.is_public"
                      active-label="public"
                      inactive-label="private"
                    />
                  </div>
                  <p class="mt-5 text-sm text-gray-500">
                    Dibuat {{ formatDate(selectedPlan.created_at) }}
                  </p>
                  <p class="mt-1 text-sm text-gray-500">
                    Diupdate {{ formatDate(selectedPlan.updated_at) }}
                  </p>
                </BaseCard>

                <BaseCard>
                  <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Komersial</p>
                  <p class="mt-4 text-sm text-gray-500">
                    Urutan tampil:
                    <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                      selectedPlan.sort_order
                    }}</span>
                  </p>
                  <p class="mt-2 text-sm text-gray-500">
                    Jumlah harga:
                    <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                      selectedPlanPrices.length
                    }}</span>
                  </p>
                  <p class="mt-2 text-sm text-gray-500">
                    Feature terpetakan:
                    <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                      planEntitlements.length
                    }}</span>
                  </p>
                </BaseCard>
              </div>

              <BaseCard>
                <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Deskripsi</p>
                <p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {{ selectedPlan.description || 'Belum ada deskripsi plan.' }}
                </p>
              </BaseCard>

              <BaseCard>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Metadata</p>
                    <p class="mt-2 text-sm text-gray-500">
                      Metadata mentah dari backend untuk plan ini.
                    </p>
                  </div>
                  <PermissionGate permission="platform.product.plan.manage">
                    <BaseButton variant="outline" @click="emit('edit-plan', selectedPlan.id)">
                      <PencilLine class="size-4" />
                      Edit plan
                    </BaseButton>
                  </PermissionGate>
                </div>
                <pre
                  class="mt-4 overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs text-gray-100"
                  >{{ JSON.stringify(selectedPlan.metadata ?? {}, null, 2) }}</pre
                >
              </BaseCard>
            </div>

            <div v-else-if="drawerTab === 'prices'" class="space-y-6">
              <BaseCard>
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Harga Plan</p>
                    <p class="mt-2 text-sm text-gray-500">
                      Kelola semua interval harga untuk plan ini secara terpisah.
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-3">
                    <label class="flex items-center gap-2 text-sm text-gray-500">
                      <input
                        v-model="includeDeletedPrices"
                        type="checkbox"
                        class="size-4 rounded border-gray-300"
                      />
                      Tampilkan yang dihapus
                    </label>
                    <PermissionGate permission="platform.product.plan_price.manage">
                      <BaseButton @click="openCreatePriceModal">
                        <Plus class="size-4" />
                        Tambah harga
                      </BaseButton>
                    </PermissionGate>
                  </div>
                </div>

                <div v-if="planPricesQuery.isLoading.value" class="mt-5 space-y-3">
                  <div class="h-20 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
                  <div class="h-20 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
                </div>

                <div v-else-if="selectedPlanPrices.length" class="mt-5 space-y-3">
                  <div
                    v-for="price in selectedPlanPrices"
                    :key="price.id"
                    class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {{ price.billing_interval }} ·
                          {{ formatCurrency(Number(price.amount), price.currency) }}
                        </p>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Mata uang {{ price.currency }} · diupdate
                          {{ formatDate(price.updated_at) }}
                        </p>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <PlanStatusBadge :active="price.is_active" />
                          <span
                            v-if="price.deleted_at"
                            class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900"
                          >
                            dihapus
                          </span>
                        </div>
                      </div>

                      <div class="flex gap-2">
                        <PermissionGate permission="platform.product.plan_price.manage">
                          <BaseButton
                            variant="outline"
                            :disabled="Boolean(price.deleted_at)"
                            @click="openEditPriceModal(price)"
                          >
                            <PencilLine class="size-4" />
                            Edit
                          </BaseButton>
                        </PermissionGate>
                        <PermissionGate permission="platform.product.plan_price.manage">
                          <BaseButton
                            variant="danger"
                            :disabled="Boolean(price.deleted_at)"
                            @click="openDeletePriceModal(price)"
                          >
                            <Trash2 class="size-4" />
                            Hapus
                          </BaseButton>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="mt-5 rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
                >
                  Belum ada harga untuk plan ini.
                </div>
              </BaseCard>
            </div>

            <div v-else class="space-y-6">
              <BaseCard>
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p
                      class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-400"
                    >
                      <SlidersHorizontal class="size-3.5" />
                      Pemetaan Feature & Entitlement
                    </p>
                    <p class="mt-2 text-sm text-gray-500">
                      Pilih feature dari katalog yang termasuk dalam plan ini beserta nilainya.
                      Feature baru bisa ditambahkan lewat tab "Feature Katalog".
                    </p>
                  </div>
                  <PermissionGate permission="platform.product.entitlement.manage">
                    <BaseButton
                      :disabled="
                        replaceEntitlementsMutation.isPending.value || !entitlementDrafts.length
                      "
                      @click="saveEntitlements"
                    >
                      <Save class="size-4" />
                      Simpan pemetaan
                    </BaseButton>
                  </PermissionGate>
                </div>

                <div
                  v-if="entitlementError"
                  class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  {{ entitlementError }}
                </div>
                <div
                  v-else-if="entitlementSuccess"
                  class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  Pemetaan feature berhasil disimpan.
                </div>

                <div
                  v-if="featuresQuery.isLoading.value || entitlementsQuery.isLoading.value"
                  class="mt-5 space-y-3"
                >
                  <div class="h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
                  <div class="h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-900"></div>
                </div>

                <div v-else-if="entitlementDrafts.length" class="mt-5 space-y-4">
                  <div
                    v-for="item in entitlementDrafts"
                    :key="item.feature_key"
                    class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div class="xl:max-w-sm">
                        <div class="flex flex-wrap items-center gap-2">
                          <label
                            class="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                          >
                            <input
                              v-model="item.enabled"
                              type="checkbox"
                              class="size-4 rounded border-gray-300"
                            />
                            {{ item.name }}
                          </label>
                          <span
                            class="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                          >
                            {{ item.module }}
                          </span>
                          <span
                            class="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700"
                          >
                            {{ item.value_type }}
                          </span>
                        </div>
                        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {{ item.feature_key }} · reset {{ item.reset_strategy }}
                        </p>
                        <p
                          v-if="item.description"
                          class="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400"
                        >
                          {{ item.description }}
                        </p>
                        <p class="mt-3 text-sm text-gray-500">
                          Nilai saat ini:
                          <span class="font-semibold text-gray-900 dark:text-gray-100">
                            {{ featureValuePreview(item) }}
                          </span>
                        </p>
                      </div>

                      <div class="grid flex-1 gap-4 md:grid-cols-2">
                        <label
                          v-if="item.value_type === 'boolean'"
                          class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
                        >
                          <input
                            v-model="item.value_bool"
                            type="checkbox"
                            class="size-4 rounded border-gray-300"
                            :disabled="!item.enabled"
                          />
                          <span class="text-sm font-medium text-gray-700 dark:text-gray-200"
                            >Value boolean</span
                          >
                        </label>

                        <TextField
                          v-else-if="item.value_type === 'integer'"
                          v-model="item.value_int"
                          :disabled="!item.enabled"
                          :name="`${item.feature_key}-value-int`"
                          label="Value integer"
                          type="number"
                          placeholder="10"
                        />

                        <TextField
                          v-else-if="item.value_type === 'decimal'"
                          v-model="item.value_decimal"
                          :disabled="!item.enabled"
                          :name="`${item.feature_key}-value-decimal`"
                          label="Value decimal"
                          placeholder="1000.00"
                        />

                        <TextField
                          v-else
                          v-model="item.value_string"
                          :disabled="!item.enabled"
                          :name="`${item.feature_key}-value-string`"
                          label="Value string"
                          placeholder="enabled"
                        />

                        <label class="block md:col-span-2">
                          <span
                            class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Limits (JSON, opsional)
                          </span>
                          <textarea
                            v-model="item.limits_text"
                            :disabled="!item.enabled"
                            rows="4"
                            placeholder='{"limit": 5}'
                            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:focus:ring-brand-900"
                          ></textarea>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
                >
                  <Tag class="size-6 text-gray-300" />
                  Belum ada feature aktif di katalog untuk dipetakan.
                </div>
              </BaseCard>
            </div>
          </template>
        </div>
      </aside>
    </div>
  </Teleport>

  <PlanPriceFormModal
    :is-open="priceModalOpen"
    :mode="priceFormMode"
    :price-to-edit="selectedPrice"
    :is-submitting="createPriceMutation.isPending.value || updatePriceMutation.isPending.value"
    :server-error="priceFormError"
    @close="priceModalOpen = false"
    @submit="submitPrice"
  />

  <BaseModal
    :open="priceDeleteModalOpen"
    title="Hapus harga plan"
    @close="priceDeleteModalOpen = false"
  >
    <div class="space-y-4">
      <div
        v-if="priceDeleteError"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ priceDeleteError }}
      </div>
      <div
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        Harga
        <span v-if="selectedPrice" class="font-semibold">
          {{ selectedPrice.billing_interval }} ·
          {{ formatCurrency(Number(selectedPrice.amount), selectedPrice.currency) }}
        </span>
        akan dihapus dari plan ini.
      </div>
      <div class="flex justify-end gap-3">
        <BaseButton variant="outline" @click="priceDeleteModalOpen = false">Batal</BaseButton>
        <BaseButton
          variant="danger"
          :disabled="deletePriceMutation.isPending.value"
          @click="confirmDeletePrice"
        >
          Hapus harga
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
