import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { whatsappApi } from '@/features/whatsapp/api/whatsapp.api'
import type { CreateSessionPayload, UpdateSessionPayload } from '@/features/whatsapp/types'

const POLL_INTERVAL_MS = 3000

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  sessions: () => [...whatsappKeys.all, 'sessions'] as const,
  status: (id: string) => [...whatsappKeys.all, 'status', id] as const,
  qr: (id: string) => [...whatsappKeys.all, 'qr', id] as const,
}

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
