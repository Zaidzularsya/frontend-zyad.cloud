<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Download, Mail, Paperclip, Pencil, Reply } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import { emailApi } from '@/features/email/api/email.api'
import {
  useEmailMessageQuery,
  useEmailMessagesQuery,
  useMailboxesQuery,
} from '@/features/email/api/email.queries'
import { useEmailCompose } from '@/features/email/composables/useEmailCompose'
import type { EmailDirection, EmailEntityType, EmailMessage } from '@/features/email/types'
import { emailErrorMessage } from '@/features/email/utils/errors'
import { formatFileSize, replySubject } from '@/features/email/utils/recipients'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// Emails exchanged with one CRM record, from the viewer's own mailboxes:
// every message where the record's address is a participant.
const props = defineProps<{
  email?: string
  entityType: EmailEntityType
  entityId: string
  entityName?: string
}>()

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()
const compose = useEmailCompose()
const canSend = computed(() => auth.can('email.send'))

const accountsRoute = computed(() =>
  String(route.name ?? '').startsWith('platform-') ? 'platform-email-accounts' : 'email-accounts',
)

const mailboxesQuery = useMailboxesQuery()
const hasMailbox = computed(() => (mailboxesQuery.data.value ?? []).length > 0)

const filters: { value: EmailDirection | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'outbound', label: 'Terkirim' },
  { value: 'inbound', label: 'Masuk' },
]
const direction = ref<EmailDirection | 'all'>('all')
const page = ref(1)
watch([direction, () => props.email], () => {
  page.value = 1
})

const params = computed(() => ({
  page: page.value,
  per_page: 20,
  participant: props.email,
  direction: direction.value === 'all' ? undefined : direction.value,
}))
const messagesQuery = useEmailMessagesQuery(
  params,
  computed(() => Boolean(props.email) && hasMailbox.value),
)
const messages = computed(() => messagesQuery.data.value?.data ?? [])
const totalPages = computed(() => messagesQuery.data.value?.meta.total_pages ?? 1)

const openId = ref('')
const messageQuery = useEmailMessageQuery(openId)
const opened = computed(() => messageQuery.data.value)

const statusStyles: Record<EmailMessage['status'], { label: string; className: string }> = {
  queued: { label: 'Mengirim', className: 'bg-amber-50 text-amber-700' },
  sent: { label: 'Terkirim', className: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Gagal', className: 'bg-red-50 text-red-700' },
  received: { label: 'Masuk', className: 'bg-sky-50 text-sky-700' },
}

function counterpart(message: EmailMessage) {
  return message.direction === 'inbound'
    ? `Dari ${message.from_name || message.from_address}`
    : `Kepada ${message.to.join(', ')}`
}

function writeNew() {
  compose.open({
    to: props.email ? [props.email] : [],
    relatedEntityType: props.entityType,
    relatedEntityId: props.entityId,
  })
}

function reply(message: EmailMessage) {
  compose.open({
    to: message.direction === 'inbound' ? [message.from_address] : message.to,
    subject: replySubject(message.subject),
    inReplyTo: message.message_id,
    relatedEntityType: props.entityType,
    relatedEntityId: props.entityId,
  })
}

async function download(messageId: string, attachmentId: string) {
  try {
    window.open(await emailApi.attachmentDownloadUrl(messageId, attachmentId), '_blank', 'noopener')
  } catch (error) {
    toast.error(emailErrorMessage(error))
  }
}

// The body is rendered in a sandboxed iframe without scripts: stored HTML
// is sanitized by the backend, and the sandbox is the second fence. Links
// open in a new tab.
const frameDocument = computed(() => {
  const body = opened.value?.body_html ?? ''
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;margin:0;padding:0;word-break:break-word}
a{color:#2563eb}img{max-width:100%;height:auto}p{margin:0 0 .75em}</style></head><body>${body}</body></html>`
})
</script>

<template>
  <div class="space-y-4">
    <!-- Reader -->
    <div v-if="openId" class="space-y-4">
      <button
        type="button"
        class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
        @click="openId = ''"
      >
        <ArrowLeft class="size-4" />
        Kembali ke daftar email
      </button>
      <p v-if="messageQuery.isPending.value" class="py-8 text-center text-sm text-gray-500">
        Memuat email...
      </p>
      <p v-else-if="!opened" class="py-8 text-center text-sm text-red-700">
        Email tidak dapat dimuat.
      </p>
      <article v-else class="space-y-4">
        <header class="space-y-2">
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-lg font-semibold break-words">
              {{ opened.subject || '(tanpa subjek)' }}
            </h3>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="statusStyles[opened.status].className"
            >
              {{ statusStyles[opened.status].label }}
            </span>
          </div>
          <dl class="grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
            <dt class="text-gray-500">Dari</dt>
            <dd class="break-all">
              {{
                opened.from_name
                  ? `${opened.from_name} <${opened.from_address}>`
                  : opened.from_address
              }}
            </dd>
            <dt class="text-gray-500">Kepada</dt>
            <dd class="break-all">{{ opened.to.join(', ') }}</dd>
            <template v-if="opened.cc.length">
              <dt class="text-gray-500">Cc</dt>
              <dd class="break-all">{{ opened.cc.join(', ') }}</dd>
            </template>
            <template v-if="opened.bcc.length">
              <dt class="text-gray-500">Bcc</dt>
              <dd class="break-all">{{ opened.bcc.join(', ') }}</dd>
            </template>
            <dt class="text-gray-500">Waktu</dt>
            <dd>{{ formatDate(opened.sent_at ?? opened.created_at) }}</dd>
          </dl>
          <p
            v-if="opened.status === 'failed' && opened.error"
            class="rounded-lg bg-red-50 p-3 text-sm break-words text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            Gagal terkirim: {{ opened.error }}
          </p>
        </header>

        <iframe
          :srcdoc="frameDocument"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          title="Isi email"
          class="h-[26rem] w-full rounded-lg border bg-white dark:border-gray-800"
        />

        <ul v-if="opened.attachments.length" class="flex flex-wrap gap-2">
          <li v-for="attachment in opened.attachments" :key="attachment.id">
            <button
              type="button"
              class="flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              @click="download(opened.id, attachment.id)"
            >
              <Paperclip class="size-4 shrink-0 text-gray-400" />
              <span class="truncate">{{ attachment.filename }}</span>
              <span class="shrink-0 text-xs text-gray-500">
                {{ formatFileSize(attachment.size_bytes) }}
              </span>
              <Download class="size-4 shrink-0 text-gray-500" />
            </button>
          </li>
        </ul>

        <BaseButton v-if="canSend" variant="outline" @click="reply(opened)">
          <Reply class="size-4" />
          Balas
        </BaseButton>
      </article>
    </div>

    <!-- List -->
    <template v-else>
      <div
        v-if="!email"
        class="grid place-items-center gap-2 py-16 text-center text-sm text-gray-500"
      >
        <Mail class="size-8 text-gray-400" />
        <p class="font-medium text-gray-800 dark:text-gray-200">
          {{ entityName || 'Record ini' }} belum punya alamat email.
        </p>
        <p>Tambahkan email di panel profil untuk mulai berkirim email.</p>
      </div>

      <div
        v-else-if="!mailboxesQuery.isPending.value && !hasMailbox"
        class="grid place-items-center gap-2 py-16 text-center"
      >
        <Mail class="size-8 text-gray-400" />
        <p class="font-medium">Hubungkan akun email Anda</p>
        <p class="max-w-sm text-sm text-gray-500">
          Email dikirim dari akun kerja Anda sendiri (Gmail, Outlook, dll) dan riwayatnya tampil di
          sini.
        </p>
        <RouterLink
          :to="{ name: accountsRoute }"
          class="text-sm font-medium text-brand-600 hover:underline"
        >
          Hubungkan akun email
        </RouterLink>
      </div>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
            <button
              v-for="filter in filters"
              :key="filter.value"
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium"
              :class="
                direction === filter.value
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700'
              "
              @click="direction = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
          <BaseButton v-if="canSend" @click="writeNew">
            <Pencil class="size-4" />
            Tulis email
          </BaseButton>
        </div>

        <p v-if="messagesQuery.isPending.value" class="py-8 text-center text-sm text-gray-500">
          Memuat email...
        </p>
        <p v-else-if="messagesQuery.isError.value" class="py-8 text-center text-sm text-red-700">
          Email tidak dapat dimuat.
        </p>
        <div v-else-if="!messages.length" class="py-10 text-center text-sm text-gray-500">
          <p>Belum ada email dengan {{ email }}.</p>
          <p v-if="direction === 'inbound'" class="mt-1">
            Email masuk tampil di sini setelah sinkronisasi inbox diaktifkan.
          </p>
        </div>
        <ul v-else class="divide-y rounded-xl border dark:divide-gray-800 dark:border-gray-800">
          <li v-for="message in messages" :key="message.id">
            <button
              type="button"
              class="block w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
              @click="openId = message.id"
            >
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span class="min-w-0 flex-1 truncate">{{ counterpart(message) }}</span>
                <Paperclip v-if="message.attachments.length" class="size-3.5 shrink-0" />
                <span
                  v-if="message.status !== 'sent' && message.status !== 'received'"
                  class="shrink-0 rounded-full px-2 py-0.5 font-medium"
                  :class="statusStyles[message.status].className"
                >
                  {{ statusStyles[message.status].label }}
                </span>
                <span class="shrink-0">{{
                  formatDate(message.sent_at ?? message.created_at)
                }}</span>
              </div>
              <p class="mt-1 truncate font-medium">{{ message.subject || '(tanpa subjek)' }}</p>
              <p v-if="message.snippet" class="truncate text-sm text-gray-500">
                {{ message.snippet }}
              </p>
            </button>
          </li>
        </ul>

        <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 text-sm">
          <BaseButton variant="secondary" :disabled="page <= 1" @click="page -= 1">
            Sebelumnya
          </BaseButton>
          <span class="text-gray-500">{{ page }} / {{ totalPages }}</span>
          <BaseButton variant="secondary" :disabled="page >= totalPages" @click="page += 1">
            Berikutnya
          </BaseButton>
        </div>
      </template>
    </template>
  </div>
</template>
