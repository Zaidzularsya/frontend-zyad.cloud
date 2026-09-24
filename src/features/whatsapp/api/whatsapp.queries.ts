import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { whatsappApi } from '@/features/whatsapp/api/whatsapp.api'
import type {
  CreateSessionPayload,
  MessagePage,
  RelatedEntityType,
  StartConversationPayload,
  UpdateSessionPayload,
  WhatsAppMessage,
} from '@/features/whatsapp/types'

const POLL_INTERVAL_MS = 3000

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  sessions: () => [...whatsappKeys.all, 'sessions'] as const,
  status: (id: string) => [...whatsappKeys.all, 'status', id] as const,
  qr: (id: string) => [...whatsappKeys.all, 'qr', id] as const,
  entityConversation: (type: RelatedEntityType, id: string) =>
    [...whatsappKeys.all, 'entity-conversation', type, id] as const,
  messages: (conversationId: string) => [...whatsappKeys.all, 'messages', conversationId] as const,
}

const CONVERSATION_POLL_MS = 15000
const MESSAGES_POLL_MS = 5000
const MESSAGES_PAGE_SIZE = 30

export function useSessionsQuery() {
  return useQuery({
    queryKey: whatsappKeys.sessions(),
    queryFn: whatsappApi.listSessions,
  })
}

/** Polls the session status every 3s while enabled (connect modal open). */
export function useSessionStatusQuery(id: Ref<string>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => whatsappKeys.status(id.value)),
    queryFn: () => whatsappApi.sessionStatus(id.value),
    enabled: computed(() => enabled.value && Boolean(id.value)),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 0,
  })
}

/** Refreshes the QR every 3s while enabled; WAHA rotates it periodically. */
export function useSessionQRQuery(id: Ref<string>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => whatsappKeys.qr(id.value)),
    queryFn: () => whatsappApi.sessionQR(id.value),
    enabled: computed(() => enabled.value && Boolean(id.value)),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 0,
    retry: false,
  })
}

function useInvalidateSessions() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: whatsappKeys.all })
}

export function useCreateSessionMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (payload: CreateSessionPayload) => whatsappApi.createSession(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateSessionMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSessionPayload }) =>
      whatsappApi.updateSession(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteSessionMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (id: string) => whatsappApi.deleteSession(id),
    onSuccess: invalidate,
  })
}

export function useStartSessionMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (id: string) => whatsappApi.startSession(id),
    onSuccess: invalidate,
  })
}

export function useLogoutSessionMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (id: string) => whatsappApi.logoutSession(id),
    onSuccess: invalidate,
  })
}

export function usePairingCodeMutation() {
  return useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: string }) =>
      whatsappApi.requestPairingCode(id, phone),
  })
}

/**
 * The conversation linked to a CRM entity (first match), or null. Polls
 * every 15s while `visible` so the unread badge stays current.
 */
export function useEntityConversationQuery(
  type: Ref<RelatedEntityType>,
  id: Ref<string>,
  options: { enabled: Ref<boolean>; visible: Ref<boolean> },
) {
  return useQuery({
    queryKey: computed(() => whatsappKeys.entityConversation(type.value, id.value)),
    queryFn: async () => {
      const conversations = await whatsappApi.listConversations({
        related_entity_type: type.value,
        related_entity_id: id.value,
        per_page: 1,
      })
      return conversations[0] ?? null
    },
    enabled: computed(() => options.enabled.value && Boolean(id.value)),
    refetchInterval: computed(() => (options.visible.value ? CONVERSATION_POLL_MS : false)),
  })
}

/**
 * Messages of a conversation, newest page first (pages[0] has no cursor).
 * Polls every 5s only while `polling` (tab active and browser tab visible).
 */
export function useConversationMessagesQuery(conversationId: Ref<string>, polling: Ref<boolean>) {
  return useInfiniteQuery({
    queryKey: computed(() => whatsappKeys.messages(conversationId.value)),
    queryFn: ({ pageParam }) =>
      whatsappApi.listMessages(conversationId.value, pageParam || undefined, MESSAGES_PAGE_SIZE),
    initialPageParam: '',
    getNextPageParam: (lastPage: MessagePage) => lastPage.next_before || undefined,
    enabled: computed(() => Boolean(conversationId.value)),
    refetchInterval: computed(() => (polling.value ? MESSAGES_POLL_MS : false)),
  })
}

export function useStartConversationMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (payload: StartConversationPayload) => whatsappApi.startConversation(payload),
    onSuccess: invalidate,
  })
}

type MessagesData = InfiniteData<MessagePage, string>

/**
 * Sends a message with an optimistic "pending" bubble appended to the
 * newest page; the server result (sent or failed) replaces it on refetch.
 */
export function useSendMessageMutation(conversationId: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => whatsappApi.sendMessage(conversationId.value, text),
    onMutate: async (text: string) => {
      const key = whatsappKeys.messages(conversationId.value)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MessagesData>(key)
      const optimistic: WhatsAppMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId.value,
        direction: 'out',
        body: text,
        has_media: false,
        status: 'pending',
        sent_at: new Date().toISOString(),
      }
      const [newest, ...older] = previous?.pages ?? []
      if (previous && newest) {
        queryClient.setQueryData<MessagesData>(key, {
          ...previous,
          pages: [{ ...newest, messages: [...newest.messages, optimistic] }, ...older],
        })
      }
      return { previous }
    },
    onError: (_error, _text, context) => {
      if (context?.previous) {
        queryClient.setQueryData(whatsappKeys.messages(conversationId.value), context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
  })
}

export function useRetryMessageMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (messageId: string) => whatsappApi.retryMessage(messageId),
    onSettled: invalidate,
  })
}

export function useMarkConversationReadMutation() {
  const invalidate = useInvalidateSessions()
  return useMutation({
    mutationFn: (conversationId: string) => whatsappApi.markConversationRead(conversationId),
    onSuccess: invalidate,
  })
}
