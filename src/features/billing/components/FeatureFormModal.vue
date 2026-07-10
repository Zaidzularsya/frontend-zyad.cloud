<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { z } from 'zod'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import TextField from '@/components/form/TextField.vue'
import type {
  CreatePlatformBillingFeaturePayload,
  PlatformBillingFeature,
  PlatformBillingFeatureValueType,
  PlatformBillingResetStrategy,
  UpdatePlatformBillingFeaturePayload,
} from '@/features/billing/api/platform-billing.api'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  featureToEdit: PlatformBillingFeature | null
  isSubmitting: boolean
  serverError: string
}>()

const emit = defineEmits<{
  close: []
  create: [payload: CreatePlatformBillingFeaturePayload]
  update: [payload: UpdatePlatformBillingFeaturePayload]
}>()

const valueTypeOptions: Array<{ value: PlatformBillingFeatureValueType; label: string }> = [
  { value: 'boolean', label: 'Boolean (on/off)' },
  { value: 'integer', label: 'Integer (angka bulat)' },
  { value: 'decimal', label: 'Decimal (angka desimal)' },
  { value: 'string', label: 'String (teks bebas)' },
]

const resetStrategyOptions: Array<{ value: PlatformBillingResetStrategy; label: string }> = [
  { value: 'never', label: 'Tidak pernah reset' },
  { value: 'monthly', label: 'Reset bulanan' },
  { value: 'yearly', label: 'Reset tahunan' },
  { value: 'custom', label: 'Custom' },
]

const schema = toTypedSchema(
  z.object({
    feature_key: z
      .string()
      .min(2, 'Feature key minimal 2 karakter')
      .regex(/^[a-z0-9._-]+$/i, 'Hanya huruf, angka, titik, - dan _'),
    module: z.string().min(1, 'Module wajib diisi'),
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    description: z.string().optional().or(z.literal('')),
    value_type: z.enum(['boolean', 'integer', 'decimal', 'string']),
    unit: z.string().optional().or(z.literal('')),
    reset_strategy: z.enum(['never', 'monthly', 'yearly', 'custom']),
    is_active: z.boolean(),
  }),
)

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    feature_key: '',
    module: '',
    name: '',
    description: '',
    value_type: 'boolean',
    unit: '',
    reset_strategy: 'never',
    is_active: true,
  },
})

const [featureKey, featureKeyAttrs] = defineField('feature_key')
const [featureModule, featureModuleAttrs] = defineField('module')
const [name, nameAttrs] = defineField('name')
const [description, descriptionAttrs] = defineField('description')
const [valueType] = defineField('value_type')
const [unit, unitAttrs] = defineField('unit')
const [resetStrategy] = defineField('reset_strategy')
const [isActive] = defineField('is_active')

const isEdit = computed(() => props.mode === 'edit')

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    if (props.mode === 'edit' && props.featureToEdit) {
      const feature = props.featureToEdit
      resetForm({
        values: {
          feature_key: feature.feature_key,
          module: feature.module,
          name: feature.name,
          description: feature.description ?? '',
          value_type: feature.value_type,
          unit: feature.unit ?? '',
          reset_strategy: feature.reset_strategy,
          is_active: feature.is_active,
        },
      })
    } else {
      resetForm({
        values: {
          feature_key: '',
          module: '',
          name: '',
          description: '',
          value_type: 'boolean',
          unit: '',
          reset_strategy: 'never',
          is_active: true,
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit((formValues) => {
  if (props.mode === 'create') {
    emit('create', {
      feature_key: formValues.feature_key.trim(),
      module: formValues.module.trim(),
      name: formValues.name.trim(),
      description: formValues.description?.trim() || undefined,
      value_type: formValues.value_type,
      unit: formValues.unit?.trim() || undefined,
      reset_strategy: formValues.reset_strategy,
      is_active: formValues.is_active,
    })
  } else {
    emit('update', {
      module: formValues.module.trim(),
      name: formValues.name.trim(),
      description: formValues.description?.trim() || undefined,
      value_type: formValues.value_type,
      unit: formValues.unit?.trim() || undefined,
      reset_strategy: formValues.reset_strategy,
      is_active: formValues.is_active,
    })
  }
})
</script>

<template>
  <BaseModal
    :open="isOpen"
    :title="mode === 'create' ? 'Tambah feature katalog' : 'Edit feature katalog'"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div
        v-if="serverError"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ serverError }}
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <TextField
          v-model="featureKey"
          v-bind="featureKeyAttrs"
          name="feature-key"
          label="Feature key"
          placeholder="landing.max_pages"
          :disabled="isEdit"
          :error="errors.feature_key"
        />
        <TextField
          v-model="featureModule"
          v-bind="featureModuleAttrs"
          name="feature-module"
          label="Module"
          placeholder="landing"
          :error="errors.module"
        />
      </div>

      <TextField
        v-model="name"
        v-bind="nameAttrs"
        name="feature-name"
        label="Nama feature"
        placeholder="Maksimal halaman landing page"
        :error="errors.name"
      />

      <TextField
        v-model="description"
        v-bind="descriptionAttrs"
        name="feature-description"
        label="Deskripsi"
        placeholder="Batas jumlah halaman landing page yang bisa dibuat."
        :error="errors.description"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipe nilai
          </span>
          <select
            v-model="valueType"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option v-for="option in valueTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <TextField
          v-model="unit"
          v-bind="unitAttrs"
          name="feature-unit"
          label="Satuan (opsional)"
          placeholder="pages, GB, users"
          :error="errors.unit"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Strategi reset
          </span>
          <select
            v-model="resetStrategy"
            class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <option
              v-for="option in resetStrategyOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label
          class="mt-7 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <input v-model="isActive" type="checkbox" class="size-4 rounded border-gray-300" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Feature aktif</span>
        </label>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton type="button" variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
          {{ mode === 'create' ? 'Tambah feature' : 'Simpan feature' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
