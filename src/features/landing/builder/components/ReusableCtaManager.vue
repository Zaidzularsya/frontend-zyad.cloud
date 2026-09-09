<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Edit3, Loader2, Plus, Save, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import TextField from '@/components/form/TextField.vue'
import { landingApi } from '@/features/landing/shared/api/landing.api'
import type { CallToAction, LandingPage } from '@/features/landing/shared/types/landing.types'

type CTAType = CallToAction['type']

const ctaTypeOptions: Array<{ value: CTAType; label: string }> = [
  { value: 'external_link', label: 'External link' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'internal_page', label: 'Internal page' },
  { value: 'contact_form', label: 'Contact form' },
  { value: 'document_download', label: 'Document download' },
]

const ctas = ref<CallToAction[]>([])
const pages = ref<LandingPage[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formOpen = ref(false)
const editingId = ref('')

const form = reactive({
  name: '',
  label: '',
  type: 'external_link' as CTAType,
  target: 'new_tab' as CallToAction['target'],
  destination: '',
  tracking_key: '',
})

const destinationLabel = computed(() => {
  switch (form.type) {
    case 'whatsapp':
      return 'WhatsApp number (mis. 6281234567890)'
    case 'internal_page':
      return 'Target page'
    case 'contact_form':
      return 'Form key/id'
    case 'document_download':
      return 'Document URL'
    default:
      return 'Destination URL'
  }
})

onMounted(() => {
  void load()
})

function apiMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [ctaRes, pageRes] = await Promise.all([
      landingApi.getCTAs({ per_page: 100 }),
      landingApi.getPages({ per_page: 100, is_template: false }),
    ])
    ctas.value = ctaRes.data
    pages.value = pageRes.data
  } catch (err) {
    error.value = apiMessage(err, 'Gagal memuat daftar CTA.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.name = ''
  form.label = ''
  form.type = 'external_link'
  form.target = 'new_tab'
  form.destination = ''
  form.tracking_key = ''
  formOpen.value = true
}

function openEdit(cta: CallToAction) {
  editingId.value = cta.id
  form.name = cta.name
  form.label = cta.label
  form.type = cta.type
  form.target = cta.target === 'self' ? 'self' : 'new_tab'
  form.destination = cta.destination
  form.tracking_key = cta.tracking_key
  formOpen.value = true
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function save() {
  if (!form.name.trim() || !form.label.trim() || !form.destination.trim()) {
    error.value = 'Name, label, dan destination wajib diisi.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.name.trim(),
      label: form.label.trim(),
      type: form.type,
      target: form.target,
      destination: form.destination.trim(),
      tracking_key: form.tracking_key.trim() || makeSlug(form.name),
    }
    if (editingId.value) await landingApi.updateCTA(editingId.value, payload)
    else await landingApi.createCTA(payload)
    formOpen.value = false
    await load()
  } catch (err) {
    error.value = apiMessage(err, 'Gagal menyimpan CTA.')
  } finally {
    saving.value = false
  }
}

async function remove(cta: CallToAction) {
  if (!window.confirm(`Hapus CTA "${cta.label}"?`)) return
  error.value = ''
  try {
    await landingApi.deleteCTA(cta.id)
    await load()
  } catch (err) {
    error.value = apiMessage(err, 'Gagal menghapus CTA.')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-4">
      <h3 class="font-black text-gray-900 dark:text-white">Reusable CTA</h3>
      <BaseButton type="button" variant="secondary" @click="openCreate">
        <Plus class="size-4" />
        CTA baru
      </BaseButton>
    </div>
    <p class="mt-1 text-sm text-gray-500">
      CTA dengan tracking key, dipakai bersama oleh hero section, navigasi, dan footer.
    </p>

    <p
      v-if="error"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <div
      v-if="formOpen"
      class="mt-4 space-y-3 rounded-xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
    >
      <div class="grid gap-3 md:grid-cols-2">
        <TextField v-model="form.name" name="cta-name" label="Name" placeholder="Primary CTA" />
        <TextField
          v-model="form.label"
          name="cta-label"
          label="Button label"
          placeholder="Get started"
        />
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="block text-sm font-medium">
          Type
          <select
            v-model="form.type"
            class="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option v-for="o in ctaTypeOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="block text-sm font-medium">
          Target
          <select
            v-model="form.target"
            class="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option value="new_tab">New tab</option>
            <option value="self">Same tab</option>
          </select>
        </label>
      </div>
      <label v-if="form.type === 'internal_page'" class="block text-sm font-medium">
        {{ destinationLabel }}
        <select
          v-model="form.destination"
          class="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
        >
          <option value="">Pilih page</option>
          <option v-for="p in pages" :key="p.id" :value="p.slug">
            {{ p.title || p.name }} — /{{ p.slug }}
          </option>
        </select>
      </label>
      <TextField
        v-else
        v-model="form.destination"
        name="cta-destination"
        :label="destinationLabel"
        placeholder="https://… atau 62812…"
      />
      <TextField
        v-model="form.tracking_key"
        name="cta-tracking-key"
        label="Tracking key"
        placeholder="(auto dari name jika kosong)"
      />
      <div class="flex gap-2">
        <BaseButton type="button" :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="size-4 animate-spin" />
          <Save v-else class="size-4" />
          {{ editingId ? 'Update CTA' : 'Buat CTA' }}
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="formOpen = false">Batal</BaseButton>
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <div
        v-for="cta in ctas"
        :key="cta.id"
        class="flex items-center justify-between rounded-xl border px-4 py-3 dark:border-gray-800"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{ cta.label }}
            <span
              class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800"
            >
              {{ cta.type }}
            </span>
          </p>
          <p class="mt-1 truncate text-xs text-gray-500">
            {{ cta.destination }} · key: {{ cta.tracking_key }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit"
            @click="openEdit(cta)"
          >
            <Edit3 class="size-4" />
          </button>
          <button
            type="button"
            class="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            title="Hapus"
            @click="remove(cta)"
          >
            <Trash2 class="size-4" />
          </button>
        </div>
      </div>
      <p
        v-if="!loading && ctas.length === 0"
        class="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 dark:border-gray-800"
      >
        Belum ada CTA.
      </p>
    </div>
  </div>
</template>
