<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import TextField from '@/components/form/TextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import {
  useSetupApplyMutation,
  useSetupPreviewMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import type { Router, SetupAction, SetupPayload, SetupPlan } from '@/features/mikrotik/types'
import { apiErrorCode, routerActionError } from '@/features/mikrotik/utils/errors'

const props = defineProps<{ open: boolean; router: Router }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'applied', router: Router): void }>()

const previewMutation = useSetupPreviewMutation()
const applyMutation = useSetupApplyMutation()

const plan = ref<SetupPlan | null>(null)
// Payload yang dipakai preview terakhir; apply wajib memakai yang sama persis agar hash cocok.
const previewedPayload = ref<SetupPayload>({})
const errorMessage = ref('')
const notice = ref('')

const advanced = reactive({
  profile_name: '',
  pool_cidr: '',
  rate_limit: '',
  platform_host: '',
  tenant_isolir_host: '',
  doku_hosts: '',
  redirect_url: '',
})

function buildPayload(): SetupPayload {
  const payload: SetupPayload = {}
  const text = [
    'profile_name',
    'pool_cidr',
    'rate_limit',
    'platform_host',
    'tenant_isolir_host',
    'redirect_url',
  ] as const
  for (const key of text) {
    const value = advanced[key].trim()
    if (value) payload[key] = value
  }
  const hosts = advanced.doku_hosts
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  if (hosts.length) payload.doku_hosts = hosts
  return payload
}

async function loadPreview() {
  errorMessage.value = ''
  const payload = buildPayload()
  try {
    plan.value = await previewMutation.mutateAsync({ routerId: props.router.id, payload })
    previewedPayload.value = payload
  } catch (error) {
    plan.value = null
    errorMessage.value = routerActionError(error)
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    notice.value = ''
    plan.value = null
    void loadPreview()
  },
  { immediate: true },
)

const KIND_SUMMARY: Record<string, string> = {
  create: 'Objek ini akan dibuat di router.',
  update: 'Objek ini sudah ada dan akan diperbarui.',
  exists: 'Objek ini sudah sesuai; tidak ada perubahan.',
}
const kindSummary = (kind: string) => KIND_SUMMARY[kind] ?? 'Langkah setup di router.'

const pairs = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
const line = (a: SetupAction) =>
  [a.kind, a.path, pairs(a.match ?? {}), pairs(a.attrs ?? {})].filter(Boolean).join('  ')

const busy = computed(() => previewMutation.isPending.value || applyMutation.isPending.value)

async function apply() {
  if (!plan.value || busy.value) return
  errorMessage.value = ''
  try {
    const router = await applyMutation.mutateAsync({
      routerId: props.router.id,
      payload: { ...previewedPayload.value, plan_hash: plan.value.hash },
    })
    emit('applied', router)
  } catch (error) {
    if (apiErrorCode(error) === 'MIKROTIK_SETUP_PLAN_CHANGED') {
      await loadPreview()
      notice.value =
        'Rencana berubah sejak pratinjau sebelumnya. Pratinjau sudah dimuat ulang; periksa lalu terapkan lagi.'
      return
    }
    errorMessage.value = routerActionError(error)
  }
}
</script>

<template>
  <BaseModal :open="open" :title="`Setup isolir: ${router.name}`" @close="$emit('close')">
    <div class="space-y-4">
      <details class="rounded-lg border p-3 text-sm">
        <summary class="cursor-pointer font-medium">Pengaturan lanjutan (opsional)</summary>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField v-model="advanced.profile_name" name="profile_name" label="Nama profile" />
          <TextField v-model="advanced.pool_cidr" name="pool_cidr" label="Pool CIDR" />
          <TextField v-model="advanced.rate_limit" name="rate_limit" label="Rate limit" />
          <TextField v-model="advanced.platform_host" name="platform_host" label="Host platform" />
          <TextField
            v-model="advanced.tenant_isolir_host"
            name="tenant_isolir_host"
            label="Host isolir tenant"
          />
          <TextField
            v-model="advanced.doku_hosts"
            name="doku_hosts"
            label="Host DOKU (pisah koma)"
          />
          <TextField v-model="advanced.redirect_url" name="redirect_url" label="URL redirect" />
        </div>
        <div class="mt-3">
          <BaseButton variant="outline" :disabled="busy" @click="loadPreview">
            Pratinjau ulang
          </BaseButton>
        </div>
      </details>

      <p v-if="previewMutation.isPending.value" class="text-sm text-gray-500">
        Membaca state router...
      </p>

      <ul v-if="plan" class="max-h-96 space-y-2 overflow-auto" data-testid="plan-actions">
        <li
          v-for="(action, i) in plan.actions"
          :key="i"
          class="rounded-lg border p-2 text-sm"
          :class="action.optional ? 'border-dashed' : ''"
        >
          <p class="font-mono text-xs break-all">{{ line(action) }}</p>
          <p class="mt-1 text-gray-600 dark:text-gray-300">
            {{ kindSummary(action.kind) }}
            <span v-if="action.optional" class="text-gray-500">(opsional)</span>
            <span v-if="action.note" class="text-gray-500"> {{ action.note }}</span>
          </p>
        </li>
        <li v-if="!plan.actions.length" class="text-sm text-gray-500">Tidak ada langkah.</li>
      </ul>

      <p
        v-if="notice"
        class="rounded-lg bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        {{ notice }}
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="$emit('close')">Tutup</BaseButton>
        <BaseButton :disabled="!plan || busy" @click="apply">
          {{ applyMutation.isPending.value ? 'Menerapkan...' : 'Terapkan' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
