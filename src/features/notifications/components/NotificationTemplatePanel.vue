<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PenLine, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
  useCreateNotificationTemplateMutation,
  useDeleteNotificationTemplateMutation,
  useNotificationTemplatesQuery,
  usePreviewNotificationTemplateMutation,
  useUpdateNotificationTemplateMutation,
} from '@/features/notifications/api/notifications.queries'
import type {
  CreateNotificationTemplatePayload,
  NotificationChannel,
  NotificationTemplateResponse,
  NotificationTemplateStatus,
  NotificationTemplateVariable,
  UpdateNotificationTemplatePayload,
} from '@/features/notifications/api/notifications.api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

type TemplateMode = 'create' | 'edit'

const pageSize = ref(10)
const offset = ref(0)
const search = ref('')
const channelFilter = ref<'all' | NotificationChannel>('all')
const statusFilter = ref<'all' | NotificationTemplateStatus>('all')
const activeOnly = ref(false)
const mode = ref<TemplateMode>('create')
const selectedTemplateId = ref('')
const formError = ref('')
const previewError = ref('')
const previewResult = ref<{ subject?: string; body: string } | null>(null)

const code = ref('')
const name = ref('')
const channel = ref<NotificationChannel>('email')
const locale = ref('')
const description = ref('')
const subjectTemplate = ref('')
const bodyTemplate = ref('')
const availableVariablesText = ref('[]')
const samplePayloadText = ref('{}')
const isSystem = ref(false)
const isActive = ref(true)
const previewPayloadText = ref('{}')
const previewLocale = ref('')
const auth = useAuthStore()

const listParams = computed(() => ({
  limit: pageSize.value,
  offset: offset.value,
  code: search.value.trim() || undefined,
  channel: channelFilter.value === 'all' ? undefined : channelFilter.value,
  locale: undefined,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  is_active: activeOnly.value ? true : undefined,
}))

const templatesQuery = useNotificationTemplatesQuery(listParams)
const createTemplateMut = useCreateNotificationTemplateMutation()
const updateTemplateMut = useUpdateNotificationTemplateMutation()
const deleteTemplateMut = useDeleteNotificationTemplateMutation()
const previewTemplateMut = usePreviewNotificationTemplateMutation()

const templates = computed(() => templatesQuery.data.value?.data ?? [])
const meta = computed(() => templatesQuery.data.value?.meta)
const selectedTemplate = computed<NotificationTemplateResponse | null>(() => {
  if (!selectedTemplateId.value) return null
  return templates.value.find((template) => template.id === selectedTemplateId.value) ?? null
})
const hasMore = computed(() => (meta.value?.count ?? 0) >= pageSize.value)

const filteredTemplates = computed(() => {
  const term = search.value.trim().toLowerCase()
  return templates.value.filter((template) => {
    const matchesTerm =
      !term ||
      template.code.toLowerCase().includes(term) ||
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.channel.toLowerCase().includes(term) ||
      template.locale.toLowerCase().includes(term)
    return matchesTerm
  })
})

function resetForm() {
  mode.value = 'create'
  selectedTemplateId.value = ''
  code.value = ''
  name.value = ''
  channel.value = 'email'
  locale.value = ''
  description.value = ''
  subjectTemplate.value = ''
  bodyTemplate.value = ''
  availableVariablesText.value = '[]'
  samplePayloadText.value = '{}'
  isSystem.value = false
  isActive.value = true
  previewPayloadText.value = '{}'
  previewLocale.value = ''
  previewResult.value = null
  previewError.value = ''
  formError.value = ''
}

function selectTemplate(template: NotificationTemplateResponse) {
  mode.value = 'edit'
  selectedTemplateId.value = template.id
  code.value = template.code
  name.value = template.name
  channel.value = template.channel
  locale.value = template.locale
  description.value = template.description || ''
  subjectTemplate.value = template.subject_template || ''
  bodyTemplate.value = template.body_template || ''
  availableVariablesText.value = JSON.stringify(template.available_variables ?? [], null, 2)
  samplePayloadText.value = JSON.stringify(template.sample_payload ?? {}, null, 2)
  isSystem.value = template.is_system
  isActive.value = template.is_active
  previewPayloadText.value = JSON.stringify(template.sample_payload ?? {}, null, 2)
  previewLocale.value = template.locale || ''
  previewResult.value = null
  previewError.value = ''
  formError.value = ''
}

function parseJson<T>(value: string, fallback: T, label: string): T {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${label} harus valid JSON.`)
  }
}

watch(
  templates,
  (items) => {
    if (!items.length) {
      resetForm()
      return
    }
    const first = items[0]
    if (!first) {
      resetForm()
      return
    }
    if (!selectedTemplateId.value) {
      selectTemplate(first)
      return
    }
    if (!items.some((item) => item.id === selectedTemplateId.value)) {
      selectTemplate(first)
    }
  },
  { immediate: true },
)

watch([search, channelFilter, statusFilter, activeOnly, pageSize], () => {
  offset.value = 0
})

async function saveTemplate() {
  formError.value = ''
  try {
    const availableVariables = parseJson<NotificationTemplateVariable[]>(
      availableVariablesText.value,
      [],
      'Available variables',
    )
    const samplePayload = parseJson<Record<string, unknown>>(
      samplePayloadText.value,
      {},
      'Sample payload',
    )
    const basePayload = {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      channel: channel.value,
      locale: locale.value.trim() || undefined,
      subject_template: subjectTemplate.value.trim() || undefined,
      body_template: bodyTemplate.value,
      available_variables: availableVariables,
      sample_payload: samplePayload,
    }

    if (mode.value === 'create') {
      if (!code.value.trim()) throw new Error('Code wajib diisi.')
      const payload: CreateNotificationTemplatePayload = {
        code: code.value.trim(),
        ...basePayload,
        is_system: isSystem.value,
        is_active: isActive.value,
      }
      await createTemplateMut.mutateAsync(payload)
      resetForm()
      await templatesQuery.refetch()
      return
    }

    if (!selectedTemplate.value) throw new Error('Template belum dipilih.')
    const payload: UpdateNotificationTemplatePayload = {
      ...basePayload,
      is_active: isActive.value,
    }
    await updateTemplateMut.mutateAsync({ id: selectedTemplate.value.id, payload })
    await templatesQuery.refetch()
  } catch (error) {
    console.error(error)
    formError.value = error instanceof Error ? error.message : 'Gagal menyimpan template.'
  }
}

async function deleteTemplate() {
  if (!selectedTemplate.value) return
  if (!confirm(`Hapus template "${selectedTemplate.value.name}"?`)) return
  formError.value = ''
  try {
    await deleteTemplateMut.mutateAsync(selectedTemplate.value.id)
    resetForm()
    await templatesQuery.refetch()
  } catch (error) {
    console.error(error)
    formError.value = 'Gagal menghapus template.'
  }
}

async function previewTemplate() {
  if (!selectedTemplate.value) return
  previewError.value = ''
  try {
    const payload = parseJson<Record<string, unknown>>(
      previewPayloadText.value,
      {},
      'Preview payload',
    )
    const rendered = await previewTemplateMut.mutateAsync({
      id: selectedTemplate.value.id,
      payload: {
        payload,
        locale: previewLocale.value.trim() || undefined,
      },
    })
    previewResult.value = {
      subject: rendered.subject,
      body: rendered.body,
    }
  } catch (error) {
    console.error(error)
    previewError.value = error instanceof Error ? error.message : 'Gagal melakukan preview.'
  }
}

function changeOffset(delta: number) {
  const next = offset.value + delta
  if (next < 0) return
  if (next > offset.value && !hasMore.value) return
  offset.value = next
}

function tone(status: string) {
  if (status === 'active')
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
  if (status === 'inactive')
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
  if (status === 'archived') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    <BaseCard class="!p-0">
      <div class="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Notification templates</h2>
          <p class="text-sm text-gray-500">
            Manage code, content, channel, active state, and preview render tanpa modal dialog.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative w-full sm:w-64">
            <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="search"
              type="search"
              placeholder="Cari code, name, locale..."
              class="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            />
          </label>
          <select
            v-model="channelFilter"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 sm:w-40"
          >
            <option value="all">Semua channel</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-app</option>
            <option value="discord">Discord</option>
          </select>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950 sm:w-40"
          >
            <option value="all">Semua status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <BaseButton variant="secondary" @click="resetForm">
            <Plus class="size-4" /> New
          </BaseButton>
        </div>
      </div>

      <div
        v-if="templatesQuery.isPending.value"
        class="min-h-[540px] p-12 text-center text-sm text-gray-500"
      >
        Memuat template...
      </div>
      <div v-else-if="templatesQuery.isError.value" class="min-h-[540px] p-12 text-center">
        <p class="font-semibold text-red-700">Template gagal dimuat.</p>
        <button class="mt-2 text-sm font-medium text-brand-600" @click="templatesQuery.refetch()">
          Coba lagi
        </button>
      </div>
      <div v-else class="min-h-[540px] p-5">
        <div class="grid gap-3">
          <article
            v-for="template in filteredTemplates"
            :key="template.id"
            class="cursor-pointer rounded-2xl border p-4 transition hover:border-brand-300 hover:bg-brand-50/30 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
            :class="
              selectedTemplateId === template.id
                ? 'border-brand-300 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-950/30'
                : 'bg-gray-50 dark:bg-gray-900'
            "
            @click="selectTemplate(template)"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-semibold">{{ template.name }}</h3>
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="tone(template.status)"
                  >
                    {{ template.status }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  {{ template.code }} · {{ template.channel }} · locale {{ template.locale || '-' }}
                </p>
                <p
                  v-if="template.description"
                  class="mt-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  {{ template.description }}
                </p>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span
                  class="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-200 dark:bg-gray-950 dark:ring-gray-800"
                >
                  v{{ template.version }}
                </span>
                <span
                  v-if="template.is_system"
                  class="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700"
                >
                  system
                </span>
                <span
                  v-if="!template.is_active"
                  class="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700"
                >
                  hidden
                </span>
              </div>
            </div>
          </article>

          <div
            v-if="!filteredTemplates.length"
            class="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500"
          >
            Tidak ada template yang cocok dengan filter.
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">
          Menampilkan {{ filteredTemplates.length }} item pada offset {{ meta?.offset ?? 0 }}.
        </p>
        <div class="flex items-center gap-2">
          <select
            v-model="pageSize"
            class="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          >
            <option :value="5">5 / halaman</option>
            <option :value="10">10 / halaman</option>
            <option :value="20">20 / halaman</option>
          </select>
          <BaseButton variant="secondary" :disabled="offset <= 0" @click="changeOffset(-pageSize)">
            Sebelumnya
          </BaseButton>
          <BaseButton variant="secondary" :disabled="!hasMore" @click="changeOffset(pageSize)">
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <BaseCard class="sticky top-6 space-y-4 self-start">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">
            {{ mode === 'create' ? 'Create template' : 'Edit template' }}
          </h2>
          <p class="text-sm text-gray-500">
            {{ mode === 'create' ? 'Buat template baru.' : 'Edit template yang dipilih.' }}
          </p>
        </div>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="mode === 'create' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-700'"
        >
          {{ mode === 'create' ? 'New' : 'Selected' }}
        </span>
      </div>

      <div class="space-y-4">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Code</span
          >
          <input
            v-model="code"
            :disabled="mode === 'edit'"
            type="text"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 dark:bg-gray-950 dark:disabled:bg-gray-900"
            placeholder="auth.password_reset"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Name</span
          >
          <input
            v-model="name"
            type="text"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            placeholder="Password Reset"
          />
        </label>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Channel</span
            >
            <select
              v-model="channel"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="in_app">In-app</option>
              <option value="discord">Discord</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Locale</span
            >
            <input
              v-model="locale"
              type="text"
              class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
              placeholder="id-ID"
            />
          </label>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Description</span
          >
          <textarea
            v-model="description"
            rows="3"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            placeholder="Jelaskan fungsi template..."
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Subject template</span
          >
          <input
            v-model="subjectTemplate"
            type="text"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            placeholder="Reset password untuk {{ name }}"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >Body template</span
          >
          <textarea
            v-model="bodyTemplate"
            rows="8"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            placeholder="Halo {{ name }}, ..."
          />
        </label>

        <details class="rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
          <summary class="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Advanced JSON
          </summary>
          <div class="mt-4 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium text-gray-500"
                >available_variables</span
              >
              <textarea
                v-model="availableVariablesText"
                rows="6"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                placeholder="[]"
              />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium text-gray-500">sample_payload</span>
              <textarea
                v-model="samplePayloadText"
                rows="6"
                class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
                placeholder="{}"
              />
            </label>
          </div>
        </details>

        <div class="flex flex-wrap gap-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
          <label class="flex items-center gap-2 text-sm">
            <input v-model="isActive" type="checkbox" class="rounded border-gray-300" />
            Active
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="isSystem" type="checkbox" class="rounded border-gray-300" />
            System template
          </label>
        </div>

        <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </p>

        <div class="flex flex-wrap gap-3">
          <BaseButton
            v-if="mode === 'create' && auth.can('notification_template.create')"
            class="flex-1 justify-center"
            :disabled="createTemplateMut.isPending.value || updateTemplateMut.isPending.value"
            @click="saveTemplate"
          >
            <RefreshCw
              v-if="createTemplateMut.isPending.value || updateTemplateMut.isPending.value"
              class="size-4 animate-spin"
            />
            <Plus class="size-4" />
            {{ createTemplateMut.isPending.value ? 'Menyimpan...' : 'Create' }}
          </BaseButton>
          <BaseButton
            v-else-if="mode === 'edit' && auth.can('notification_template.update')"
            class="flex-1 justify-center"
            :disabled="createTemplateMut.isPending.value || updateTemplateMut.isPending.value"
            @click="saveTemplate"
          >
            <RefreshCw
              v-if="createTemplateMut.isPending.value || updateTemplateMut.isPending.value"
              class="size-4 animate-spin"
            />
            <PenLine class="size-4" />
            {{ updateTemplateMut.isPending.value ? 'Menyimpan...' : 'Save' }}
          </BaseButton>
          <BaseButton v-else class="flex-1 justify-center" variant="secondary" disabled>
            Tidak ada izin
          </BaseButton>
          <BaseButton variant="secondary" class="flex-1 justify-center" @click="resetForm">
            Reset
          </BaseButton>
          <BaseButton
            v-if="selectedTemplate && auth.can('notification_template.delete')"
            variant="danger"
            class="w-full justify-center"
            :disabled="deleteTemplateMut.isPending.value"
            @click="deleteTemplate"
          >
            <Trash2 class="size-4" />
            Delete
          </BaseButton>
        </div>
      </div>

      <div
        v-if="selectedTemplate"
        class="space-y-4 rounded-xl border bg-gray-50 p-4 text-sm dark:bg-gray-900"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wider text-gray-500">Selected template</p>
            <p class="font-semibold">{{ selectedTemplate.code }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="tone(selectedTemplate.status)"
          >
            {{ selectedTemplate.status }}
          </span>
        </div>
        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500">Version</span>
            <span class="font-medium">{{ selectedTemplate.version }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500">Updated</span>
            <span class="font-medium">{{ formatDate(selectedTemplate.updated_at) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500">Active</span>
            <span class="font-medium">{{ selectedTemplate.is_active ? 'Yes' : 'No' }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wider text-gray-500">Preview</p>
            <p class="font-semibold">Render test</p>
          </div>
          <BaseButton
            v-if="auth.can('notification_template.preview')"
            variant="secondary"
            :disabled="!selectedTemplate || previewTemplateMut.isPending.value"
            @click="previewTemplate"
          >
            <Sparkles class="size-4" />
            {{ previewTemplateMut.isPending.value ? 'Rendering...' : 'Preview' }}
          </BaseButton>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-gray-500">Locale</span>
          <input
            v-model="previewLocale"
            type="text"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
            placeholder="id-ID"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-medium text-gray-500">Payload JSON</span>
          <textarea
            v-model="previewPayloadText"
            rows="6"
            class="w-full rounded-lg border bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-brand-500 dark:bg-gray-950"
          />
        </label>

        <p v-if="previewError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ previewError }}
        </p>

        <div v-if="previewResult" class="space-y-3 rounded-xl border bg-white p-4 dark:bg-gray-950">
          <div v-if="previewResult.subject" class="space-y-1">
            <p class="text-xs uppercase tracking-wider text-gray-500">Subject</p>
            <p class="font-medium">{{ previewResult.subject }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-wider text-gray-500">Body</p>
            <pre class="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{{
              previewResult.body
            }}</pre>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
