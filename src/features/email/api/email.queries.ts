import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { emailApi } from '@/features/email/api/email.api'
import type { EmailListParams, MailboxPayload, SendEmailPayload } from '@/features/email/types'

export const emailKeys = {
  all: ['email'] as const,
  mailboxes: () => [...emailKeys.all, 'mailboxes'] as const,
  messages: () => [...emailKeys.all, 'messages'] as const,
  messageList: (params: EmailListParams) => [...emailKeys.messages(), 'list', params] as const,
  message: (id: string) => [...emailKeys.messages(), 'detail', id] as const,
}

// Queued messages turn sent/failed within seconds; poll only while one is.
const QUEUED_POLL_MS = 3000

export function useMailboxesQuery(enabled: Ref<boolean> = computed(() => true)) {
  return useQuery({
    queryKey: emailKeys.mailboxes(),
    queryFn: emailApi.listMailboxes,
    enabled,
    staleTime: 60_000,
  })
}

function useInvalidateMailboxes() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() })
}

export function useCreateMailboxMutation() {
  const invalidate = useInvalidateMailboxes()
  return useMutation({
    mutationFn: (payload: MailboxPayload) => emailApi.createMailbox(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateMailboxMutation() {
  const invalidate = useInvalidateMailboxes()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MailboxPayload }) =>
      emailApi.updateMailbox(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteMailboxMutation() {
  const invalidate = useInvalidateMailboxes()
  return useMutation({
    mutationFn: (id: string) => emailApi.deleteMailbox(id),
    onSuccess: invalidate,
  })
}

/** The status is saved either way, so the list is refreshed on error too. */
export function useTestMailboxMutation() {
  const invalidate = useInvalidateMailboxes()
  return useMutation({
    mutationFn: (id: string) => emailApi.testMailbox(id),
    onSettled: invalidate,
  })
}

// The backend answers immediately (202) and syncs in the background, so
// there's nothing to await for "done" — refetch shortly after to pick up
// the new status/last_synced_at and any newly synced email.
const SYNC_SETTLE_MS = 6000

export function useSyncMailboxMutation() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() })
    void queryClient.invalidateQueries({ queryKey: emailKeys.messages() })
  }
  return useMutation({
    mutationFn: (id: string) => emailApi.syncMailbox(id),
    onSuccess: () => {
      invalidate()
      setTimeout(invalidate, SYNC_SETTLE_MS)
    },
  })
}

export function useSendEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendEmailPayload) => emailApi.send(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailKeys.messages() }),
  })
}

export function useEmailMessagesQuery(params: Ref<EmailListParams>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => emailKeys.messageList(params.value)),
    queryFn: () => emailApi.listMessages(params.value),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data.some((message) => message.status === 'queued')
        ? QUEUED_POLL_MS
        : false,
  })
}

export function useEmailMessageQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => emailKeys.message(id.value)),
    queryFn: () => emailApi.message(id.value),
    enabled: computed(() => Boolean(id.value)),
    refetchInterval: (query) => (query.state.data?.status === 'queued' ? QUEUED_POLL_MS : false),
  })
}
