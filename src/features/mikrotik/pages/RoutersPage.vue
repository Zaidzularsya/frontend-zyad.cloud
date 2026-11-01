<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast'
import {
  useCheckRouterMutation,
  useDeleteRouterMutation,
  useRoutersQuery,
  useSetupCleanupMutation,
} from '@/features/mikrotik/api/mikrotik.queries'
import RouterSecretCount from '@/features/mikrotik/components/RouterSecretCount.vue'
import RouterFormModal from '@/features/mikrotik/components/RouterFormModal.vue'
import SetupPlanModal from '@/features/mikrotik/components/SetupPlanModal.vue'
import type { Router } from '@/features/mikrotik/types'
import { apiErrorCode, routerActionError } from '@/features/mikrotik/utils/errors'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()

const canCreate = computed(() => auth.can('mikrotik_router.create'))
const canUpdate = computed(() => auth.can('mikrotik_router.update'))
const canDelete = computed(() => auth.can('mikrotik_router.delete'))
const canSetup = computed(() => auth.can('mikrotik_router.setup'))

const listQuery = useRoutersQuery()
const routers = computed(() => listQuery.data.value?.data ?? [])

const checkMutation = useCheckRouterMutation()
const deleteMutation = useDeleteRouterMutation()
const cleanupMutation = useSetupCleanupMutation()
const checkingId = ref('')

async function check(r: Router) {
  checkingId.value = r.id
  try {
    await checkMutation.mutateAsync(r.id)
  } catch (error) {
    toast.error(routerActionError(error))
  } finally {
    checkingId.value = ''
  }
}

function statusLabel(r: Router) {
  if (!r.last_check_status)
    return {
      text: 'Belum dicek',
      cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }
  return r.last_check_status === 'ok'
    ? {
        text: 'Terhubung',
        cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      }
    : {
        text: r.last_check_status,
        cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
      }
}

// --- form ---
const formOpen = ref(false)
const editing = ref<Router | null>(null)
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(r: Router) {
  editing.value = r
  formOpen.value = true
}
function onSaved() {
  formOpen.value = false
  toast.success('Router disimpan.')
}

// --- setup ---
const setupTarget = ref<Router | null>(null)
function onApplied() {
  setupTarget.value = null
  toast.success('Setup isolir diterapkan.')
}

// Dari checklist (?setup=1[&router_id=]): buka dialog setup sekali saja setelah router dan izin siap.
const setupHint = ref(false)
let setupHandled = false
watch(
  [routers, canSetup, () => route.query.setup, () => route.query.router_id],
  () => {
    if (setupHandled || !route.query.setup || !canSetup.value || listQuery.isLoading.value) return
    if (!listQuery.data.value) return
    setupHandled = true
    const wanted = route.query.router_id
    const match = routers.value.find((r) => r.id === wanted)
    const target = match ?? (routers.value.length === 1 ? routers.value[0] : undefined)
    if (target) setupTarget.value = target
    else setupHint.value = routers.value.length > 1
  },
  { immediate: true },
)

// --- cleanup ---
const cleanupTarget = ref<Router | null>(null)
async function confirmCleanup() {
  const target = cleanupTarget.value
  if (!target) return
  try {
    await cleanupMutation.mutateAsync(target.id)
    toast.success('Objek zyad dibersihkan dari router.')
    cleanupTarget.value = null
  } catch (error) {
    toast.error(routerActionError(error))
  }
}

// --- delete ---
const deleteTarget = ref<Router | null>(null)
const deleteBlocked = ref('')
function openDelete(r: Router) {
  deleteBlocked.value = ''
  deleteTarget.value = r
}
async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  deleteBlocked.value = ''
  try {
    await deleteMutation.mutateAsync(target.id)
    toast.success('Router dihapus.')
    deleteTarget.value = null
  } catch (error) {
    if (apiErrorCode(error) === 'MIKROTIK_ROUTER_HAS_ISOLATED_SECRETS') {
      deleteBlocked.value = routerActionError(error)
    } else {
      toast.error(routerActionError(error))
    }
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Router" description="Daftar router Mikrotik milik organisasi.">
      <BaseButton v-if="canCreate" @click="openCreate">
        <Plus class="size-4" aria-hidden="true" /> Tambah Router
      </BaseButton>
    </PageHeader>

    <div
      v-if="deleteBlocked"
      class="rounded-lg bg-amber-100 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      role="alert"
    >
      {{ deleteBlocked }}
      <button type="button" class="ml-2 underline" @click="deleteBlocked = ''">Tutup</button>
      <RouterLink :to="{ name: 'mikrotik-tasks' }" class="font-medium underline">
        Lihat tugas isolir
      </RouterLink>
    </div>

    <p v-if="setupHint" class="text-sm text-brand-600" role="status">
      Pilih router lalu klik Setup isolir.
    </p>

    <p class="text-sm text-gray-500 dark:text-gray-400">
      Redirect ke halaman bayar bersifat best-effort: pelanggan terisolir pasti terputus dari
      layanan, tetapi pengalihan otomatis ke halaman bayar tidak dijamin di semua perangkat.
    </p>

    <BaseCard>
      <p v-if="listQuery.isLoading.value" class="text-sm text-gray-500">Memuat...</p>
      <p v-else-if="!routers.length" class="text-sm text-gray-500">Belum ada router terdaftar.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-gray-500">
            <tr>
              <th class="py-2 pr-4 font-medium">Nama</th>
              <th class="py-2 pr-4 font-medium">Host</th>
              <th class="py-2 pr-4 font-medium">Koneksi</th>
              <th class="py-2 pr-4 font-medium">RouterOS</th>
              <th class="py-2 pr-4 font-medium">API</th>
              <th class="py-2 pr-4 font-medium">Isolir</th>
              <th class="py-2 pr-4 font-medium">Secret</th>
              <th class="py-2 font-medium"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="r in routers" :key="r.id" :data-router="r.id">
              <td class="py-2 pr-4 font-medium">{{ r.name }}</td>
              <td class="py-2 pr-4 font-mono text-xs">{{ r.host }}:{{ r.port }}</td>
              <td class="py-2 pr-4">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusLabel(r).cls"
                >
                  {{ statusLabel(r).text }}
                </span>
                <BaseButton
                  variant="outline"
                  class="ml-2 !px-2 !py-1 !text-xs"
                  :disabled="checkingId === r.id"
                  @click="check(r)"
                >
                  {{ checkingId === r.id ? 'Mengecek...' : 'Cek' }}
                </BaseButton>
              </td>
              <td class="py-2 pr-4">{{ r.routeros_version || '-' }}</td>
              <td class="py-2 pr-4">{{ r.api_type }}</td>
              <td class="py-2 pr-4">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    r.isolir_ready
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                  "
                >
                  {{ r.isolir_ready ? 'Siap' : 'Belum siap' }}
                </span>
              </td>
              <td class="py-2 pr-4">
                <RouterSecretCount :router-id="r.id" />
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                <BaseButton
                  v-if="canSetup"
                  variant="secondary"
                  class="!px-2 !py-1 !text-xs"
                  @click="setupTarget = r"
                >
                  Setup isolir
                </BaseButton>
                <BaseButton
                  v-if="canSetup"
                  variant="outline"
                  class="ml-1 !px-2 !py-1 !text-xs"
                  @click="cleanupTarget = r"
                >
                  Bersihkan
                </BaseButton>
                <BaseButton
                  v-if="canUpdate"
                  variant="outline"
                  class="ml-1 !px-2 !py-1 !text-xs"
                  @click="openEdit(r)"
                >
                  Ubah
                </BaseButton>
                <BaseButton
                  v-if="canDelete"
                  variant="danger"
                  class="ml-1 !px-2 !py-1 !text-xs"
                  @click="openDelete(r)"
                >
                  Hapus
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <RouterFormModal
      :open="formOpen"
      :router="editing"
      @close="formOpen = false"
      @saved="onSaved"
    />
    <SetupPlanModal
      v-if="setupTarget"
      :open="Boolean(setupTarget)"
      :router="setupTarget"
      @close="setupTarget = null"
      @applied="onApplied"
    />

    <ConfirmDialog
      :open="Boolean(cleanupTarget)"
      title="Bersihkan setup isolir"
      message="Hanya objek yang dikelola zyad (profile, pool, rule, address-list isolir) yang dihapus dari router. Objek lain dan PPP secret tidak disentuh. Pembersihan ditolak bila masih ada secret yang memakai profile isolir."
      confirm-label="Bersihkan"
      tone="danger"
      :loading="cleanupMutation.isPending.value"
      @confirm="confirmCleanup"
      @cancel="cleanupTarget = null"
    />

    <ConfirmDialog
      :open="Boolean(deleteTarget)"
      title="Hapus router"
      :message="`Router ${deleteTarget?.name ?? ''} akan dihapus dari Zyad. Konfigurasi di router tidak diubah.`"
      confirm-label="Hapus"
      tone="danger"
      :loading="deleteMutation.isPending.value"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
