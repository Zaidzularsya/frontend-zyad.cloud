import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  contactsApi,
  type ContactListParams,
  type ContactPayload,
} from '@/features/crm/contacts/api/contacts.api'

export const contactKeys = {
  all: ['crm', 'contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (params: ContactListParams) => [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  attachments: (id: string) => [...contactKeys.detail(id), 'attachments'] as const,
}

export function useContactsQuery(params: Ref<ContactListParams>) {
  return useQuery({
    queryKey: computed(() => contactKeys.list(params.value)),
    queryFn: () => contactsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useContactQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => contactKeys.detail(id.value)),
    queryFn: () => contactsApi.detail(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useCreateContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContactPayload) => contactsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
    },
  })
}

export function useUpdateContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ContactPayload> }) =>
      contactsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
    },
  })
}

export function useDeleteContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
    },
  })
}

export function useRestoreContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
    },
  })
}

export function useContactAttachmentsQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => contactKeys.attachments(id.value)),
    queryFn: () => contactsApi.attachments(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useUploadContactAttachmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      contactsApi.uploadAttachment(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.attachments(id) })
    },
  })
}

export function useDeleteContactAttachmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      contactsApi.deleteAttachment(id, attachmentId),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.attachments(id) })
    },
  })
}
