<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Maximize2, Minimize2, Minus, Paperclip, Send, Trash2, X } from 'lucide-vue-next'

import RichTextField from '@/components/form/RichTextField.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import { useMailboxesQuery, useSendEmailMutation } from '@/features/email/api/email.queries'
import { useEmailCompose } from '@/features/email/composables/useEmailCompose'
import { emailErrorMessage } from '@/features/email/utils/errors'
import {
  ATTACHMENT_ACCEPT,
  MAX_FILE_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  formatFileSize,
  invalidRecipients,
  isAllowedAttachment,
  splitRecipients,
} from '@/features/email/utils/recipients'

// Gmail-style compose window pinned to the bottom-right corner. Opened from
// anywhere through useEmailCompose(); mounted once in DashboardLayout.
const compose = useEmailCompose()
const toast = useToast()
const route = useRoute()

const mailboxesQuery = useMailboxesQuery(computed(() => compose.state.open))
const mailboxes = computed(() =>
  (mailboxesQuery.data.value ?? []).filter((mailbox) => mailbox.status !== 'disabled'),
)
const accountsRoute = computed(() =>
  String(route.name ?? '').startsWith('platform-') ? 'platform-email-accounts' : 'email-accounts',
)

const sendMutation = useSendEmailMutation()

const maximized = ref(false)
const showCcBcc = ref(false)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const form = reactive({ mailboxId: '', to: '', cc: '', bcc: '', subject: '', bodyHtml: '' })
let idempotencyKey = ''

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// A new session means a new email: reset everything from the draft.
watch(
  () => compose.state.session,
  () => {
    const draft = compose.state.draft
    Object.assign(form, {
      to: (draft.to ?? []).join(', '),
      cc: (draft.cc ?? []).join(', '),
      bcc: '',
      subject: draft.subject ?? '',
      bodyHtml: draft.bodyHtml ?? '',
    })
    showCcBcc.value = Boolean(draft.cc?.length)
    files.value = []
    errorMessage.value = ''
    maximized.value = false
    idempotencyKey = newKey()
  },
)

// Default sender: keep the chosen one, else the first usable mailbox.
watch(
  mailboxes,
  (list) => {
    if (!list.some((mailbox) => mailbox.id === form.mailboxId)) form.mailboxId = list[0]?.id ?? ''
  },
  { immediate: true },
)

const title = computed(() => form.subject.trim() || 'Pesan baru')
const totalBytes = computed(() => files.value.reduce((sum, file) => sum + file.size, 0))
const hasContent = computed(
  () =>
    Boolean(form.subject.trim()) ||
    form.bodyHtml.replace(/<[^>]*>/g, '').trim() !== '' ||
    files.value.length > 0,
)

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  errorMessage.value = ''
  for (const file of picked) {
    if (!isAllowedAttachment(file.name)) {
      errorMessage.value = `Tipe file "${file.name}" tidak didukung.`
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      errorMessage.value = `"${file.name}" melebihi 10MB.`
      continue
    }
    if (totalBytes.value + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
      errorMessage.value = 'Total lampiran maksimal 18MB.'
      continue
    }
    files.value = [...files.value, file]
  }
}

function removeFile(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}

function discard() {
  if (hasContent.value && !confirm('Buang email ini?')) return
  compose.close()
}

async function send() {
  errorMessage.value = ''
  const to = splitRecipients(form.to)
  const cc = splitRecipients(form.cc)
  const bcc = splitRecipients(form.bcc)
  if (!form.mailboxId) {
    errorMessage.value = 'Pilih akun email pengirim.'
    return
  }
  if (!to.length) {
    errorMessage.value = 'Isi minimal satu penerima.'
    return
  }
  const invalid = invalidRecipients([...to, ...cc, ...bcc])
  if (invalid.length) {
    errorMessage.value = `Alamat email tidak valid: ${invalid.join(', ')}`
    return
  }
  if (!form.subject.trim()) {
    errorMessage.value = 'Subjek wajib diisi.'
    return
  }
  const draft = compose.state.draft
  try {
    await sendMutation.mutateAsync({
      mailboxId: form.mailboxId,
      idempotencyKey,
      to,
      cc,
      bcc,
      subject: form.subject.trim(),
      bodyHtml: form.bodyHtml,
      inReplyTo: draft.inReplyTo,
      relatedEntityType: draft.relatedEntityType,
      relatedEntityId: draft.relatedEntityId,
      files: files.value,
    })
    toast.success('Email sedang dikirim.')
    compose.close()
  } catch (error) {
    errorMessage.value = emailErrorMessage(error)
    // The server answered, so this attempt is settled; a new key lets the
    // user send again. Without a response (network drop) the same key is
    // kept, so a retry cannot send the email twice.
    if (error && typeof error === 'object' && 'response' in error && error.response) {
      idempotencyKey = newKey()
    }
  }
}

const inputClass =
  'w-full border-0 border-b bg-transparent px-0 py-2 text-sm outline-none focus:border-brand-500 focus:ring-0 dark:border-gray-800'
</script>

<template>
  <Teleport to="body">
    <section
      v-if="compose.state.open"
      role="dialog"
      aria-label="Tulis email"
      class="fixed bottom-0 right-0 z-[55] flex w-full flex-col overflow-hidden border bg-white shadow-2xl sm:right-4 sm:rounded-t-xl dark:border-gray-800 dark:bg-gray-900"
      :class="[
        compose.state.minimized
          ? 'sm:w-80'
          : maximized
            ? 'sm:w-[min(56rem,calc(100vw-2rem))]'
            : 'sm:w-[34rem]',
        compose.state.minimized ? '' : maximized ? 'h-[88dvh]' : 'h-[min(38rem,88dvh)]',
      ]"
    >
      <header
        class="flex cursor-pointer items-center gap-2 bg-gray-900 px-3 py-2 text-white dark:bg-gray-800"
        @click="compose.setMinimized(!compose.state.minimized)"
      >
        <h2 class="min-w-0 flex-1 truncate text-sm font-medium">{{ title }}</h2>
        <button
          type="button"
          class="grid size-7 place-items-center rounded hover:bg-white/15"
          :aria-label="compose.state.minimized ? 'Buka' : 'Kecilkan'"
          @click.stop="compose.setMinimized(!compose.state.minimized)"
        >
          <Minus class="size-4" />
        </button>
        <button
          v-if="!compose.state.minimized"
          type="button"
          class="hidden size-7 place-items-center rounded hover:bg-white/15 sm:grid"
          :aria-label="maximized ? 'Perkecil jendela' : 'Perbesar jendela'"
          @click.stop="maximized = !maximized"
        >
          <Minimize2 v-if="maximized" class="size-4" />
          <Maximize2 v-else class="size-4" />
        </button>
        <button
          type="button"
          class="grid size-7 place-items-center rounded hover:bg-white/15"
          aria-label="Tutup"
          @click.stop="discard"
        >
          <X class="size-4" />
        </button>
      </header>

      <template v-if="!compose.state.minimized">
        <div
          v-if="mailboxesQuery.isPending.value"
          class="flex-1 p-6 text-center text-sm text-gray-500"
        >
          Memuat akun email...
        </div>
        <div
          v-else-if="!mailboxes.length"
          class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <p class="font-medium">Belum ada akun email terhubung</p>
          <p class="max-w-xs text-sm text-gray-500">
            Hubungkan email kerja Anda (Gmail, Outlook, atau server lain) untuk mengirim email dari
            CRM.
          </p>
          <RouterLink
            :to="{ name: accountsRoute }"
            class="text-sm font-medium text-brand-600 hover:underline"
            @click="compose.close()"
          >
            Hubungkan akun email
          </RouterLink>
        </div>

        <form v-else class="flex min-h-0 flex-1 flex-col" @submit.prevent="send">
          <div class="space-y-1 px-4 pt-1">
            <label class="flex items-center gap-2">
              <span class="w-12 shrink-0 text-xs text-gray-500">Dari</span>
              <select v-model="form.mailboxId" :class="inputClass" aria-label="Akun pengirim">
                <option v-for="mailbox in mailboxes" :key="mailbox.id" :value="mailbox.id">
                  {{
                    mailbox.display_name
                      ? `${mailbox.display_name} <${mailbox.email_address}>`
                      : mailbox.email_address
                  }}
                </option>
              </select>
            </label>
            <div class="flex items-center gap-2">
              <label class="flex min-w-0 flex-1 items-center gap-2">
                <span class="w-12 shrink-0 text-xs text-gray-500">Kepada</span>
                <input
                  v-model="form.to"
                  :class="inputClass"
                  placeholder="nama@perusahaan.com, ..."
                  autocomplete="off"
                />
              </label>
              <button
                v-if="!showCcBcc"
                type="button"
                class="shrink-0 text-xs text-gray-500 hover:text-gray-800"
                @click="showCcBcc = true"
              >
                Cc/Bcc
              </button>
            </div>
            <template v-if="showCcBcc">
              <label class="flex items-center gap-2">
                <span class="w-12 shrink-0 text-xs text-gray-500">Cc</span>
                <input v-model="form.cc" :class="inputClass" autocomplete="off" />
              </label>
              <label class="flex items-center gap-2">
                <span class="w-12 shrink-0 text-xs text-gray-500">Bcc</span>
                <input v-model="form.bcc" :class="inputClass" autocomplete="off" />
              </label>
            </template>
            <input
              v-model="form.subject"
              :class="inputClass"
              placeholder="Subjek"
              aria-label="Subjek"
              maxlength="900"
            />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <RichTextField v-model="form.bodyHtml" />

            <ul v-if="files.length" class="mt-3 flex flex-wrap gap-2">
              <li
                v-for="(file, index) in files"
                :key="`${file.name}-${index}`"
                class="flex max-w-full items-center gap-2 rounded-lg border bg-gray-50 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
              >
                <Paperclip class="size-3.5 shrink-0 text-gray-400" />
                <span class="truncate" :title="file.name">{{ file.name }}</span>
                <span class="shrink-0 text-gray-500">{{ formatFileSize(file.size) }}</span>
                <button
                  type="button"
                  class="shrink-0 text-gray-500 hover:text-red-600"
                  :aria-label="`Hapus lampiran ${file.name}`"
                  @click="removeFile(index)"
                >
                  <X class="size-3.5" />
                </button>
              </li>
            </ul>
            <p v-if="compose.state.draft.relatedEntityType" class="mt-3 text-xs text-gray-500">
              Email terkirim akan tercatat di timeline
              {{ compose.state.draft.relatedEntityType === 'lead' ? 'lead' : 'contact' }} ini.
            </p>
          </div>

          <p v-if="errorMessage" class="px-4 pb-2 text-sm text-red-600" role="alert">
            {{ errorMessage }}
          </p>

          <footer class="flex items-center gap-2 border-t px-4 py-3 dark:border-gray-800">
            <BaseButton type="submit" :disabled="sendMutation.isPending.value">
              <Send class="size-4" />
              {{ sendMutation.isPending.value ? 'Mengirim...' : 'Kirim' }}
            </BaseButton>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Lampirkan file"
              title="Lampirkan file (maks 10MB per file, total 18MB)"
              @click="fileInput?.click()"
            >
              <Paperclip class="size-4" />
            </button>
            <input
              ref="fileInput"
              type="file"
              multiple
              class="hidden"
              :accept="ATTACHMENT_ACCEPT"
              @change="addFiles"
            />
            <span v-if="files.length" class="text-xs text-gray-500">
              {{ formatFileSize(totalBytes) }} / 18 MB
            </span>
            <button
              type="button"
              class="ml-auto grid size-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Buang email"
              @click="discard"
            >
              <Trash2 class="size-4" />
            </button>
          </footer>
        </form>
      </template>
    </section>
  </Teleport>
</template>
