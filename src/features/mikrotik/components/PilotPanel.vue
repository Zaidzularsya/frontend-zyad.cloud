<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import {
  useAddPilotMutation,
  usePilotQuery,
  useRemovePilotMutation,
  useStartPilotTestMutation,
  useStopPilotTestMutation,
  useTasksQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import AccountPicker from '@/features/mikrotik/components/AccountPicker.vue'
import type { AccountRef, ControlState, IsolationTask } from '@/features/mikrotik/types'
import { CONTROL_OWNER_ONLY_TOOLTIP } from '@/features/mikrotik/utils/control-permissions'
import { controlActionError, taskErrorAction } from '@/features/mikrotik/utils/errors'

const props = defineProps<{ control: ControlState; canUpdate: boolean }>()

const ENGINE_OFF_TOOLTIP = 'Mesin isolir dinonaktifkan operator'
const POLL_MS = 3000

const toast = useToast()
const pilotQuery = usePilotQuery()
const accounts = computed(() => pilotQuery.data.value ?? [])

const addMutation = useAddPilotMutation()
const removeMutation = useRemovePilotMutation()
const startMutation = useStartPilotTestMutation()
const stopMutation = useStopPilotTestMutation()

const picking = ref(false)
const errorText = ref('')

const canTest = computed(() => props.control.mode === 'pilot' && props.control.engine === 'on')

// Tooltip kontrol nonaktif: izin dulu, lalu mesin.
const testHint = computed(() => {
  if (!props.canUpdate) return CONTROL_OWNER_ONLY_TOOLTIP
  if (props.control.engine !== 'on') return ENGINE_OFF_TOOLTIP
  return undefined
})

// Status tugas isolir diambil dari daftar tugas; polling hanya selama ada uji berjalan.
const tasksQuery = useTasksQuery(ref({ limit: 50 }))
const hasActiveTest = computed(() => accounts.value.some((a) => a.test_active))
let timer: ReturnType<typeof setInterval> | undefined
watch(
  hasActiveTest,
  (active) => {
    clearInterval(timer)
    timer = active ? setInterval(() => void tasksQuery.refetch(), POLL_MS) : undefined
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(timer))

const STATUS_TEXT: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  done: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

function latestTask(accountId: string): IsolationTask | undefined {
  const list = tasksQuery.data.value?.data ?? []
  return list
    .filter((t) => t.account.id === accountId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

function taskLine(accountId: string): string {
  const t = latestTask(accountId)
  if (!t) return ''
  const status = STATUS_TEXT[t.status] ?? t.status
  if (t.status === 'failed')
    return `Tugas isolir: ${status}. ${taskErrorAction(t.last_error_code).message}`
  return `Tugas isolir: ${status}`
}

async function run(action: () => Promise<unknown>, success?: string) {
  errorText.value = ''
  try {
    await action()
    if (success) toast.success(success)
  } catch (error) {
    errorText.value = controlActionError(error)
  }
}

async function onPick(account: AccountRef) {
  picking.value = false
  await run(
    () => addMutation.mutateAsync(account.id),
    `${account.name} ditambahkan ke daftar pilot.`,
  )
}
const startTest = (id: string) =>
  run(() => startMutation.mutateAsync(id), 'Uji isolir dimulai. Berlaku 10 menit.')
const stopTest = (id: string) => run(() => stopMutation.mutateAsync(id), 'Uji isolir dihentikan.')
const remove = (id: string) => run(() => removeMutation.mutateAsync(id))

const busy = computed(
  () =>
    addMutation.isPending.value ||
    removeMutation.isPending.value ||
    startMutation.isPending.value ||
    stopMutation.isPending.value,
)

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', {
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}
</script>

<template>
  <section class="space-y-4" aria-labelledby="pilot-heading">
    <div>
      <h2 id="pilot-heading" class="text-lg font-semibold">Akun pilot</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Pilih satu atau beberapa pelanggan untuk diuji. "Uji Isolir" mengisolir akun itu selama 10
        menit lalu memulihkannya otomatis.
      </p>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Akun pilot yang juga menunggak tetap terisolir setelah jendela uji 10 menit berakhir.
      </p>
    </div>

    <div class="relative">
      <BaseButton
        variant="outline"
        :disabled="!canUpdate || busy"
        :title="canUpdate ? undefined : CONTROL_OWNER_ONLY_TOOLTIP"
        @click="picking = !picking"
      >
        Tambah akun pilot
      </BaseButton>
      <div v-if="picking" class="absolute z-20 mt-1">
        <AccountPicker
          label="Cari pelanggan untuk pilot"
          @pick="onPick"
          @cancel="picking = false"
        />
      </div>
    </div>

    <p v-if="errorText" class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
      {{ errorText }}
    </p>

    <p v-if="pilotQuery.isPending.value" class="text-sm text-gray-600" role="status">Memuat...</p>
    <p v-else-if="accounts.length === 0" class="rounded-xl border p-6 text-sm text-gray-600">
      Belum ada akun pilot. Tambahkan minimal satu akun untuk menguji isolir.
    </p>
    <ul v-else class="divide-y rounded-xl border">
      <li
        v-for="a in accounts"
        :key="a.account_id"
        class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
        :data-testid="`pilot-${a.account_id}`"
      >
        <div class="min-w-0">
          <p class="font-medium">
            {{ a.account_name }}
            <span
              v-if="a.verified"
              class="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-950 dark:text-green-200"
              >Terverifikasi</span
            >
          </p>
          <p v-if="a.test_active" class="text-xs text-gray-600 dark:text-gray-400">
            Uji berjalan{{ a.test_until ? ` sampai ${fmtTime(a.test_until)} WIB` : '' }}
          </p>
          <p
            v-if="taskLine(a.account_id)"
            class="text-xs text-gray-600 dark:text-gray-400"
            role="status"
          >
            {{ taskLine(a.account_id) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseButton
            v-if="canTest && !a.test_active"
            variant="secondary"
            :disabled="!canUpdate || busy"
            :title="testHint"
            @click="startTest(a.account_id)"
          >
            Uji Isolir
          </BaseButton>
          <BaseButton
            v-if="a.test_active"
            variant="danger"
            :disabled="!canUpdate || busy"
            :title="canUpdate ? undefined : CONTROL_OWNER_ONLY_TOOLTIP"
            @click="stopTest(a.account_id)"
          >
            Hentikan Uji
          </BaseButton>
          <BaseButton
            variant="outline"
            :disabled="!canUpdate || busy || a.test_active"
            :title="canUpdate ? undefined : CONTROL_OWNER_ONLY_TOOLTIP"
            :aria-label="`Lepas ${a.account_name} dari daftar pilot`"
            @click="remove(a.account_id)"
          >
            Lepas
          </BaseButton>
        </div>
      </li>
    </ul>
    <p v-if="control.engine !== 'on'" class="text-xs text-gray-600 dark:text-gray-400">
      Uji Isolir tersedia bila mesin isolir aktif.
    </p>
  </section>
</template>
