<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast'
import {
  useControlQuery,
  usePreviewSummaryQuery,
  useRestoreAllMutation,
  useSetModeMutation,
  useTaskSummaryQuery,
} from '@/features/mikrotik/api/mikrotik.queries'
import ActivityLog from '@/features/mikrotik/components/ActivityLog.vue'
import GraceDaysCard from '@/features/mikrotik/components/GraceDaysCard.vue'
import ModeSwitch from '@/features/mikrotik/components/ModeSwitch.vue'
import ReactivateDialog from '@/features/mikrotik/components/ReactivateDialog.vue'
import type { RestoreAllResult } from '@/features/mikrotik/types'
import { controlPermissions } from '@/features/mikrotik/utils/control-permissions'
import { controlActionError } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const ENGINE_OFF_TOOLTIP = 'Mesin isolir dinonaktifkan operator'
const NOT_PAUSED_TOOLTIP = 'Pulihkan Semua hanya bisa dipakai saat isolir otomatis dijeda (PAUSE).'

const auth = useAuthStore()
const toast = useToast()
const perms = computed(() => controlPermissions(auth.user?.permissions ?? []))

const controlQuery = useControlQuery()
const summaryQuery = usePreviewSummaryQuery()
const taskSummary = useTaskSummaryQuery()
const setMode = useSetModeMutation()
const restoreAll = useRestoreAllMutation()

const control = computed(() => controlQuery.data.value)
const summary = computed(() => summaryQuery.data.value)
// Template hanya dirender saat mode active/paused (lihat v-else-if di atas).
const switchMode = computed<'active' | 'paused'>(() =>
  control.value?.mode === 'paused' ? 'paused' : 'active',
)
const engineOff = computed(() => !!control.value && control.value.engine !== 'on')
const failedTasks = computed(() => taskSummary.data.value?.counts?.failed ?? 0)

const oldestRestore = computed(() => taskSummary.data.value?.oldest_pending_restore_at ?? null)
const oldestMinutes = computed(() => {
  if (!oldestRestore.value) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(oldestRestore.value).getTime()) / 60_000))
})

const errorText = ref('')
const reactivateOpen = ref(false)
const confirmOpen = ref(false)
const restoreResult = ref<RestoreAllResult | null>(null)

async function pause() {
  errorText.value = ''
  try {
    await setMode.mutateAsync({ mode: 'paused' })
    toast.success('Isolir otomatis dijeda.')
  } catch (error) {
    errorText.value = controlActionError(error)
  }
}

const restoreDisabled = computed(
  () =>
    !perms.value.canRestore ||
    control.value?.mode !== 'paused' ||
    engineOff.value ||
    restoreAll.isPending.value,
)
// Alasan tombol nonaktif: izin dulu, lalu mode, lalu mesin.
const restoreHint = computed(() => {
  if (!perms.value.canRestore) return perms.value.disabledReason ?? undefined
  if (control.value?.mode !== 'paused') return NOT_PAUSED_TOOLTIP
  if (engineOff.value) return ENGINE_OFF_TOOLTIP
  return undefined
})

function openRestore() {
  // aria-disabled tidak memblokir klik/Enter, jadi dijaga di sini.
  if (restoreDisabled.value) return
  restoreResult.value = null
  errorText.value = ''
  confirmOpen.value = true
}
async function doRestore() {
  try {
    restoreResult.value = await restoreAll.mutateAsync()
  } catch (error) {
    errorText.value = controlActionError(error)
  } finally {
    confirmOpen.value = false
  }
}

function openReactivate() {
  if (!perms.value.canUpdate) return
  errorText.value = ''
  reactivateOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Kendali Isolir" description="Jeda, aktifkan, dan pantau isolir otomatis." />

    <div
      v-if="oldestRestore"
      class="rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
      role="alert"
    >
      Ada pemulihan yang tertunda: pelanggan sudah bayar tapi belum dibuka (tertua
      {{ oldestMinutes }} menit).
    </div>

    <p v-if="controlQuery.isPending.value" class="text-sm text-gray-600" role="status">Memuat...</p>
    <p v-else-if="controlQuery.isError.value || !control" class="text-sm text-red-700" role="alert">
      Gagal memuat status kendali.
      <button type="button" class="font-medium underline" @click="controlQuery.refetch()">
        Coba lagi
      </button>
    </p>
    <section
      v-else-if="control.mode !== 'active' && control.mode !== 'paused'"
      class="space-y-2 rounded-xl border p-4"
    >
      <p class="font-medium">Isolir otomatis belum diaktifkan.</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Selesaikan simulasi dan uji pilot di wizard peluncuran terlebih dahulu.
      </p>
      <RouterLink class="text-sm font-medium underline" :to="{ name: 'mikrotik-launch' }">
        Buka Peluncuran Isolir
      </RouterLink>
    </section>
    <template v-else>
      <p
        v-if="engineOff"
        class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        role="status"
      >
        Mesin isolir dinonaktifkan operator. Aksi di halaman ini belum bisa dijalankan.
      </p>
      <p v-if="!perms.canUpdate" class="text-sm text-gray-600 dark:text-gray-400">
        {{ perms.disabledReason }}
      </p>
      <p v-if="errorText" class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
        {{ errorText }}
      </p>

      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border p-4">
          <dt class="text-sm text-gray-600 dark:text-gray-400">Terisolir</dt>
          <dd class="text-3xl font-semibold tabular-nums" data-testid="count-isolated">
            {{ control.isolated_secrets }}
          </dd>
        </div>
        <div class="rounded-xl border p-4">
          <dt class="text-sm text-gray-600 dark:text-gray-400">Akan Terisolir</dt>
          <dd class="text-3xl font-semibold tabular-nums" data-testid="count-target">
            {{ summary?.target ?? '-' }}
          </dd>
        </div>
        <div class="rounded-xl border p-4">
          <dt class="text-sm text-gray-600 dark:text-gray-400">Tugas Gagal</dt>
          <dd
            class="text-3xl font-semibold tabular-nums"
            :class="failedTasks > 0 ? 'text-red-700' : ''"
            data-testid="count-failed"
          >
            {{ failedTasks }}
          </dd>
        </div>
      </dl>

      <section class="space-y-3 rounded-xl border p-4" aria-labelledby="master-heading">
        <h2 id="master-heading" class="text-lg font-semibold">Isolir otomatis</h2>
        <ModeSwitch
          :mode="switchMode"
          :disabled="!perms.canUpdate || setMode.isPending.value"
          :hint="perms.disabledReason ?? undefined"
          @pause="pause"
          @resume="openReactivate"
        />
        <p
          v-if="control.mode === 'paused'"
          class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          Isolir otomatis dihentikan. Namun, pemulihan otomatis (Restore) untuk pelanggan yang
          membayar tetap berjalan.
        </p>

        <div class="space-y-1 pt-2">
          <BaseButton
            variant="outline"
            :aria-disabled="restoreDisabled ? 'true' : undefined"
            :aria-describedby="restoreDisabled && restoreHint ? 'restore-hint' : undefined"
            :title="restoreDisabled ? restoreHint : undefined"
            :class="restoreDisabled ? 'cursor-not-allowed opacity-60' : ''"
            @click="openRestore"
          >
            Pulihkan Semua
          </BaseButton>
          <span v-if="restoreDisabled && restoreHint" id="restore-hint" class="sr-only">{{
            restoreHint
          }}</span>
          <p class="text-xs text-gray-600 dark:text-gray-400">
            Mengembalikan profile asli semua pelanggan yang sedang terisolir. Pairing tidak dilepas.
          </p>
        </div>

        <p v-if="restoreResult" class="text-sm" role="status" data-testid="restore-result">
          Pemulihan dijadwalkan: {{ restoreResult.enqueued }} diproses,
          {{ restoreResult.skipped }} dilewati<template v-if="restoreResult.failed > 0"
            >, {{ restoreResult.failed }} gagal dijadwalkan</template
          ><template v-if="restoreResult.aborted"
            >. Proses dihentikan karena mode berubah; hasil di atas sebagian</template
          >.
        </p>
      </section>

      <GraceDaysCard
        :grace-days="control.grace_days"
        :disabled="!perms.canUpdate"
        :hint="perms.disabledReason ?? undefined"
      />

      <ActivityLog />

      <ConfirmDialog
        :open="confirmOpen"
        title="Pulihkan Semua Pelanggan?"
        message="Semua pelanggan yang sedang terisolir akan dipulihkan ke profile asli mereka. Pairing tidak dilepas. Mode tetap dijeda sampai Anda mengaktifkannya kembali."
        confirm-label="Pulihkan Semua"
        :loading="restoreAll.isPending.value"
        @confirm="doRestore"
        @cancel="confirmOpen = false"
      />
      <ReactivateDialog
        v-if="summary"
        :open="reactivateOpen"
        :summary="summary"
        :can-update="perms.canUpdate"
        @close="reactivateOpen = false"
      />
    </template>
  </div>
</template>
