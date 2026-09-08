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
}

export function useContactsQuery(params: Ref<ContactListParams>) {
  return useQuery({
    queryKey: computed(() => contactKeys.list(params.value)),
    queryFn: () => contactsApi.list(params.value),
    placeholderData: keepPreviousData,
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
