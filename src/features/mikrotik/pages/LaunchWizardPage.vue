<script setup lang="ts">
import { computed, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import {
  useControlQuery,
  usePreviewSummaryQuery,
  useSetModeMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import CandidateTable from '@/features/mikrotik/components/CandidateTable.vue'
import LaunchStepper from '@/features/mikrotik/components/LaunchStepper.vue'
import PilotPanel from '@/features/mikrotik/components/PilotPanel.vue'
import { engineBlockReason } from '@/features/mikrotik/utils/engine'
import { controlPermissions } from '@/features/mikrotik/utils/control-permissions'
import { controlActionError } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const perms = computed(() => controlPermissions(auth.user?.permissions ?? []))

const controlQuery = useControlQuery()
const summaryQuery = usePreviewSummaryQuery()
const setMode = useSetModeMutation()

const control = computed(() => controlQuery.data.value)
const engineReason = computed(() =>
  control.value ? engineBlockReason(control.value.engine) : null,
)
const errorText = ref('')
const PILOT_REQUIRED_HINT =
  'Selesaikan minimal satu uji pilot yang berhasil sebelum mengaktifkan isolir otomatis.'

async function changeMode(mode: 'pilot' | 'active') {
  errorText.value = ''
  try {
    await setMode.mutateAsync({ mode })
    toast.success(mode === 'pilot' ? 'Mode Pilot dimulai.' : 'Isolir otomatis diaktifkan.')
  } catch (error) {
    errorText.value = controlActionError(error)
  }
}

// Alasan tombol nonaktif: izin, lalu mesin, lalu verifikasi pilot. null = boleh.
const permReason = computed(() => perms.value.disabledReason)
const pilotReason = computed(() =>
  setMode.isPending.value ? 'Sedang memproses...' : permReason.value,
)
const activateReason = computed(() => {
  if (permReason.value) return permReason.value
  if (engineReason.value) return engineReason.value
  if (!control.value?.pilot_verified_at) return PILOT_REQUIRED_HINT
  if (setMode.isPending.value) return 'Sedang memproses...'
  return null
})

// aria-disabled tidak memblokir klik/Enter, jadi dijaga di handler.
function goPilot() {
  if (pilotReason.value) return
  void changeMode('pilot')
}
function goActive() {
  if (activateReason.value) return
  void changeMode('active')
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Peluncuran Isolir" description="Simulasi, uji pilot, lalu aktifkan." />

    <p v-if="controlQuery.isPending.value" class="text-sm text-gray-600" role="status">Memuat...</p>
    <p v-else-if="controlQuery.isError.value || !control" class="text-sm text-red-700" role="alert">
      Gagal memuat status peluncuran.
      <button type="button" class="font-medium underline" @click="controlQuery.refetch()">
        Coba lagi
      </button>
    </p>
    <template v-else>
      <LaunchStepper :mode="control.mode" />

      <p
        v-if="engineReason"
        class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        role="status"
      >
        {{ engineReason }} Aksi pilot dan aktivasi belum bisa dijalankan.
      </p>
      <p v-if="!perms.canUpdate" class="text-sm text-gray-600 dark:text-gray-400">
        {{ perms.disabledReason }}
      </p>
      <p v-if="errorText" class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
        {{ errorText }}
      </p>

      <section v-if="control.mode === 'simulation'" class="space-y-4" aria-label="Langkah Simulasi">
        <p class="rounded-lg border p-3 text-sm font-medium" role="status">
          Simulasi, tidak ada koneksi yang diputus
        </p>
        <p v-if="summaryQuery.isPending.value" class="text-sm text-gray-600" role="status">
          Memuat ringkasan...
        </p>
        <CandidateTable
          v-else-if="summaryQuery.data.value"
          :summary="summaryQuery.data.value"
          :can-update="perms.canUpdate"
        />
        <BaseButton
          :aria-disabled="pilotReason ? 'true' : undefined"
          :aria-describedby="pilotReason ? 'hint-pilot' : undefined"
          :title="pilotReason ?? undefined"
          :class="pilotReason ? 'cursor-not-allowed opacity-60' : ''"
          @click="goPilot"
        >
          Lanjut ke Pilot
        </BaseButton>
        <span v-if="pilotReason" id="hint-pilot" class="sr-only">{{ pilotReason }}</span>
      </section>

      <section v-else-if="control.mode === 'pilot'" class="space-y-4" aria-label="Langkah Pilot">
        <PilotPanel :control="control" :can-update="perms.canUpdate" />
        <div class="space-y-1">
          <BaseButton
            :aria-disabled="activateReason ? 'true' : undefined"
            :aria-describedby="activateReason ? 'hint-active' : undefined"
            :title="activateReason ?? undefined"
            :class="activateReason ? 'cursor-not-allowed opacity-60' : ''"
            @click="goActive"
          >
            Aktifkan Isolir Otomatis
          </BaseButton>
          <span v-if="activateReason" id="hint-active" class="sr-only">{{ activateReason }}</span>
          <p v-if="!control.pilot_verified_at" class="text-xs text-gray-600 dark:text-gray-400">
            Tombol ini aktif setelah minimal satu uji pilot berhasil.
          </p>
        </div>
      </section>

      <section v-else class="space-y-2 rounded-xl border p-4" aria-label="Langkah Aktif">
        <p class="font-medium">
          {{
            control.mode === 'active' ? 'Isolir otomatis aktif.' : 'Isolir otomatis sedang dijeda.'
          }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Kelola jeda, pemulihan, dan log aktivitas di halaman Kendali Isolir.
        </p>
      </section>
    </template>
  </div>
</template>
