<script setup lang="ts">
import { computed, ref } from 'vue'
import { MessageCircle, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast'
import {
  useDeleteSessionMutation,
  useLogoutSessionMutation,
  useSessionsQuery,
  useStartSessionMutation,
  useUpdateSessionMutation,
} from '@/features/whatsapp/api/whatsapp.queries'
import ConnectSessionModal from '@/features/whatsapp/components/ConnectSessionModal.vue'
import SessionFormModal from '@/features/whatsapp/components/SessionFormModal.vue'
import SessionStatusBadge from '@/features/whatsapp/components/SessionStatusBadge.vue'
import type { WhatsAppSession } from '@/features/whatsapp/types'
import { whatsappErrorMessage } from '@/features/whatsapp/utils/errors'
import {
  formatPhone,
  isPairingStatus,
  purposeLabels,
} from '@/features/whatsapp/utils/session-status'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const canManage = computed(() => auth.can('whatsapp.session.manage'))

const sessionsQuery = useSessionsQuery()
const sessions = computed(() => sessionsQuery.data.value ?? [])

const startMutation = useStartSessionMutation()
const updateMutation = useUpdateSessionMutation()
const deleteMutation = useDeleteSessionMutation()
const logoutMutation = useLogoutSessionMutation()

function sessionTitle(session: WhatsAppSession) {
  return session.display_name || session.push_name || formatPhone(session.phone) || 'Tanpa nama'
}

// --- create / edit ---
const formOpen = ref(false)
const editing = ref<WhatsAppSession | null>(null)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openSettings(session: WhatsAppSession) {
  editing.value = session
  formOpen.value = true
}

function onSaved(session: WhatsAppSession, created: boolean) {
  formOpen.value = false
  if (created) openConnect(session)
  else toast.success('Pengaturan disimpan.')
}

// --- connect (QR / pairing code) ---
const connectOpen = ref(false)
const connecting = ref<WhatsAppSession | null>(null)

function openConnect(session: WhatsAppSession) {
  connecting.value = session
  connectOpen.value = true
}

async function reconnect(session: WhatsAppSession) {
  try {
    const started = await startMutation.mutateAsync(session.id)
    openConnect(started)
  } catch (error) {
    toast.error(whatsappErrorMessage(error))
  }
}

function onConnected(session: WhatsAppSession) {
  toast.success(`${formatPhone(session.phone) || 'Nomor WhatsApp'} berhasil terhubung.`)
  void sessionsQuery.refetch()
}

async function makeDefault(session: WhatsAppSession) {
  try {
    await updateMutation.mutateAsync({ id: session.id, payload: { is_default: true } })
    toast.success(`${sessionTitle(session)} sekarang jadi nomor utama.`)
  } catch (error) {
    toast.error(whatsappErrorMessage(error))
  }
}

// --- confirm: logout / delete ---
type PendingAction = { kind: 'logout' | 'delete'; session: WhatsAppSession }
const pending = ref<PendingAction | null>(null)

const confirmCopy = computed(() => {
  if (!pending.value) return { title: '', message: '', label: '' }
  const name = sessionTitle(pending.value.session)
  return pending.value.kind === 'logout'
    ? {
        title: 'Logout WhatsApp?',
        message: `${name} akan dilepas dari HP. Pesan masuk berhenti diterima sampai nomor dihubungkan lagi.`,
        label: 'Logout',
      }
    : {
        title: 'Hapus koneksi WhatsApp?',
        message: `${name} akan dilepas dari HP dan dihapus. Riwayat chat yang sudah tersimpan tetap ada di CRM.`,
        label: 'Hapus koneksi',
      }
})

const confirmLoading = computed(
  () => logoutMutation.isPending.value || deleteMutation.isPending.value,
)

async function runPending() {
  const action = pending.value
  if (!action) return
  try {
    if (action.kind === 'logout') {
      await logoutMutation.mutateAsync(action.session.id)
      toast.success(`${sessionTitle(action.session)} sudah logout.`)
    } else {
      await deleteMutation.mutateAsync(action.session.id)
      toast.success(`${sessionTitle(action.session)} dihapus.`)
    }
    pending.value = null
  } catch (error) {
    toast.error(whatsappErrorMessage(error))
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="WhatsApp"
      description="Nomor WhatsApp yang terhubung untuk chat dengan lead dan pelanggan."
    >
      <BaseButton v-if="canManage && sessions.length > 0" @click="openCreate">
        <Plus class="size-4" aria-hidden="true" />
        Hubungkan nomor
      </BaseButton>
    </PageHeader>

    <BaseCard class="!p-0">
      <div v-if="sessionsQuery.isPending.value" class="p-12 text-center text-sm text-gray-600">
        Memuat nomor WhatsApp...
      </div>

      <div v-else-if="sessionsQuery.isError.value" class="p-12 text-center" role="alert">
        <p class="text-sm text-red-600 dark:text-red-400">
          {{ whatsappErrorMessage(sessionsQuery.error.value) }}
        </p>
        <BaseButton variant="outline" class="mt-4" @click="sessionsQuery.refetch()">
          Muat ulang
        </BaseButton>
      </div>

      <div v-else-if="sessions.length === 0" class="px-6 py-12 text-center">
        <MessageCircle class="mx-auto mb-3 size-8 text-gray-400" aria-hidden="true" />
        <p class="font-medium text-gray-900 dark:text-gray-100">Belum ada nomor terhubung</p>
        <p class="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">
          Hubungkan nomor WhatsApp tim sales supaya chat dengan lead tercatat langsung di CRM.
        </p>
        <BaseButton v-if="canManage" class="mt-5" @click="openCreate">
          <Plus class="size-4" aria-hidden="true" />
          Hubungkan nomor pertama
        </BaseButton>
        <p v-else class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Minta owner organisasi untuk menghubungkan nomor.
        </p>
      </div>

      <ul v-else class="divide-y dark:divide-gray-800">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate font-medium text-gray-900 dark:text-gray-100">
                {{ sessionTitle(session) }}
              </p>
              <SessionStatusBadge :status="session.status" />
              <span
                v-if="session.is_default"
                class="rounded-md border px-2 py-0.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Utama
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span v-if="session.phone">{{ formatPhone(session.phone) }} · </span>
              {{ purposeLabels[session.purpose] }}
              <span v-if="session.auto_create_lead"> · Buat lead otomatis</span>
            </p>
          </div>

          <div v-if="canManage" class="flex flex-wrap gap-2">
            <BaseButton
              v-if="isPairingStatus(session.status)"
              variant="primary"
              @click="openConnect(session)"
            >
              Lanjutkan pairing
            </BaseButton>
            <BaseButton
              v-else-if="session.status === 'STOPPED' || session.status === 'FAILED'"
              variant="primary"
              :disabled="startMutation.isPending.value"
              @click="reconnect(session)"
            >
              Hubungkan ulang
            </BaseButton>
            <BaseButton
              v-else-if="session.status === 'WORKING'"
              variant="outline"
              @click="pending = { kind: 'logout', session }"
            >
              Logout
            </BaseButton>
            <BaseButton
              v-if="!session.is_default"
              variant="outline"
              :disabled="updateMutation.isPending.value"
              @click="makeDefault(session)"
            >
              Jadikan utama
            </BaseButton>
            <BaseButton variant="outline" @click="openSettings(session)">Pengaturan</BaseButton>
            <BaseButton variant="outline" @click="pending = { kind: 'delete', session }">
              Hapus
            </BaseButton>
          </div>
        </li>
      </ul>
    </BaseCard>

    <SessionFormModal
      :open="formOpen"
      :session="editing"
      @close="formOpen = false"
      @saved="onSaved"
    />
    <ConnectSessionModal
      :open="connectOpen"
      :session="connecting"
      @close="connectOpen = false"
      @connected="onConnected"
    />
    <ConfirmDialog
      :open="pending !== null"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.label"
      :tone="pending?.kind === 'delete' ? 'danger' : 'default'"
      :loading="confirmLoading"
      @confirm="runPending"
      @cancel="pending = null"
    />
  </div>
</template>
