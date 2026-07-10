<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { useFieldArray, useForm } from 'vee-validate'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'
import type {
  CreatePlatformBillingPlanPayload,
  PlatformBillingInterval,
  PlatformBillingPlan,
  PlatformBillingPlanType,
  UpdatePlatformBillingPlanPayload,
} from '@/features/billing/api/platform-billing.api'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  planToEdit: PlatformBillingPlan | null
  isSubmitting: boolean
  serverError: string
}>()

const emit = defineEmits<{
  close: []
  create: [payload: CreatePlatformBillingPlanPayload]
  update: [payload: UpdatePlatformBillingPlanPayload]
}>()

const planTypeOptions: Array<{ value: PlatformBillingPlanType; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
]

const priceIntervalOptions: Array<{ value: PlatformBillingInterval; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One time' },
  { value: 'custom', label: 'Custom' },
]

const schema = toTypedSchema(
  z.object({
    code: z
      .string()
      .min(2, 'Kode minimal 2 karakter')
      .regex(/^[a-z0-9_-]+$/i, 'Kode hanya boleh huruf, angka, - dan _'),
    name: z.string().min(2, 'Nama plan minimal 2 karakter'),
    description: z.string().optional().or(z.literal('')),
    plan_type: z.enum(['free', 'trial', 'paid', 'enterprise']),
    sort_order: z.string().regex(/^\d+$/, 'Sort order harus angka bulat positif'),
    is_public: z.boolean(),
    is_active: z.boolean(),
    prices: z
      .array(
        z.object({
          billing_interval: z.enum(['monthly', 'yearly', 'one_time', 'custom']),
          currency: z.string().min(1, 'Wajib diisi'),
          amount: z.string().min(1, 'Wajib diisi'),
          is_active: z.boolean(),
        }),
      )
      .optional()
      .default([]),
  }),
)

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    code: '',
    name: '',
    description: '',
    plan_type: 'paid',
    sort_order: '10',
    is_public: true,
    is_active: true,
    prices: [],
  },
})

const [code, codeAttrs] = defineField('code')
const [name, nameAttrs] = defineField('name')
const [description, descriptionAttrs] = defineField('description')
const [planType] = defineField('plan_type')
const [sortOrder, sortOrderAttrs] = defineField('sort_order')
const [isPublic] = defineField('is_public')
const [isActive] = defineField('is_active')

interface PriceRow {
  billing_interval: PlatformBillingInterval
  currency: string
  amount: string
  is_active: boolean
}

const {
  fields: priceFields,
  push: pushPrice,
  remove: removePrice,
} = useFieldArray<PriceRow>('prices')

const isEdit = computed(() => props.mode === 'edit')

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    if (props.mode === 'edit' && props.planToEdit) {
      const plan = props.planToEdit
      resetForm({
        values: {
          code: plan.code,
          name: plan.name,
          description: plan.description ?? '',
          plan_type: plan.plan_type,
          sort_order: String(plan.sort_order),
          is_public: plan.is_public,
          is_active: plan.is_active,
          prices: [],
        },
      })
    } else {
      resetForm({
        values: {
          code: '',
          name: '',
          description: '',
          plan_type: 'paid',
          sort_order: '10',
          is_public: true,
          is_active: true,
          prices: [],
        },
      })
    }
  },
  { immediate: true },
)

function addPriceRow() {
  pushPrice({ billing_interval: 'monthly', currency: 'IDR', amount: '', is_active: true })
}

function normalizeAmount(value: string) {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric.toFixed(2) : value
}

const onSubmit = handleSubmit((formValues) => {
  if (props.mode === 'create') {
    emit('create', {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      description: formValues.description?.trim() || undefined,
      plan_type: formValues.plan_type,
      is_public: formValues.is_public,
      is_active: formValues.is_active,
      sort_order: Number(formValues.sort_order),
      prices: (formValues.prices ?? []).map((price) => ({
        billing_interval: price.billing_interval,
        currency: price.currency.trim() || 'IDR',
        amount: normalizeAmount(price.amount),
        is_active: price.is_active,
      })),
    })
  } else {
    emit('update', {
      name: formValues.name.trim(),
      description: formValues.description?.trim() || undefined,
      plan_type: formValues.plan_type,
      is_public: formValues.is_public,
      is_active: formValues.is_active,
      sort_order: Number(formValues.sort_order),
    })
  }
})
</script>

<template>
  <BaseModal
    :open="isOpen"
    :title="mode === 'create' ? 'Tambah plan katalog produk' : 'Edit plan katalog produk'"
    @close="emit('close')"
  >
    <form class="space-y-5" @submit.prevent="onSubmit">
      <div
        v-if="serverError"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ serverError }}
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <TextField
          v-model="code"
          v-bind="codeAttrs"
          name="plan-code"
          label="Kode plan"
          placeholder="growth"
          :disabled="isEdit"
          :error="errors.code"
        />
        <TextField
          v-model="name"
          v-bind="nameAttrs"
          name="plan-name"
          label="Nama plan"
          placeholder="Growth"
          :error="errors.name"
        />
      </div>

      <TextField
        v-model="description"
        v-bind="descriptionAttrs"
        name="plan-description"
        label="Deskripsi"
        placeholder="Untuk tenant dengan kebutuhan growth stage."
        :error="errors.description"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipe plan
          </span>
          <select
            v-model="planType"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option v-for="option in planTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <TextField
          v-model="sortOrder"
          v-bind="sortOrderAttrs"
          name="sort-order"
          label="Urutan tampil"
          type="number"
          placeholder="10"
          :error="errors.sort_order"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label
          class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <input v-model="isPublic" type="checkbox" class="size-4 rounded border-gray-300" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
            Publik (tampil di katalog landing page)
          </span>
        </label>
        <label
          class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <input v-model="isActive" type="checkbox" class="size-4 rounded border-gray-300" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
            Aktif (bisa dipakai/dilanggan)
          </span>
        </label>
      </div>

      <div class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Harga awal</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{
                isEdit
                  ? 'Harga plan hanya bisa diubah dari panel detail plan, bukan dari form ini.'
                  : 'Tambahkan satu atau lebih interval harga. Bisa juga dilewati dan ditambah nanti dari panel detail plan.'
              }}
            </p>
          </div>
          <BaseButton v-if="!isEdit" type="button" variant="outline" @click="addPriceRow">
            <Plus class="size-4" />
            Tambah harga
          </BaseButton>
        </div>

        <div v-if="!isEdit && priceFields.length" class="mt-4 space-y-3">
          <div
            v-for="(field, index) in priceFields"
            :key="field.key"
            class="grid gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800 md:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-gray-500">Interval</span>
              <select
                v-model="field.value.billing_interval"
                class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
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
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-gray-500">Mata uang</span>
              <input
                v-model="field.value.currency"
                class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                placeholder="IDR"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-gray-500">Jumlah</span>
              <input
                v-model="field.value.amount"
                class="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                placeholder="199000"
              />
            </label>
            <div class="flex items-end">
              <button
                type="button"
                class="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                @click="removePrice(index)"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>
        <p v-else-if="!isEdit" class="mt-4 text-xs text-gray-400">Belum ada harga ditambahkan.</p>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton type="button" variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          {{ mode === 'create' ? 'Buat plan' : 'Simpan perubahan' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
