<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AlertCircle, Check, CheckCheck, Clock, MessageCircle, Send } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useToast } from '@/components/ui/toast'
import {
  useConversationMessagesQuery,
  useEntityConversationQuery,
  useMarkConversationReadMutation,
  useRetryMessageMutation,
  useSendMessageMutation,
  useSessionsQuery,
  useStartConversationMutation,
} from '@/features/whatsapp/api/whatsapp.queries'
import { useDocumentVisible } from '@/features/whatsapp/composables/useDocumentVisible'
import type { RelatedEntityType, WhatsAppMessage } from '@/features/whatsapp/types'
import { whatsappErrorMessage } from '@/features/whatsapp/utils/errors'
import { groupByDay, messageStatusLabels, messageTime } from '@/features/whatsapp/utils/messages'
import { formatPhone, normalizePhone } from '@/features/whatsapp/utils/session-status'
import { useAuthStore } from '@/stores/auth.store'

const MAX_MESSAGE_LENGTH = 4096

// Reusable for any CRM entity (lead today; contact detail and inbox later).
const props = defineProps<{
  relatedEntityType: RelatedEntityType
  relatedEntityId: string
  phone?: string
  entityName?: string
  /** The panel is the visible tab; gates message polling and mark-as-read. */
  active: boolean
}>()

defineEmits<{
  (e: 'edit-phone'): void
}>()

const auth = useAuthStore()
const route = useRoute()
const toast = useToast()
const visible = useDocumentVisible()

const canRead = computed(() => auth.can('whatsapp.conversation.read'))
const canSend = computed(() => auth.can('whatsapp.message.send'))
const whatsappPage = computed(() =>
  route.path.startsWith('/platform') ? { name: 'platform-whatsapp' } : { name: 'whatsapp' },
)

// --- conversation & sessions ---
const entityType = computed(() => props.relatedEntityType)
const entityId = computed(() => props.relatedEntityId)
const conversationQuery = useEntityConversationQuery(entityType, entityId, {
  enabled: canRead,
  visible,
})
const conversation = computed(() => conversationQuery.data.value ?? null)

const sessionsQuery = useSessionsQuery()
const connectedSessions = computed(() =>
  (sessionsQuery.data.value ?? []).filter((session) => session.status === 'WORKING'),
)
const selectedSessionId = ref('')
watch(
  connectedSessions,
  (sessions) => {
    if (sessions.some((session) => session.id === selectedSessionId.value)) return
    selectedSessionId.value =
      (sessions.find((session) => session.is_default) ?? sessions[0])?.id ?? ''
  },
  { immediate: true },
)

const normalizedPhone = computed(() => normalizePhone(props.phone ?? ''))

// --- start ---
const startMutation = useStartConversationMutation()
const startError = ref('')
async function startChat() {
  startError.value = ''
  try {
    await startMutation.mutateAsync({
      session_id: selectedSessionId.value || undefined,
      related_entity_type: props.relatedEntityType,
      related_entity_id: props.relatedEntityId,
    })
    await conversationQuery.refetch()
  } catch (error) {
    startError.value = whatsappErrorMessage(error)
  }
}

// --- messages ---
const conversationId = computed(() => conversation.value?.id ?? '')
const polling = computed(() => props.active && visible.value)
const messagesQuery = useConversationMessagesQuery(conversationId, polling)
const messages = computed<WhatsAppMessage[]>(() =>
  [...(messagesQuery.data.value?.pages ?? [])].reverse().flatMap((page) => page.messages),
)
const dayGroups = computed(() => groupByDay(messages.value))

const scroller = ref<HTMLElement | null>(null)
let stickToBottom = true

function onScroll() {
  const el = scroller.value
  if (!el) return
  stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

watch(
  () => messages.value.length,
  async () => {
    if (!stickToBottom) return
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  },
)

async function loadOlder() {
  const el = scroller.value
  const before = el?.scrollHeight ?? 0
  stickToBottom = false
  await messagesQuery.fetchNextPage()
  await nextTick()
  // Keep the message the user was reading in place.
  if (el) el.scrollTop += el.scrollHeight - before
}

// --- read state ---
const markReadMutation = useMarkConversationReadMutation()
watch(
  () => [props.active, conversation.value?.id, conversation.value?.unread_count] as const,
  ([active, id, unread]) => {
    if (active && id && (unread ?? 0) > 0 && !markReadMutation.isPending.value) {
      markReadMutation.mutate(id)
    }
  },
  { immediate: true },
)

// --- composer ---
const draft = ref('')
const sendMutation = useSendMessageMutation(conversationId)
const retryMutation = useRetryMessageMutation()

async function send() {
  const text = draft.value.trim()
  if (!text || sendMutation.isPending.value) return
  if (text.length > MAX_MESSAGE_LENGTH) {
    toast.error(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`)
    return
  }
  stickToBottom = true
  draft.value = ''
  try {
    const message = await sendMutation.mutateAsync(text)
    if (message.status === 'failed') toast.error('Pesan gagal terkirim. Coba kirim ulang.')
  } catch (error) {
    draft.value = text
    toast.error(whatsappErrorMessage(error))
  }
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

async function retry(message: WhatsAppMessage) {
  try {
    const result = await retryMutation.mutateAsync(message.id)
    if (result.status === 'failed') toast.error('Pesan masih gagal terkirim.')
  } catch (error) {
    toast.error(whatsappErrorMessage(error))
  }
}
</script>

<template>
  <div class="flex min-h-[28rem] flex-col">
    <p v-if="!canRead" class="py-12 text-center text-sm text-gray-600 dark:text-gray-400">
      Anda belum punya akses chat WhatsApp.
    </p>

    <p
      v-else-if="conversationQuery.isPending.value"
      class="py-12 text-center text-sm text-gray-600 dark:text-gray-400"
    >
      Memuat percakapan...
    </p>

    <div v-else-if="conversationQuery.isError.value" class="py-12 text-center" role="alert">
      <p class="text-sm text-red-600 dark:text-red-400">
        {{ whatsappErrorMessage(conversationQuery.error.value) }}
      </p>
      <BaseButton variant="outline" class="mt-3" @click="conversationQuery.refetch()">
        Coba lagi
      </BaseButton>
    </div>

    <!-- No conversation yet -->
    <div v-else-if="!conversation" class="mx-auto max-w-sm py-10 text-center">
      <MessageCircle class="mx-auto mb-3 size-8 text-gray-400" aria-hidden="true" />
      <template v-if="sessionsQuery.isPending.value">
        <p class="text-sm text-gray-600 dark:text-gray-400">Memeriksa nomor WhatsApp...</p>
      </template>
      <template v-else-if="connectedSessions.length === 0">
        <p class="font-medium text-gray-900 dark:text-gray-100">
          Belum ada nomor WhatsApp yang terhubung
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Hubungkan nomor tim dulu supaya bisa chat dengan lead dari sini.
        </p>
        <RouterLink
          :to="whatsappPage"
          class="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Buka halaman WhatsApp
        </RouterLink>
      </template>
      <template v-else-if="!normalizedPhone">
        <p class="font-medium text-gray-900 dark:text-gray-100">
          Nomor {{ entityName || 'lead' }} belum valid untuk WhatsApp
        </p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Isi nomor HP aktif, contoh 0812 3456 7890.
        </p>
        <BaseButton variant="outline" class="mt-4" @click="$emit('edit-phone')">
          Ubah nomor
        </BaseButton>
      </template>
      <template v-else-if="!canSend">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Belum ada chat dengan {{ entityName || 'lead ini' }}.
        </p>
      </template>
      <template v-else>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Belum ada chat dengan {{ entityName || 'lead ini' }}.
        </p>
        <label v-if="connectedSessions.length > 1" class="mt-4 block text-left">
          <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kirim dari
          </span>
          <select
            v-model="selectedSessionId"
            class="w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-950"
          >
            <option v-for="session in connectedSessions" :key="session.id" :value="session.id">
              {{ session.display_name || formatPhone(session.phone) }}
            </option>
          </select>
        </label>
        <BaseButton class="mt-4" :disabled="startMutation.isPending.value" @click="startChat">
          {{
            startMutation.isPending.value
              ? 'Membuka chat...'
              : `Mulai chat ke ${formatPhone(normalizedPhone)}`
          }}
        </BaseButton>
        <p v-if="startError" class="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {{ startError }}
        </p>
      </template>
    </div>

    <!-- Thread -->
    <template v-else>
      <div class="flex items-center justify-between border-b pb-3 dark:border-gray-800">
        <div>
          <p class="font-medium text-gray-900 dark:text-gray-100">
            {{ conversation.contact_name || entityName || formatPhone(conversation.phone) }}
          </p>
          <p class="text-xs text-gray-600 dark:text-gray-400">
            {{ formatPhone(conversation.phone) }}
            <span v-if="conversation.status === 'closed'"> · Ditutup</span>
          </p>
        </div>
      </div>

      <div
        ref="scroller"
        class="max-h-[32rem] min-h-64 flex-1 space-y-4 overflow-y-auto py-4"
        aria-live="polite"
        @scroll="onScroll"
      >
        <div v-if="messagesQuery.hasNextPage.value" class="text-center">
          <button
            type="button"
            class="text-sm font-medium text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
            :disabled="messagesQuery.isFetchingNextPage.value"
            @click="loadOlder"
          >
            {{ messagesQuery.isFetchingNextPage.value ? 'Memuat...' : 'Muat pesan lebih lama' }}
          </button>
        </div>

        <p
          v-if="messagesQuery.isPending.value"
          class="text-center text-sm text-gray-600 dark:text-gray-400"
        >
          Memuat pesan...
        </p>
        <div v-else-if="messagesQuery.isError.value" class="text-center" role="alert">
          <p class="text-sm text-red-600 dark:text-red-400">
            {{ whatsappErrorMessage(messagesQuery.error.value) }}
          </p>
          <BaseButton variant="outline" class="mt-3" @click="messagesQuery.refetch()">
            Coba lagi
          </BaseButton>
        </div>
        <p
          v-else-if="messages.length === 0"
          class="text-center text-sm text-gray-600 dark:text-gray-400"
        >
          Belum ada pesan. Tulis pesan pertama di bawah.
        </p>

        <section v-for="group in dayGroups" :key="group.key" class="space-y-2">
          <p class="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {{ group.label }}
          </p>
          <div
            v-for="message in group.messages"
            :key="message.id"
            class="flex"
            :class="message.direction === 'out' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
              :class="
                message.direction === 'out'
                  ? 'bg-brand-50 text-gray-900 dark:bg-brand-500/15 dark:text-gray-100'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              "
              :data-direction="message.direction"
            >
              <p v-if="message.body" class="whitespace-pre-wrap break-words">{{ message.body }}</p>
              <p v-else-if="message.has_media" class="italic text-gray-600 dark:text-gray-400">
                [media] Lampiran belum didukung
              </p>
              <div
                class="mt-1 flex items-center justify-end gap-1 text-xs text-gray-600 dark:text-gray-400"
              >
                <span>{{ messageTime(message) }}</span>
                <template v-if="message.direction === 'out'">
                  <Clock
                    v-if="message.status === 'pending'"
                    class="size-3.5"
                    :aria-label="messageStatusLabels.pending"
                  />
                  <Check
                    v-else-if="message.status === 'sent'"
                    class="size-3.5"
                    :aria-label="messageStatusLabels.sent"
                  />
                  <CheckCheck
                    v-else-if="message.status === 'delivered'"
                    class="size-3.5"
                    :aria-label="messageStatusLabels.delivered"
                  />
                  <CheckCheck
                    v-else-if="message.status === 'read'"
                    class="size-3.5 text-brand-600 dark:text-brand-400"
                    :aria-label="messageStatusLabels.read"
                  />
                  <AlertCircle
                    v-else
                    class="size-3.5 text-red-600 dark:text-red-400"
                    :aria-label="messageStatusLabels.failed"
                  />
                </template>
              </div>
              <div
                v-if="message.status === 'failed'"
                class="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs"
              >
                <span class="text-red-700 dark:text-red-300">
                  {{ message.error || 'Gagal terkirim' }}
                </span>
                <button
                  v-if="canSend"
                  type="button"
                  class="font-medium text-brand-700 hover:underline disabled:opacity-60 dark:text-brand-300"
                  :disabled="retryMutation.isPending.value"
                  @click="retry(message)"
                >
                  Kirim ulang
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <form
        v-if="canSend"
        class="flex items-end gap-2 border-t pt-3 dark:border-gray-800"
        @submit.prevent="send"
      >
        <label class="sr-only" for="wa-composer">Tulis pesan WhatsApp</label>
        <textarea
          id="wa-composer"
          v-model="draft"
          rows="2"
          :maxlength="MAX_MESSAGE_LENGTH"
          placeholder="Tulis pesan... (Enter kirim, Shift+Enter baris baru)"
          class="min-h-11 flex-1 resize-none rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 dark:bg-gray-950 dark:focus:ring-brand-900"
          @keydown="onComposerKeydown"
        ></textarea>
        <BaseButton type="submit" :disabled="!draft.trim() || sendMutation.isPending.value">
          <Send class="size-4" aria-hidden="true" />
          Kirim
        </BaseButton>
      </form>
      <p v-else class="border-t pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
        Anda hanya bisa membaca chat ini.
      </p>
    </template>
  </div>
</template>
