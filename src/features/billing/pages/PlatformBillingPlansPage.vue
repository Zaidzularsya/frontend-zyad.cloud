<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  BadgeCheck,
  Boxes,
  Eye,
  Package,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import FeatureFormModal from '@/features/billing/components/FeatureFormModal.vue'
import PlanDetailDrawer from '@/features/billing/components/PlanDetailDrawer.vue'
import PlanFormModal from '@/features/billing/components/PlanFormModal.vue'
import PlanStatusBadge from '@/features/billing/components/PlanStatusBadge.vue'
import {
  type CreatePlatformBillingFeaturePayload,
  type CreatePlatformBillingPlanPayload,
  type PlatformBillingFeature,
  type PlatformBillingFeatureListParams,
  type PlatformBillingPlan,
  type PlatformBillingPlanListParams,
  type PlatformBillingPlanType,
  type UpdatePlatformBillingFeaturePayload,
  type UpdatePlatformBillingPlanPayload,
} from '@/features/billing/api/platform-billing.api'
import {
  useCreatePlatformBillingFeatureMutation,
  useCreatePlatformBillingPlanMutation,
  useDeletePlatformBillingPlanMutation,
  usePlatformBillingFeaturesQuery,
  usePlatformBillingPlansQuery,
  useUpdatePlatformBillingFeatureMutation,
  useUpdatePlatformBillingPlanMutation,
} from '@/features/billing/api/platform-billing.queries'
import { formatCurrency, formatDate } from '@/lib/utils'

type CatalogTab = 'plans' | 'features'
type BooleanFilter = '' | 'true' | 'false'

const activeTab = ref<CatalogTab>('plans')

const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

// ─── Plans tab state ──────────────────────────────────────────────────────

const planFilters = reactive({
  page: 1,
  per_page: 10,
  type: '' as PlatformBillingPlanType | '',
  search: '',
  sort: 'sort_order',
  direction: 'asc' as 'asc' | 'desc',
  is_public: '' as BooleanFilter,
  is_active: '' as BooleanFilter,
  include_deleted: false,
})

const planListParams = computed<PlatformBillingPlanListParams>(() => ({
  page: planFilters.page,
  per_page: planFilters.per_page,
  type: planFilters.type || undefined,
  search: planFilters.search || undefined,
  sort: planFilters.sort,
  direction: planFilters.direction,
  is_public: planFilters.is_public === '' ? undefined : planFilters.is_public === 'true',
  is_active: planFilters.is_active === '' ? undefined : planFilters.is_active === 'true',
  include_deleted: planFilters.include_deleted,
}))

const planTypeOptions: Array<{ value: PlatformBillingPlanType; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
]

const plansQuery = usePlatformBillingPlansQuery(planListParams)
const createPlanMutation = useCreatePlatformBillingPlanMutation()
const updatePlanMutation = useUpdatePlatformBillingPlanMutation()
const deletePlanMutation = useDeletePlatformBillingPlanMutation()

const plans = computed(() => plansQuery.data.value?.data ?? [])
const plansMeta = computed(() => plansQuery.data.value?.meta ?? null)

const planFormOpen = ref(false)
const planFormMode = ref<'create' | 'edit'>('create')
const planFormError = ref('')
const planBeingEdited = ref<PlatformBillingPlan | null>(null)

const planDeleteModalOpen = ref(false)
const planBeingDeleted = ref<PlatformBillingPlan | null>(null)

const detailDrawerOpen = ref(false)
const detailPlanId = ref('')

const summaryCards = computed(() => {
  const activePlans = plans.value.filter((plan) => plan.is_active).length
  const publicPlans = plans.value.filter((plan) => plan.is_public).length
  const multiPricePlans = plans.value.filter((plan) => (plan.prices?.length ?? 0) > 1).length

  return [
    {
      label: 'Total plan (halaman ini)',
      value: String(plansMeta.value?.total ?? plans.value.length),
      icon: Package,
    },
    { label: 'Plan aktif', value: String(activePlans), icon: BadgeCheck },
    { label: 'Plan publik (katalog)', value: String(publicPlans), icon: Boxes },
    { label: 'Multi-interval harga', value: String(multiPricePlans), icon: Settings2 },
  ]
})

const canGoToPreviousPage = computed(() => (plansMeta.value?.page ?? 1) > 1)
const canGoToNextPage = computed(() => {
  if (!plansMeta.value) return false
  return plansMeta.value.page < plansMeta.value.total_pages
})

watch(
  () => [
    planFilters.search,
    planFilters.type,
    planFilters.sort,
    planFilters.direction,
    planFilters.per_page,
    planFilters.is_public,
    planFilters.is_active,
    planFilters.include_deleted,
  ],
  () => {
    planFilters.page = 1
  },
)

function goToPreviousPage() {
  if (!canGoToPreviousPage.value) return
  planFilters.page = Math.max(1, planFilters.page - 1)
}

function goToNextPage() {
  if (!canGoToNextPage.value) return
  planFilters.page += 1
}

function openCreatePlanModal() {
  planFormMode.value = 'create'
  planBeingEdited.value = null
  planFormError.value = ''
  planFormOpen.value = true
}

function openEditPlanModal(plan: PlatformBillingPlan) {
  planFormMode.value = 'edit'
  planBeingEdited.value = plan
  planFormError.value = ''
  planFormOpen.value = true
}

function openEditPlanById(planId: string) {
  const plan = plans.value.find((item) => item.id === planId) ?? null
  planFormMode.value = 'edit'
  planBeingEdited.value = plan
  planFormError.value = ''
  planFormOpen.value = true
}

function openDeletePlanModal(plan: PlatformBillingPlan) {
  planBeingDeleted.value = plan
  planDeleteModalOpen.value = true
}

function openDetailDrawer(plan: PlatformBillingPlan) {
  detailPlanId.value = plan.id
  detailDrawerOpen.value = true
}

async function submitCreatePlan(payload: CreatePlatformBillingPlanPayload) {
  try {
    await createPlanMutation.mutateAsync(payload)
    feedback.value = { tone: 'success', message: `Plan "${payload.name}" berhasil dibuat.` }
    planFormOpen.value = false
  } catch (error) {
    planFormError.value = extractError(error)
  }
}

async function submitUpdatePlan(payload: UpdatePlatformBillingPlanPayload) {
  if (!planBeingEdited.value) return
  try {
    await updatePlanMutation.mutateAsync({ id: planBeingEdited.value.id, payload })
    feedback.value = { tone: 'success', message: 'Plan berhasil diperbarui.' }
    planFormOpen.value = false
  } catch (error) {
    planFormError.value = extractError(error)
  }
}

async function confirmDeletePlan() {
  if (!planBeingDeleted.value) return
  try {
    await deletePlanMutation.mutateAsync(planBeingDeleted.value.id)
    feedback.value = {
      tone: 'success',
      message: `Plan "${planBeingDeleted.value.name}" berhasil dihapus.`,
    }
    if (detailPlanId.value === planBeingDeleted.value.id) {
      detailDrawerOpen.value = false
    }
    planDeleteModalOpen.value = false
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
  }
}

// ─── Features tab state ───────────────────────────────────────────────────

const featureFilters = reactive({
  page: 1,
  per_page: 50,
  module: '',
  search: '',
  is_active: '' as BooleanFilter,
})

const featureListParams = computed<PlatformBillingFeatureListParams>(() => ({
  page: featureFilters.page,
  per_page: featureFilters.per_page,
  module: featureFilters.module || undefined,
  search: featureFilters.search || undefined,
  is_active: featureFilters.is_active === '' ? undefined : featureFilters.is_active === 'true',
}))

const featuresQuery = usePlatformBillingFeaturesQuery(featureListParams)
const createFeatureMutation = useCreatePlatformBillingFeatureMutation()
const updateFeatureMutation = useUpdatePlatformBillingFeatureMutation()

const features = computed(() => featuresQuery.data.value?.data ?? [])
const featureModules = computed(() => {
  const modules = new Set(features.value.map((feature) => feature.module))
  return Array.from(modules).sort()
})

const featureFormOpen = ref(false)
const featureFormMode = ref<'create' | 'edit'>('create')
const featureFormError = ref('')
const featureBeingEdited = ref<PlatformBillingFeature | null>(null)

function openCreateFeatureModal() {
  featureFormMode.value = 'create'
  featureBeingEdited.value = null
  featureFormError.value = ''
  featureFormOpen.value = true
}

function openEditFeatureModal(feature: PlatformBillingFeature) {
  featureFormMode.value = 'edit'
  featureBeingEdited.value = feature
  featureFormError.value = ''
  featureFormOpen.value = true
}

async function submitCreateFeature(payload: CreatePlatformBillingFeaturePayload) {
  try {
    await createFeatureMutation.mutateAsync(payload)
    feedback.value = { tone: 'success', message: `Feature "${payload.name}" berhasil ditambahkan.` }
    featureFormOpen.value = false
  } catch (error) {
    featureFormError.value = extractError(error)
  }
}

async function submitUpdateFeature(payload: UpdatePlatformBillingFeaturePayload) {
  if (!featureBeingEdited.value) return
  try {
    await updateFeatureMutation.mutateAsync({ id: featureBeingEdited.value.id, payload })
    feedback.value = { tone: 'success', message: 'Feature berhasil diperbarui.' }
    featureFormOpen.value = false
  } catch (error) {
    featureFormError.value = extractError(error)
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function refreshAll() {
  void plansQuery.refetch()
  void featuresQuery.refetch()
}

function extractError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? 'Permintaan gagal diproses.'
  }
  return 'Permintaan gagal diproses.'
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Product Catalog"
      description="Kelola katalog plan, harga, dan feature platform yang dipakai untuk berlangganan dan tampil di halaman pricing publik."
    >
      <div class="flex flex-wrap gap-3">
        <BaseButton
          variant="secondary"
          :disabled="plansQuery.isFetching.value || featuresQuery.isFetching.value"
          @click="refreshAll"
        >
          <RefreshCw
            class="size-4"
            :class="{
              'animate-spin': plansQuery.isFetching.value || featuresQuery.isFetching.value,
            }"
          />
          Refresh
        </BaseButton>
        <PermissionGate v-if="activeTab === 'plans'" permission="platform.product.plan.manage">
          <BaseButton @click="openCreatePlanModal">
            <Plus class="size-4" />
            Tambah plan
          </BaseButton>
        </PermissionGate>
        <PermissionGate v-else permission="platform.product.feature.manage">
          <BaseButton @click="openCreateFeatureModal">
            <Plus class="size-4" />
            Tambah feature
          </BaseButton>
        </PermissionGate>
      </div>
    </PageHeader>

    <div
      v-if="feedback"
      class="rounded-2xl border px-4 py-3 text-sm"
      :class="
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
      "
    >
      {{ feedback.message }}
    </div>

    <div class="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      <button
        class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === 'plans'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = 'plans'"
      >
        <Package class="size-4" />
        Plan & Harga
      </button>
      <button
        class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-all"
        :class="
          activeTab === 'features'
            ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        "
        @click="activeTab = 'features'"
      >
        <Sparkles class="size-4" />
        Katalog Feature
      </button>
    </div>

    <!-- ─── Plans tab ──────────────────────────────────────────────────── -->
    <template v-if="activeTab === 'plans'">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BaseCard v-for="item in summaryCards" :key="item.label">
          <div class="flex items-start justify-between">
            <span class="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <component :is="item.icon" class="size-5" />
            </span>
          </div>
          <p class="mt-5 text-sm text-gray-500">{{ item.label }}</p>
          <p class="mt-1 text-2xl font-bold">{{ item.value }}</p>
        </BaseCard>
      </div>

      <BaseCard>
        <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label class="relative block xl:col-span-2">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Cari</span
            >
            <Search class="pointer-events-none absolute left-3 top-[42px] size-4 text-gray-400" />
            <input
              v-model="planFilters.search"
              type="search"
              placeholder="Kode atau nama plan"
              class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Tipe</span
            >
            <select
              v-model="planFilters.type"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="">Semua tipe</option>
              <option v-for="option in planTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Visibilitas</span
            >
            <select
              v-model="planFilters.is_public"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="">Semua</option>
              <option value="true">Publik</option>
              <option value="false">Privat</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Status</span
            >
            <select
              v-model="planFilters.is_active"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="">Semua</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Urutkan</span
            >
            <select
              v-model="planFilters.sort"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="sort_order">Urutan tampil</option>
              <option value="name">Nama</option>
              <option value="created_at">Dibuat</option>
            </select>
          </label>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-500">
            <input
              v-model="planFilters.include_deleted"
              type="checkbox"
              class="size-4 rounded border-gray-300"
            />
            Tampilkan yang dihapus
          </label>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-500">
              Arah:
              <select
                v-model="planFilters.direction"
                class="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
              </select>
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-500">
              Per halaman:
              <select
                v-model.number="planFilters.per_page"
                class="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </label>
          </div>
        </div>

        <div v-if="plansQuery.isLoading.value" class="mt-6 space-y-3">
          <div
            v-for="index in 4"
            :key="index"
            class="h-24 animate-pulse rounded-2xl bg-gray-50 dark:bg-gray-950"
          ></div>
        </div>

        <div
          v-else-if="plans.length"
          class="mt-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead class="bg-gray-50/80 dark:bg-gray-950/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">Plan</th>
                  <th class="px-4 py-3 text-left font-semibold">Tipe</th>
                  <th class="px-4 py-3 text-left font-semibold">Status</th>
                  <th class="px-4 py-3 text-left font-semibold">Harga</th>
                  <th class="px-4 py-3 text-left font-semibold">Diupdate</th>
                  <th class="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="plan in plans" :key="plan.id" class="bg-white dark:bg-gray-900">
                  <td class="px-4 py-4 align-top">
                    <div class="font-semibold text-gray-900 dark:text-gray-100">
                      {{ plan.name }}
                    </div>
                    <div class="mt-1 text-xs uppercase tracking-wide text-gray-500">
                      {{ plan.code }}
                    </div>
                    <p
                      v-if="plan.description"
                      class="mt-2 max-w-md text-xs text-gray-500 dark:text-gray-400"
                    >
                      {{ plan.description }}
                    </p>
                  </td>
                  <td class="px-4 py-4 align-top">
                    <span
                      class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {{ plan.plan_type }}
                    </span>
                  </td>
                  <td class="px-4 py-4 align-top">
                    <div class="flex flex-wrap gap-2">
                      <PlanStatusBadge :active="plan.is_active" />
                      <PlanStatusBadge
                        :active="plan.is_public"
                        active-label="public"
                        inactive-label="private"
                      />
                    </div>
                  </td>
                  <td class="px-4 py-4 align-top">
                    <div v-if="plan.prices?.length" class="space-y-1">
                      <div
                        v-for="price in plan.prices"
                        :key="price.id"
                        class="text-xs text-gray-600 dark:text-gray-300"
                      >
                        {{ price.billing_interval }} ·
                        {{ formatCurrency(Number(price.amount), price.currency) }}
                      </div>
                    </div>
                    <span v-else class="text-xs text-gray-400">Belum ada harga</span>
                  </td>
                  <td class="px-4 py-4 align-top text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(plan.updated_at) }}
                  </td>
                  <td class="px-4 py-4 align-top">
                    <div class="flex justify-end gap-2">
                      <PermissionGate permission="platform.product.plan.read">
                        <BaseButton variant="secondary" @click="openDetailDrawer(plan)">
                          <Eye class="size-4" />
                          Detail
                        </BaseButton>
                      </PermissionGate>
                      <PermissionGate permission="platform.product.plan.manage">
                        <BaseButton variant="outline" @click="openEditPlanModal(plan)">
                          <PencilLine class="size-4" />
                          Edit
                        </BaseButton>
                      </PermissionGate>
                      <PermissionGate permission="platform.product.plan.manage">
                        <BaseButton variant="danger" @click="openDeletePlanModal(plan)">
                          <Trash2 class="size-4" />
                          Hapus
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
          Belum ada plan yang cocok dengan filter saat ini.
        </div>

        <div
          v-if="plansMeta"
          class="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 md:flex-row md:items-center md:justify-between"
        >
          <p>
            Menampilkan halaman {{ plansMeta.page }} dari {{ plansMeta.total_pages }} · total
            {{ plansMeta.total }} plan
          </p>
          <div class="flex gap-3">
            <BaseButton
              variant="outline"
              :disabled="!canGoToPreviousPage"
              @click="goToPreviousPage"
            >
              Sebelumnya
            </BaseButton>
            <BaseButton variant="outline" :disabled="!canGoToNextPage" @click="goToNextPage">
              Berikutnya
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </template>

    <!-- ─── Features tab ───────────────────────────────────────────────── -->
    <template v-else>
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
                    <PlanStatusBadge :active="feature.is_active" />
                  </td>
                  <td class="px-4 py-4 align-top">
                    <div class="flex justify-end gap-2">
                      <PermissionGate permission="platform.product.feature.manage">
                        <BaseButton variant="outline" @click="openEditFeatureModal(feature)">
                          <PencilLine class="size-4" />
                          Edit
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
    </template>

    <!-- ─── Modals & drawers ───────────────────────────────────────────── -->
    <PlanFormModal
      :is-open="planFormOpen"
      :mode="planFormMode"
      :plan-to-edit="planBeingEdited"
      :is-submitting="createPlanMutation.isPending.value || updatePlanMutation.isPending.value"
      :server-error="planFormError"
      @close="planFormOpen = false"
      @create="submitCreatePlan"
      @update="submitUpdatePlan"
    />

    <BaseModal
      :open="planDeleteModalOpen"
      title="Hapus plan katalog"
      @close="planDeleteModalOpen = false"
    >
      <div class="space-y-4">
        <div
          class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          Plan
          <span v-if="planBeingDeleted" class="font-semibold">{{ planBeingDeleted.name }}</span>
          akan dihapus dari katalog aktif. Pastikan plan ini memang tidak lagi dipakai untuk alur
          berlangganan baru.
        </div>
        <div class="flex justify-end gap-3">
          <BaseButton variant="outline" @click="planDeleteModalOpen = false">Batal</BaseButton>
          <BaseButton
            variant="danger"
            :disabled="deletePlanMutation.isPending.value"
            @click="confirmDeletePlan"
          >
            Hapus plan
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <PlanDetailDrawer
      :is-open="detailDrawerOpen"
      :plan-id="detailPlanId"
      @close="detailDrawerOpen = false"
      @edit-plan="openEditPlanById"
    />

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
