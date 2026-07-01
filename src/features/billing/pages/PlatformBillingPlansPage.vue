<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  BadgeCheck,
  CreditCard,
  Eye,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import PermissionGate from '@/components/common/PermissionGate.vue'
import TextField from '@/components/form/TextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  type CreatePlatformBillingPlanPayload,
  type PlatformBillingFeature,
  type PlatformBillingFeatureListParams,
  type PlatformBillingInterval,
  type PlatformBillingPlan,
  type PlatformBillingPlanEntitlement,
  type PlatformBillingPlanListParams,
  type PlatformBillingPlanPrice,
  type PlatformBillingPlanPricePayload,
  type PlatformBillingPlanType,
  type ReplacePlatformBillingPlanEntitlementsPayload,
} from '@/features/billing/api/platform-billing.api'
import {
  useCreatePlatformBillingPlanMutation,
  useCreatePlatformBillingPlanPriceMutation,
  useDeletePlatformBillingPlanMutation,
  useDeletePlatformBillingPlanPriceMutation,
  usePlatformBillingFeaturesQuery,
  usePlatformBillingPlanDetailQuery,
  usePlatformBillingPlanEntitlementsQuery,
  usePlatformBillingPlanPricesQuery,
  usePlatformBillingPlansQuery,
  useReplacePlatformBillingPlanEntitlementsMutation,
  useUpdatePlatformBillingPlanMutation,
  useUpdatePlatformBillingPlanPriceMutation,
} from '@/features/billing/api/platform-billing.queries'
import { formatCurrency, formatDate } from '@/lib/utils'

type PlanFormMode = 'create' | 'edit'
type PriceFormMode = 'create' | 'edit'
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

const filters = reactive<PlatformBillingPlanListParams>({
  page: 1,
  per_page: 10,
  type: '',
  search: '',
  sort: 'sort_order',
  direction: 'asc',
})

const featureFilters = reactive<PlatformBillingFeatureListParams>({
  page: 1,
  per_page: 100,
  is_active: true,
})

const selectedPlanId = ref('')
const selectedPriceId = ref('')
const includeDeletedPrices = ref(false)
const detailDrawerOpen = ref(false)
const drawerTab = ref<DrawerTab>('overview')
const formMode = ref<PlanFormMode>('create')
const priceFormMode = ref<PriceFormMode>('create')
const planModalOpen = ref(false)
const deleteModalOpen = ref(false)
const priceModalOpen = ref(false)
const priceDeleteModalOpen = ref(false)
const formError = ref('')
const priceFormError = ref('')
const entitlementError = ref('')
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

const planForm = reactive({
  code: '',
  name: '',
  description: '',
  plan_type: 'paid' as PlatformBillingPlanType,
  is_public: true,
  is_active: true,
  sort_order: '10',
  monthly_amount: '',
  yearly_amount: '',
})

const priceForm = reactive({
  billing_interval: 'monthly' as PlatformBillingInterval,
  currency: 'IDR',
  amount: '',
  is_active: true,
})

const entitlementDrafts = ref<EntitlementDraft[]>([])

const planTypeOptions: Array<{ value: PlatformBillingPlanType; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
]

const priceIntervalOptions: Array<{ value: PlatformBillingInterval; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One Time' },
  { value: 'custom', label: 'Custom' },
]

const filtersRef = computed(() => ({ ...filters }))
const featureFiltersRef = computed(() => ({ ...featureFilters }))

const plansQuery = usePlatformBillingPlansQuery(filtersRef)
const planDetailQuery = usePlatformBillingPlanDetailQuery(selectedPlanId)
const planPricesQuery = usePlatformBillingPlanPricesQuery(selectedPlanId, includeDeletedPrices)
const featuresQuery = usePlatformBillingFeaturesQuery(featureFiltersRef)
const entitlementsQuery = usePlatformBillingPlanEntitlementsQuery(selectedPlanId)
const createPlanMutation = useCreatePlatformBillingPlanMutation()
const updatePlanMutation = useUpdatePlatformBillingPlanMutation()
const deletePlanMutation = useDeletePlatformBillingPlanMutation()
const createPlanPriceMutation = useCreatePlatformBillingPlanPriceMutation()
const updatePlanPriceMutation = useUpdatePlatformBillingPlanPriceMutation()
const deletePlanPriceMutation = useDeletePlatformBillingPlanPriceMutation()
const replaceEntitlementsMutation = useReplacePlatformBillingPlanEntitlementsMutation()

const plans = computed(() => plansQuery.data.value?.data ?? [])
const plansMeta = computed(() => plansQuery.data.value?.meta ?? null)
const selectedPlan = computed(() => planDetailQuery.data.value ?? null)
const selectedPlanPrices = computed(
  () => planPricesQuery.data.value ?? selectedPlan.value?.prices ?? [],
)
const selectedPrice = computed(
  () => selectedPlanPrices.value.find((price) => price.id === selectedPriceId.value) ?? null,
)
const features = computed(() => featuresQuery.data.value?.data ?? [])
const planEntitlements = computed(() => entitlementsQuery.data.value ?? [])

const summaryCards = computed(() => {
  const activePlans = plans.value.filter((plan) => plan.is_active).length
  const publicPlans = plans.value.filter((plan) => plan.is_public).length
  const plansWithMultiplePrices = plans.value.filter(
    (plan) => (plan.prices?.length ?? 0) > 1,
  ).length

  return [
    {
      label: 'Total plans',
      value: String(plansMeta.value?.total ?? plans.value.length),
      icon: CreditCard,
    },
    { label: 'Active plans', value: String(activePlans), icon: BadgeCheck },
    { label: 'Public plans', value: String(publicPlans), icon: BadgeCheck },
    { label: 'Multi-price plans', value: String(plansWithMultiplePrices), icon: Settings2 },
  ]
})

const canGoToPreviousPage = computed(() => (plansMeta.value?.page ?? 1) > 1)
const canGoToNextPage = computed(() => {
  if (!plansMeta.value) return false
  return plansMeta.value.page < plansMeta.value.total_pages
})

watch(
  () => [filters.search, filters.type, filters.sort, filters.direction, filters.per_page],
  () => {
    filters.page = 1
  },
)

watch(
  selectedPlan,
  (plan) => {
    if (!plan || formMode.value !== 'edit') return
    fillPlanForm(plan)
  },
  { immediate: true },
)

watch(
  [features, planEntitlements, detailDrawerOpen],
  ([featureList, entitlements, drawerOpen]) => {
    if (!drawerOpen || !featureList.length) return
    entitlementDrafts.value = buildEntitlementDrafts(featureList, entitlements)
  },
  { immediate: true },
)

function fillPlanForm(plan: PlatformBillingPlan) {
  planForm.code = plan.code
  planForm.name = plan.name
  planForm.description = plan.description ?? ''
  planForm.plan_type = plan.plan_type
  planForm.is_public = plan.is_public
  planForm.is_active = plan.is_active
  planForm.sort_order = String(plan.sort_order)
  planForm.monthly_amount =
    plan.prices
      ?.find((price) => price.billing_interval === 'monthly')
      ?.amount?.replace(/\.00$/, '') ?? ''
  planForm.yearly_amount =
    plan.prices
      ?.find((price) => price.billing_interval === 'yearly')
      ?.amount?.replace(/\.00$/, '') ?? ''
}

function resetPlanForm() {
  planForm.code = ''
  planForm.name = ''
  planForm.description = ''
  planForm.plan_type = 'paid'
  planForm.is_public = true
  planForm.is_active = true
  planForm.sort_order = '10'
  planForm.monthly_amount = ''
  planForm.yearly_amount = ''
  formError.value = ''
}

function resetPriceForm() {
  priceForm.billing_interval = 'monthly'
  priceForm.currency = 'IDR'
  priceForm.amount = ''
  priceForm.is_active = true
  priceFormError.value = ''
}

function openCreateModal() {
  formMode.value = 'create'
  selectedPlanId.value = ''
  resetPlanForm()
  feedback.value = null
  planModalOpen.value = true
}

function openEditModal(plan: PlatformBillingPlan) {
  formMode.value = 'edit'
  selectedPlanId.value = plan.id
  fillPlanForm(plan)
  formError.value = ''
  feedback.value = null
  planModalOpen.value = true
}

function openDeleteModal(plan: PlatformBillingPlan) {
  selectedPlanId.value = plan.id
  feedback.value = null
  deleteModalOpen.value = true
}

function openDetailDrawer(plan: PlatformBillingPlan, tab: DrawerTab = 'overview') {
  selectedPlanId.value = plan.id
  drawerTab.value = tab
  detailDrawerOpen.value = true
  feedback.value = null
}

function closeDetailDrawer() {
  detailDrawerOpen.value = false
  drawerTab.value = 'overview'
  includeDeletedPrices.value = false
}

function openCreatePriceModal() {
  if (!selectedPlanId.value) return
  priceFormMode.value = 'create'
  selectedPriceId.value = ''
  resetPriceForm()
  priceModalOpen.value = true
}

function openEditPriceModal(price: PlatformBillingPlanPrice) {
  priceFormMode.value = 'edit'
  selectedPriceId.value = price.id
  priceForm.billing_interval = price.billing_interval
  priceForm.currency = price.currency
  priceForm.amount = price.amount.replace(/\.00$/, '')
  priceForm.is_active = price.is_active
  priceFormError.value = ''
  priceModalOpen.value = true
}

function openDeletePriceModal(price: PlatformBillingPlanPrice) {
  selectedPriceId.value = price.id
  priceDeleteModalOpen.value = true
}

function buildCreatePrices(): PlatformBillingPlanPricePayload[] {
  const items: PlatformBillingPlanPricePayload[] = []

  if (planForm.monthly_amount.trim()) {
    items.push({
      billing_interval: 'monthly',
      currency: 'IDR',
      amount: normalizeAmount(planForm.monthly_amount),
      is_active: true,
    })
  }
  if (planForm.yearly_amount.trim()) {
    items.push({
      billing_interval: 'yearly',
      currency: 'IDR',
      amount: normalizeAmount(planForm.yearly_amount),
      is_active: true,
    })
  }

  return items
}

function normalizeAmount(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric.toFixed(2) : value
}

function validatePlanForm() {
  if (!planForm.code.trim()) return 'Code wajib diisi.'
  if (!planForm.name.trim()) return 'Nama plan wajib diisi.'
  return ''
}

function validatePriceForm() {
  if (!selectedPlanId.value) return 'Plan belum dipilih.'
  if (!priceForm.billing_interval) return 'Billing interval wajib dipilih.'
  if (!priceForm.amount.trim()) return 'Amount wajib diisi.'
  return ''
}

function statusBadgeClass(enabled: boolean) {
  return enabled
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-gray-100 text-gray-600 ring-gray-200'
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
  if (!item.enabled) return 'Not mapped'
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

async function submitPlan() {
  formError.value = validatePlanForm()
  if (formError.value) return

  try {
    if (formMode.value === 'create') {
      const payload: CreatePlatformBillingPlanPayload = {
        code: planForm.code.trim(),
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        plan_type: planForm.plan_type,
        is_public: planForm.is_public,
        is_active: planForm.is_active,
        sort_order: Number(planForm.sort_order),
        prices: buildCreatePrices(),
      }
      await createPlanMutation.mutateAsync(payload)
      feedback.value = { tone: 'success', message: 'Billing plan berhasil dibuat.' }
    } else if (selectedPlanId.value) {
      await updatePlanMutation.mutateAsync({
        id: selectedPlanId.value,
        payload: {
          name: planForm.name.trim(),
          description: planForm.description.trim() || undefined,
          plan_type: planForm.plan_type,
          is_public: planForm.is_public,
          is_active: planForm.is_active,
          sort_order: Number(planForm.sort_order),
        },
      })
      feedback.value = { tone: 'success', message: 'Billing plan berhasil diperbarui.' }
    }
    planModalOpen.value = false
    resetPlanForm()
  } catch (error) {
    formError.value = extractError(error)
  }
}

async function confirmDelete() {
  if (!selectedPlanId.value) return
  try {
    await deletePlanMutation.mutateAsync(selectedPlanId.value)
    if (selectedPlan.value?.id === selectedPlanId.value) {
      closeDetailDrawer()
    }
    deleteModalOpen.value = false
    feedback.value = { tone: 'success', message: 'Billing plan berhasil dihapus.' }
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
  }
}

async function submitPrice() {
  priceFormError.value = validatePriceForm()
  if (priceFormError.value || !selectedPlanId.value) return

  try {
    const payload = {
      billing_interval: priceForm.billing_interval,
      currency: priceForm.currency.trim() || 'IDR',
      amount: normalizeAmount(priceForm.amount),
      is_active: priceForm.is_active,
    }

    if (priceFormMode.value === 'create') {
      await createPlanPriceMutation.mutateAsync({
        id: selectedPlanId.value,
        payload,
      })
      feedback.value = { tone: 'success', message: 'Plan price berhasil ditambahkan.' }
    } else if (selectedPriceId.value) {
      await updatePlanPriceMutation.mutateAsync({
        id: selectedPlanId.value,
        priceId: selectedPriceId.value,
        payload,
      })
      feedback.value = { tone: 'success', message: 'Plan price berhasil diperbarui.' }
    }

    priceModalOpen.value = false
    resetPriceForm()
  } catch (error) {
    priceFormError.value = extractError(error)
  }
}

async function confirmDeletePrice() {
  if (!selectedPlanId.value || !selectedPriceId.value) return
  try {
    await deletePlanPriceMutation.mutateAsync({
      id: selectedPlanId.value,
      priceId: selectedPriceId.value,
    })
    priceDeleteModalOpen.value = false
    feedback.value = { tone: 'success', message: 'Plan price berhasil dihapus.' }
  } catch (error) {
    feedback.value = { tone: 'error', message: extractError(error) }
  }
}

async function saveEntitlements() {
  if (!selectedPlanId.value) return
  entitlementError.value = ''

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
      id: selectedPlanId.value,
      payload: { entitlements },
    })

    feedback.value = {
      tone: 'success',
      message: 'Feature dan entitlement mapping berhasil diperbarui.',
    }
  } catch (error) {
    entitlementError.value = extractError(error)
  }
}

function refreshPlans() {
  void plansQuery.refetch()
  if (selectedPlanId.value) {
    void Promise.all([
      planDetailQuery.refetch(),
      planPricesQuery.refetch(),
      entitlementsQuery.refetch(),
      featuresQuery.refetch(),
    ])
  }
}

function goToPreviousPage() {
  if (!canGoToPreviousPage.value) return
  filters.page = Math.max(1, (filters.page ?? 1) - 1)
}

function goToNextPage() {
  if (!canGoToNextPage.value) return
  filters.page = (filters.page ?? 1) + 1
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
      title="Billing Plan Management"
      description="Kelola plan, price, dan mapping entitlement yang dipakai dashboard billing platform admin."
    >
      <div class="flex flex-wrap gap-3">
        <BaseButton
          variant="secondary"
          :disabled="plansQuery.isFetching.value"
          @click="refreshPlans"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': plansQuery.isFetching.value }" />
          Refresh
        </BaseButton>
        <PermissionGate permission="platform.billing.plan.manage">
          <BaseButton @click="openCreateModal">
            <Plus class="size-4" />
            Create plan
          </BaseButton>
        </PermissionGate>
      </div>
    </PageHeader>

    <div
      v-if="feedback"
      class="rounded-2xl border px-4 py-3 text-sm"
      :class="
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      "
    >
      {{ feedback.message }}
    </div>

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
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          <label class="relative block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search
            </span>
            <Search class="pointer-events-none absolute left-3 top-[42px] size-4 text-gray-400" />
            <input
              v-model="filters.search"
              type="search"
              placeholder="Cari code atau nama plan"
              class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan type
            </span>
            <select
              v-model="filters.type"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="">Semua type</option>
              <option v-for="option in planTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort
            </span>
            <select
              v-model="filters.sort"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="sort_order">Sort order</option>
              <option value="name">Name</option>
              <option value="created_at">Created at</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Direction
            </span>
            <select
              v-model="filters.direction"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        <label class="block xl:w-36">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Per page
          </span>
          <select
            v-model.number="filters.per_page"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>
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
                <th class="px-4 py-3 text-left font-semibold">Type</th>
                <th class="px-4 py-3 text-left font-semibold">Status</th>
                <th class="px-4 py-3 text-left font-semibold">Prices</th>
                <th class="px-4 py-3 text-left font-semibold">Updated</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="plan in plans" :key="plan.id" class="bg-white dark:bg-gray-900">
                <td class="px-4 py-4 align-top">
                  <div class="font-semibold text-gray-900 dark:text-gray-100">{{ plan.name }}</div>
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
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                      :class="statusBadgeClass(plan.is_active)"
                    >
                      {{ plan.is_active ? 'active' : 'inactive' }}
                    </span>
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                      :class="statusBadgeClass(plan.is_public)"
                    >
                      {{ plan.is_public ? 'public' : 'private' }}
                    </span>
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
                  <span v-else class="text-xs text-gray-400">No pricing</span>
                </td>
                <td class="px-4 py-4 align-top text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(plan.updated_at) }}
                </td>
                <td class="px-4 py-4 align-top">
                  <div class="flex justify-end gap-2">
                    <PermissionGate permission="platform.billing.plan.read">
                      <BaseButton variant="secondary" @click="openDetailDrawer(plan)">
                        <Eye class="size-4" />
                        Detail
                      </BaseButton>
                    </PermissionGate>
                    <PermissionGate permission="platform.billing.plan.manage">
                      <BaseButton variant="outline" @click="openEditModal(plan)">
                        <PencilLine class="size-4" />
                        Edit
                      </BaseButton>
                    </PermissionGate>
                    <PermissionGate permission="platform.billing.plan.manage">
                      <BaseButton variant="danger" @click="openDeleteModal(plan)">
                        <Trash2 class="size-4" />
                        Delete
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
        Belum ada billing plan yang cocok dengan filter saat ini.
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
          <BaseButton variant="outline" :disabled="!canGoToPreviousPage" @click="goToPreviousPage">
            Previous
          </BaseButton>
          <BaseButton variant="outline" :disabled="!canGoToNextPage" @click="goToNextPage">
            Next
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseModal
      :open="planModalOpen"
      :title="formMode === 'create' ? 'Create billing plan' : 'Edit billing plan'"
      @close="planModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitPlan">
        <div
          v-if="formError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ formError }}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <TextField
            v-model="planForm.code"
            name="plan-code"
            label="Plan code"
            placeholder="growth"
            :disabled="formMode === 'edit'"
          />
          <TextField
            v-model="planForm.name"
            name="plan-name"
            label="Plan name"
            placeholder="Growth"
          />
        </div>

        <TextField
          v-model="planForm.description"
          name="plan-description"
          label="Description"
          placeholder="Plan untuk tenant dengan kebutuhan growth stage."
        />

        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan type
            </span>
            <select
              v-model="planForm.plan_type"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option v-for="option in planTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <TextField
            v-model="planForm.sort_order"
            name="sort-order"
            label="Sort order"
            type="number"
            placeholder="10"
          />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label
            class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
          >
            <input
              v-model="planForm.is_public"
              type="checkbox"
              class="size-4 rounded border-gray-300"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Public plan</span>
          </label>
          <label
            class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
          >
            <input
              v-model="planForm.is_active"
              type="checkbox"
              class="size-4 rounded border-gray-300"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Active plan</span>
          </label>
        </div>

        <div class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <div class="flex items-center gap-2 text-sm font-semibold text-brand-600">
            <CreditCard class="size-4" />
            Initial Pricing
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Form create hanya mengisi harga default monthly dan yearly. Interval lain bisa ditambah
            atau diedit dari plan detail drawer.
          </p>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <TextField
              v-model="planForm.monthly_amount"
              name="monthly-amount"
              label="Monthly price (IDR)"
              placeholder="199000"
              :disabled="formMode === 'edit'"
            />
            <TextField
              v-model="planForm.yearly_amount"
              name="yearly-amount"
              label="Yearly price (IDR)"
              placeholder="1999000"
              :disabled="formMode === 'edit'"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" @click="planModalOpen = false">Batal</BaseButton>
          <BaseButton
            type="submit"
            :disabled="createPlanMutation.isPending.value || updatePlanMutation.isPending.value"
          >
            <Loader2
              v-if="createPlanMutation.isPending.value || updatePlanMutation.isPending.value"
              class="size-4 animate-spin"
            />
            {{ formMode === 'create' ? 'Create plan' : 'Save changes' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal :open="deleteModalOpen" title="Delete billing plan" @close="deleteModalOpen = false">
      <div class="space-y-4">
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Plan yang dihapus akan hilang dari katalog aktif. Pastikan plan ini memang tidak lagi
          dipakai untuk alur baru.
        </div>
        <div class="flex justify-end gap-3">
          <BaseButton variant="outline" @click="deleteModalOpen = false">Batal</BaseButton>
          <BaseButton
            variant="danger"
            :disabled="deletePlanMutation.isPending.value"
            @click="confirmDelete"
          >
            <Loader2 v-if="deletePlanMutation.isPending.value" class="size-4 animate-spin" />
            Delete plan
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      :open="priceModalOpen"
      :title="priceFormMode === 'create' ? 'Add plan price' : 'Edit plan price'"
      @close="priceModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitPrice">
        <div
          v-if="priceFormError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ priceFormError }}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Billing interval
            </span>
            <select
              v-model="priceForm.billing_interval"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option
                v-for="option in priceIntervalOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <TextField v-model="priceForm.currency" name="price-currency" label="Currency" />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <TextField
            v-model="priceForm.amount"
            name="price-amount"
            label="Amount"
            placeholder="199000"
          />
          <label
            class="mt-7 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
          >
            <input
              v-model="priceForm.is_active"
              type="checkbox"
              class="size-4 rounded border-gray-300"
            />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Active price</span>
          </label>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" @click="priceModalOpen = false">Batal</BaseButton>
          <BaseButton
            type="submit"
            :disabled="
              createPlanPriceMutation.isPending.value || updatePlanPriceMutation.isPending.value
            "
          >
            <Loader2
              v-if="
                createPlanPriceMutation.isPending.value || updatePlanPriceMutation.isPending.value
              "
              class="size-4 animate-spin"
            />
            {{ priceFormMode === 'create' ? 'Add price' : 'Save price' }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :open="priceDeleteModalOpen"
      title="Delete plan price"
      @close="priceDeleteModalOpen = false"
    >
      <div class="space-y-4">
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Price
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
            :disabled="deletePlanPriceMutation.isPending.value"
            @click="confirmDeletePrice"
          >
            <Loader2 v-if="deletePlanPriceMutation.isPending.value" class="size-4 animate-spin" />
            Delete price
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <Teleport to="body">
      <div
        v-if="detailDrawerOpen"
        class="fixed inset-0 z-50 flex bg-gray-900/40 backdrop-blur-sm"
        @click.self="closeDetailDrawer"
      >
        <aside
          class="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-xl dark:bg-gray-950"
        >
          <div
            class="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800"
          >
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                Plan Detail
              </p>
              <h2 class="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ selectedPlan?.name || 'Loading plan...' }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ selectedPlan?.code }} · {{ selectedPlan?.plan_type }}
              </p>
            </div>
            <button
              class="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              @click="closeDetailDrawer"
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
              Overview
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
              Prices
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
              Feature Mapping
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
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Visibility</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                        :class="statusBadgeClass(selectedPlan.is_active)"
                      >
                        {{ selectedPlan.is_active ? 'active' : 'inactive' }}
                      </span>
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                        :class="statusBadgeClass(selectedPlan.is_public)"
                      >
                        {{ selectedPlan.is_public ? 'public' : 'private' }}
                      </span>
                    </div>
                    <p class="mt-5 text-sm text-gray-500">
                      Dibuat {{ formatDate(selectedPlan.created_at) }}
                    </p>
                    <p class="mt-1 text-sm text-gray-500">
                      Diupdate {{ formatDate(selectedPlan.updated_at) }}
                    </p>
                  </BaseCard>

                  <BaseCard>
                    <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Commercial</p>
                    <p class="mt-4 text-sm text-gray-500">
                      Sort order:
                      <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                        selectedPlan.sort_order
                      }}</span>
                    </p>
                    <p class="mt-2 text-sm text-gray-500">
                      Price entries:
                      <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                        selectedPlanPrices.length
                      }}</span>
                    </p>
                    <p class="mt-2 text-sm text-gray-500">
                      Entitlement mappings:
                      <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                        planEntitlements.length
                      }}</span>
                    </p>
                  </BaseCard>
                </div>

                <BaseCard>
                  <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Description</p>
                  <p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {{ selectedPlan.description || 'Belum ada deskripsi plan.' }}
                  </p>
                </BaseCard>

                <BaseCard>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Metadata</p>
                      <p class="mt-2 text-sm text-gray-500">
                        Metadata raw dari backend untuk plan ini.
                      </p>
                    </div>
                    <PermissionGate permission="platform.billing.plan.manage">
                      <BaseButton variant="outline" @click="openEditModal(selectedPlan)">
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
                      <p class="text-xs uppercase tracking-[0.2em] text-gray-400">Plan Prices</p>
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
                        Show deleted
                      </label>
                      <PermissionGate permission="platform.billing.plan_price.manage">
                        <BaseButton @click="openCreatePriceModal">
                          <Plus class="size-4" />
                          Add price
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
                      <div
                        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {{ price.billing_interval }} ·
                            {{ formatCurrency(Number(price.amount), price.currency) }}
                          </p>
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Currency {{ price.currency }} · updated
                            {{ formatDate(price.updated_at) }}
                          </p>
                          <div class="mt-3 flex flex-wrap gap-2">
                            <span
                              class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                              :class="statusBadgeClass(price.is_active)"
                            >
                              {{ price.is_active ? 'active' : 'inactive' }}
                            </span>
                            <span
                              v-if="price.deleted_at"
                              class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                            >
                              deleted
                            </span>
                          </div>
                        </div>

                        <div class="flex gap-2">
                          <PermissionGate permission="platform.billing.plan_price.manage">
                            <BaseButton
                              variant="outline"
                              :disabled="Boolean(price.deleted_at)"
                              @click="openEditPriceModal(price)"
                            >
                              <PencilLine class="size-4" />
                              Edit
                            </BaseButton>
                          </PermissionGate>
                          <PermissionGate permission="platform.billing.plan_price.manage">
                            <BaseButton
                              variant="danger"
                              :disabled="Boolean(price.deleted_at)"
                              @click="openDeletePriceModal(price)"
                            >
                              <Trash2 class="size-4" />
                              Delete
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
                    Belum ada price untuk plan ini.
                  </div>
                </BaseCard>
              </div>

              <div v-else class="space-y-6">
                <BaseCard>
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-xs uppercase tracking-[0.2em] text-gray-400">
                        Feature & Entitlement Mapping
                      </p>
                      <p class="mt-2 text-sm text-gray-500">
                        Mapping feature aktif ke entitlement plan ini. Matikan checkbox jika feature
                        tidak ingin dimasukkan ke paket.
                      </p>
                    </div>
                    <PermissionGate permission="platform.billing.entitlement.manage">
                      <BaseButton
                        :disabled="
                          replaceEntitlementsMutation.isPending.value || !entitlementDrafts.length
                        "
                        @click="saveEntitlements"
                      >
                        <Save class="size-4" />
                        Save mapping
                      </BaseButton>
                    </PermissionGate>
                  </div>

                  <div
                    v-if="entitlementError"
                    class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {{ entitlementError }}
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
                      <div
                        class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
                      >
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
                            Current mapping:
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
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Value boolean
                            </span>
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
                              Limits JSON
                            </span>
                            <textarea
                              v-model="item.limits_text"
                              :disabled="!item.enabled"
                              rows="4"
                              placeholder='{"limit": 5, "value": 5}'
                              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:focus:ring-brand-900"
                            ></textarea>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-else
                    class="mt-5 rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
                  >
                    Feature billing belum tersedia untuk dimapping.
                  </div>
                </BaseCard>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
