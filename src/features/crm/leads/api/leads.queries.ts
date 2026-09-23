import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  leadsApi,
  type LeadListParams,
  type LeadPayload,
  type LeadStatus,
} from '@/features/crm/leads/api/leads.api'
import { companyKeys } from '@/features/crm/companies/api/companies.queries'
import { contactKeys } from '@/features/crm/contacts/api/contacts.queries'

export const leadKeys = {
  all: ['crm', 'leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  attachments: (id: string) => [...leadKeys.detail(id), 'attachments'] as const,
  members: () => ['crm', 'members'] as const,
}

export function useLeadsQuery(params: Ref<LeadListParams>) {
  return useQuery({
    queryKey: computed(() => leadKeys.list(params.value)),
    queryFn: () => leadsApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useLeadQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => leadKeys.detail(id.value)),
    queryFn: () => leadsApi.detail(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useCreateLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LeadPayload) => leadsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
    },
  })
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<LeadPayload & { status: LeadStatus }>
    }) => leadsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
    },
  })
}

export function useDeleteLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
    },
  })
}

export function useRestoreLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leadsApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
    },
  })
}

export function useAssignLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ownerUserId }: { id: string; ownerUserId: string }) =>
      leadsApi.assign(id, ownerUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
    },
  })
}

export function useConvertLeadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, createCompany }: { id: string; createCompany: boolean }) =>
      leadsApi.convert(id, { create_company: createCompany }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
      void queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}

export function useLeadAttachmentsQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => leadKeys.attachments(id.value)),
    queryFn: () => leadsApi.attachments(id.value),
    enabled: computed(() => Boolean(id.value)),
  })
}

export function useUploadLeadAttachmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => leadsApi.uploadAttachment(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.attachments(id) })
    },
  })
}

export function useDeleteLeadAttachmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      leadsApi.deleteAttachment(id, attachmentId),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.attachments(id) })
    },
  })
}

// Daftar anggota jarang berubah dalam satu sesi; staleTime panjang supaya
// dropdown owner tidak refetch tiap halaman detail dibuka.
export function useCrmMembersQuery() {
  return useQuery({
    queryKey: leadKeys.members(),
    queryFn: () => leadsApi.members(),
    staleTime: 5 * 60 * 1000,
  })
}
