<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import {
  mikrotikKeys,
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
import { engineBlockReason } from '@/features/mikrotik/utils/engine'
import { controlActionError, taskErrorAction } from '@/features/mikrotik/utils/errors'

const props = defineProps<{ control: ControlState; canUpdate: boolean }>()

const POLL_MS = 3000

const toast = useToast()
const queryClient = useQueryClient()
const pilotQuery = usePilotQuery()
const accounts = computed(() => pilotQuery.data.value ?? [])

const addMutation = useAddPilotMutation()
const removeMutation = useRemovePilotMutation()
const startMutation = useStartPilotTestMutation()
const stopMutation = useStopPilotTestMutation()

const picking = ref(false)
const errorText = ref('')

const isPilotMode = computed(() => props.control.mode === 'pilot')
const engineReason = computed(() => engineBlockReason(props.control.engine))

// Alasan kontrol nonaktif: izin dulu, lalu mesin. aria-disabled tidak memblokir klik/Enter,
// jadi setiap handler memeriksa alasan lebih dulu.
const permReason = computed(() => (props.canUpdate ? null : CONTROL_OWNER_ONLY_TOOLTIP))
const engineActionReason = computed(() => permReason.value ?? engineReason.value)

function a11y(id: string, reason: string | null) {
  return reason
    ? {
        'aria-disabled': 'true',
        'aria-describedby': id,
        title: reason,
        class: 'cursor-not-allowed opacity-60',
      }
    : {}
}

// Status tugas isolir diambil dari daftar tugas; polling hanya selama ada uji berjalan.
const tasksQuery = useTasksQuery(ref({ limit: 50 }))
const hasActiveTest = computed(() => accounts.value.some((a) => a.test_active))
let timer: ReturnType<typeof setInterval> | undefined

// Jendela uji berakhir di server: test_active dan pilot_verified_at hanya berubah bila kedua
// query itu ikut dimuat ulang, jadi tiap tick menyegarkan tugas, daftar pilot, dan status kendali.
function tick() {
  void tasksQuery.refetch()
  void queryClient.invalidateQueries({ queryKey: mikrotikKeys.pilot() })
  void queryClient.invalidateQueries({ queryKey: mikrotikKeys.control() })
}
watch(
  hasActiveTest,
  (active) => {
    clearInterval(timer)
    timer = active ? setInterval(tick, POLL_MS) : undefined
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

const busy = computed(
  () =>
    addMutation.isPending.value ||
    removeMutation.isPending.value ||
    startMutation.isPending.value ||
    stopMutation.isPending.value,
)

async function onPick(account: AccountRef) {
  picking.value = false
  if (engineActionReason.value) return
  await run(
    () => addMutation.mutateAsync(account.id),
    `${account.name} ditambahkan ke daftar pilot.`,
  )
}
const startTest = (id: string) => {
  if (engineActionReason.value || busy.value) return
  return run(() => startMutation.mutateAsync(id), 'Uji isolir dimulai. Berlaku 10 menit.')
}
const stopTest = (id: string) => {
  if (permReason.value || busy.value) return
  return run(() => stopMutation.mutateAsync(id), 'Uji isolir dihentikan.')
}
const remove = (id: string) => {
  if (engineActionReason.value || busy.value) return
  return run(() => removeMutation.mutateAsync(id))
}
function togglePicker() {
  if (engineActionReason.value || busy.value) return
  picking.value = !picking.value
}

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
        v-bind="a11y('hint-add', engineActionReason)"
        @click="togglePicker"
      >
        Tambah akun pilot
      </BaseButton>
      <span v-if="engineActionReason" id="hint-add" class="sr-only">{{ engineActionReason }}</span>
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
          <template v-if="isPilotMode && !a.test_active">
            <BaseButton
              variant="secondary"
              v-bind="a11y(`hint-test-${a.account_id}`, engineActionReason)"
              @click="startTest(a.account_id)"
            >
              Uji Isolir
            </BaseButton>
            <span v-if="engineActionReason" :id="`hint-test-${a.account_id}`" class="sr-only">{{
              engineActionReason
            }}</span>
          </template>
          <template v-if="a.test_active">
            <BaseButton
              variant="danger"
              v-bind="a11y(`hint-stop-${a.account_id}`, permReason)"
              @click="stopTest(a.account_id)"
            >
              Hentikan Uji
            </BaseButton>
            <span v-if="permReason" :id="`hint-stop-${a.account_id}`" class="sr-only">{{
              permReason
            }}</span>
          </template>
          <BaseButton
            variant="outline"
            v-bind="
              a11y(
                `hint-remove-${a.account_id}`,
                a.test_active ? 'Hentikan uji lebih dulu.' : engineActionReason,
              )
            "
            :aria-label="`Lepas ${a.account_name} dari daftar pilot`"
            @click="a.test_active || remove(a.account_id)"
          >
            Lepas
          </BaseButton>
          <span
            v-if="a.test_active || engineActionReason"
            :id="`hint-remove-${a.account_id}`"
            class="sr-only"
            >{{ a.test_active ? 'Hentikan uji lebih dulu.' : engineActionReason }}</span
          >
        </div>
      </li>
    </ul>
  </section>
</template>
