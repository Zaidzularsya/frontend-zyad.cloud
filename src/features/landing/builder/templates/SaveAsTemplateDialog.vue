<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { PAGE_TEMPLATE_CATEGORIES } from '@/features/landing/shared/page-template-categories'
import type {
  CreatePageTemplatePayload,
  PageTemplateCategory,
} from '@/features/landing/shared/types/page-template.types'
import {
  slugifyTemplateName,
  validateTemplateMeta,
  type TemplateMetaErrors,
} from './template-admin-logic'

interface SubmitValues {
  name: string
  slug: string
  category: PageTemplateCategory
  description: string
  sort_order: number
  platform_only: boolean
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  initial?: Partial<CreatePageTemplatePayload> & { platform_only?: boolean; locked?: boolean }
  submit: (values: SubmitValues) => Promise<void>
}>()

const emit = defineEmits<{ close: [] }>()

const form = reactive({
  name: '',
  slug: '',
  category: 'bisnis-jasa' as PageTemplateCategory,
  description: '',
  sort_order: 100,
  platform_only: false,
})
const slugTouched = ref(false)
const errors = ref<TemplateMetaErrors>({})
const generalError = ref('')
const saving = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.name = props.initial?.name ?? ''
    form.slug =
      props.initial?.slug ?? (props.initial?.name ? slugifyTemplateName(props.initial.name) : '')
    form.category = props.initial?.category ?? 'bisnis-jasa'
    form.description = props.initial?.description ?? ''
    form.sort_order = props.initial?.sort_order ?? 100
    form.platform_only = props.initial?.platform_only ?? false
    slugTouched.value = !!props.initial?.slug
    errors.value = {}
    generalError.value = ''
  },
  { immediate: true },
)

function onNameInput() {
  if (props.mode === 'create' && !slugTouched.value) form.slug = slugifyTemplateName(form.name)
}

async function onSubmit() {
  if (saving.value) return
  generalError.value = ''
  errors.value = validateTemplateMeta(form)
  // Slug tidak diubah lewat PATCH dan tidak ditampilkan pada mode edit.
  if (props.mode === 'edit') delete errors.value.slug
  if (Object.keys(errors.value).length > 0) return

  saving.value = true
  try {
    await props.submit({ ...form, name: form.name.trim() })
    emit('close')
  } catch (error) {
    const data = (error as { response?: { data?: { code?: string; message?: string } } })?.response
      ?.data
    if (data?.code === 'TEMPLATE_SLUG_TAKEN') {
      errors.value = { slug: 'Slug sudah dipakai template lain.' }
    } else {
      generalError.value = data?.message || 'Gagal menyimpan template.'
    }
  } finally {
    saving.value = false
  }
}

const inputClass =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
</script>

<template>
  <BaseModal
    :open="open"
    :title="mode === 'create' ? 'Simpan sebagai template' : 'Edit template'"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
        Nama
        <input
          v-model="form.name"
          name="name"
          type="text"
          :class="inputClass"
          @input="onNameInput"
        />
        <span v-if="errors.name" class="text-xs font-normal text-red-600">{{ errors.name }}</span>
      </label>

      <label
        v-if="mode === 'create'"
        class="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        Slug
        <input
          v-model="form.slug"
          name="slug"
          type="text"
          :class="inputClass"
          @input="slugTouched = true"
        />
        <span v-if="errors.slug" class="text-xs font-normal text-red-600">{{ errors.slug }}</span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
        Kategori
        <select v-model="form.category" name="category" :class="inputClass">
          <option v-for="c in PAGE_TEMPLATE_CATEGORIES" :key="c.code" :value="c.code">
            {{ c.label }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
        Deskripsi
        <textarea
          v-model="form.description"
          name="description"
          rows="3"
          :class="[inputClass, 'h-auto py-2']"
        ></textarea>
        <span v-if="errors.description" class="text-xs font-normal text-red-600">
          {{ errors.description }}
        </span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
        Urutan
        <input
          v-model.number="form.sort_order"
          name="sort_order"
          type="number"
          :class="inputClass"
        />
        <span v-if="errors.sort_order" class="text-xs font-normal text-red-600">
          {{ errors.sort_order }}
        </span>
      </label>

      <div v-if="mode === 'edit'" class="flex flex-col gap-1">
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <input
            v-model="form.platform_only"
            name="platform_only"
            type="checkbox"
            :checked="initial?.locked || form.platform_only"
            :disabled="initial?.locked"
          />
          Khusus platform
        </label>
        <p v-if="initial?.locked" class="text-xs text-gray-500">
          Terkunci: template memakai Pricing Katalog.
        </p>
      </div>

      <p
        v-if="generalError"
        class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        role="alert"
      >
        {{ generalError }}
      </p>

      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="outline" @click="emit('close')">Batal</BaseButton>
        <BaseButton type="submit" :disabled="saving">
          {{ saving ? 'Menyimpan…' : mode === 'create' ? 'Simpan draft' : 'Simpan' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
