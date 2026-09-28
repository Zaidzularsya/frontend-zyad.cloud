<script setup lang="ts">
import { computed, ref } from 'vue'
import { Mail, Plus } from 'lucide-vue-next'

import PageHeader from '@/components/common/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useToast } from '@/components/ui/toast'
import {
  useDeleteMailboxMutation,
  useMailboxesQuery,
  useSyncMailboxMutation,
  useTestMailboxMutation,
} from '@/features/email/api/email.queries'
import MailboxFormModal from '@/features/email/components/MailboxFormModal.vue'
import type { Mailbox } from '@/features/email/types'
import { emailErrorMessage } from '@/features/email/utils/errors'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const toast = useToast()
const canManage = computed(() => auth.can('email.send'))

const mailboxesQuery = useMailboxesQuery()
const mailboxes = computed(() => mailboxesQuery.data.value ?? [])
const testMutation = useTestMailboxMutation()
const deleteMutation = useDeleteMailboxMutation()
const syncMutation = useSyncMailboxMutation()
const syncingID = ref('')

const statusStyles: Record<Mailbox['status'], { label: string; className: string }> = {
  active: { label: 'Terhubung', className: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'Bermasalah', className: 'bg-red-50 text-red-700' },
  disabled: { label: 'Nonaktif', className: 'bg-gray-100 text-gray-600' },
}

const formOpen = ref(false)
const editing = ref<Mailbox | null>(null)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(mailbox: Mailbox) {
  editing.value = mailbox
  formOpen.value = true
}

function onSaved(_: Mailbox, created: boolean) {
  formOpen.value = false
  toast.success(created ? 'Akun email terhubung.' : 'Pengaturan akun email disimpan.')
}

async function test(mailbox: Mailbox) {
  try {
    await testMutation.mutateAsync(mailbox.id)
    toast.success(`Koneksi ${mailbox.email_address} berhasil.`)
  } catch (error) {
    toast.error(emailErrorMessage(error))
  }
}

// Fire-and-poll: the sync itself runs in the background (see
// useSyncMailboxMutation), this only confirms it started.
async function syncNow(mailbox: Mailbox) {
  syncingID.value = mailbox.id
  try {
    await syncMutation.mutateAsync(mailbox.id)
    toast.success(`Memeriksa inbox ${mailbox.email_address}...`)
  } catch (error) {
    toast.error(emailErrorMessage(error))
  } finally {
    syncingID.value = ''
  }
}

const deleting = ref<Mailbox | null>(null)

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await deleteMutation.mutateAsync(deleting.value.id)
    toast.success('Akun email dihapus.')
  } catch (error) {
    toast.error(emailErrorMessage(error))
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Akun Email"
      description="Hubungkan email kerja Anda untuk mengirim email ke lead dan contact langsung dari CRM. Akun hanya bisa dipakai oleh Anda sendiri."
    >
      <BaseButton v-if="canManage" @click="openCreate">
        <Plus class="size-4" />
        Hubungkan akun
      </BaseButton>
    </PageHeader>

    <BaseCard v-if="mailboxesQuery.isPending.value" class="p-8 text-center text-sm text-gray-500">
      Memuat akun email...
    </BaseCard>
    <BaseCard v-else-if="mailboxesQuery.isError.value" class="p-8 text-center text-sm text-red-700">
      Akun email tidak dapat dimuat.
    </BaseCard>
    <BaseCard v-else-if="!mailboxes.length" class="grid place-items-center gap-3 p-10 text-center">
      <Mail class="size-8 text-gray-400" />
      <p class="font-medium">Belum ada akun email</p>
      <p class="max-w-md text-sm text-gray-500">
        Gmail, Outlook/Microsoft 365, Zoho, atau server email lain yang mendukung SMTP.
      </p>
      <BaseButton v-if="canManage" @click="openCreate">Hubungkan akun email</BaseButton>
    </BaseCard>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <BaseCard v-for="mailbox in mailboxes" :key="mailbox.id" class="space-y-3 !p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold">{{ mailbox.email_address }}</p>
            <p v-if="mailbox.display_name" class="truncate text-sm text-gray-500">
              {{ mailbox.display_name }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="statusStyles[mailbox.status].className"
          >
            {{ statusStyles[mailbox.status].label }}
          </span>
        </div>
        <dl class="grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
          <dt class="text-gray-500">SMTP</dt>
          <dd class="break-all">
            {{ mailbox.smtp_host }}:{{ mailbox.smtp_port }} ·
            {{ mailbox.smtp_security === 'ssl' ? 'SSL/TLS' : 'STARTTLS' }}
          </dd>
          <dt class="text-gray-500">IMAP</dt>
          <dd class="break-all">
            {{ mailbox.imap_host ? `${mailbox.imap_host}:${mailbox.imap_port}` : 'Belum diatur' }}
          </dd>
          <template v-if="mailbox.has_inbox_sync">
            <dt class="text-gray-500">Inbox</dt>
            <dd>
              {{
                mailbox.last_synced_at
                  ? `Terakhir dicek ${formatDate(mailbox.last_synced_at)}`
                  : 'Belum pernah dicek'
              }}
            </dd>
          </template>
        </dl>
        <p v-if="!mailbox.has_inbox_sync" class="text-xs text-gray-500">
          IMAP belum diatur — email masuk tidak muncul di tab Email. Edit akun ini untuk
          menambahkannya.
        </p>
        <p
          v-if="mailbox.status === 'error' && mailbox.last_error"
          class="rounded-lg bg-red-50 p-3 text-sm break-words text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ mailbox.last_error }}
        </p>
        <div v-if="canManage" class="flex flex-wrap justify-end gap-2 border-t pt-3">
          <BaseButton
            v-if="mailbox.has_inbox_sync"
            variant="outline"
            :disabled="syncingID === mailbox.id"
            @click="syncNow(mailbox)"
          >
            {{ syncingID === mailbox.id ? 'Memeriksa...' : 'Sync sekarang' }}
          </BaseButton>
          <BaseButton
            variant="outline"
            :disabled="testMutation.isPending.value"
            @click="test(mailbox)"
          >
            Tes koneksi
          </BaseButton>
          <BaseButton variant="outline" @click="openEdit(mailbox)">Edit</BaseButton>
          <BaseButton variant="secondary" @click="deleting = mailbox">Hapus</BaseButton>
        </div>
      </BaseCard>
    </div>

    <MailboxFormModal
      :open="formOpen"
      :mailbox="editing"
      @close="formOpen = false"
      @saved="onSaved"
    />
    <ConfirmDialog
      :open="Boolean(deleting)"
      title="Hapus akun email?"
      :message="`Riwayat email yang dikirim dari ${deleting?.email_address ?? ''} beserta lampirannya ikut terhapus dari CRM. Email di kotak masuk penerima tidak terpengaruh.`"
      confirm-label="Hapus"
      tone="danger"
      :loading="deleteMutation.isPending.value"
      @cancel="deleting = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
