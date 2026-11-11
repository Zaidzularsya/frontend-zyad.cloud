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
import { DEFAULT_POOL_CIDR, poolCidrError } from '@/features/mikrotik/utils/cidr'
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

const form = reactive({
  pool_cidr: DEFAULT_POOL_CIDR,
  profile_name: '',
  rate_limit: '',
  redirect_url: '',
})

// Pre-fill from the last applied setup so reopening the wizard never asks for retyping.
function resetForm() {
  const saved = props.router.setup
  form.pool_cidr = saved?.pool_cidr || DEFAULT_POOL_CIDR
  form.profile_name = saved?.profile_name ?? ''
  form.rate_limit = saved?.rate_limit ?? ''
  form.redirect_url = saved?.redirect_url ?? ''
}

const poolError = computed(() => poolCidrError(form.pool_cidr))

function buildPayload(): SetupPayload {
  const payload: SetupPayload = {}
  for (const key of ['profile_name', 'pool_cidr', 'rate_limit', 'redirect_url'] as const) {
    const value = form[key].trim()
    if (value) payload[key] = value
  }
  return payload
}

async function loadPreview() {
  errorMessage.value = ''
  if (poolError.value) {
    plan.value = null
    return
  }
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
    resetForm()
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

// Input bisa berubah setelah pratinjau; apply hanya valid untuk payload yang dipratinjau.
const stale = computed(
  () => JSON.stringify(buildPayload()) !== JSON.stringify(previewedPayload.value),
)

const busy = computed(() => previewMutation.isPending.value || applyMutation.isPending.value)

async function apply() {
  if (!plan.value || busy.value || stale.value || poolError.value) return
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
      <div>
        <TextField v-model="form.pool_cidr" name="pool_cidr" label="Pool CIDR" :error="poolError" />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Rentang IP sementara untuk pelanggan terisolir. Aman dibiarkan default.
        </p>
      </div>

      <details class="rounded-lg border p-3 text-sm">
        <summary class="cursor-pointer font-medium">Pengaturan lanjutan (opsional)</summary>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField v-model="form.profile_name" name="profile_name" label="Nama profile" />
          <TextField v-model="form.rate_limit" name="rate_limit" label="Rate limit" />
          <TextField v-model="form.redirect_url" name="redirect_url" label="URL redirect" />
        </div>
      </details>

      <div>
        <BaseButton variant="outline" :disabled="busy" @click="loadPreview">
          Pratinjau ulang
        </BaseButton>
      </div>

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
      <p
        v-if="plan && stale && !poolError"
        class="text-sm text-amber-700 dark:text-amber-300"
        role="status"
      >
        Pratinjau ulang dulu — pengaturan berubah sejak pratinjau.
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400" role="alert">
        {{ errorMessage }}
      </p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BaseButton variant="outline" @click="$emit('close')">Tutup</BaseButton>
        <BaseButton :disabled="!plan || busy || stale || !!poolError" @click="apply">
          {{ applyMutation.isPending.value ? 'Menerapkan… (bisa sampai 1 menit)' : 'Terapkan' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
