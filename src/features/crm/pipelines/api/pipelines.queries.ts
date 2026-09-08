import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  pipelinesApi,
  type PipelineListParams,
  type PipelinePayload,
  type StageInput,
} from '@/features/crm/pipelines/api/pipelines.api'

export const pipelineKeys = {
  all: ['crm', 'pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  list: (params: PipelineListParams) => [...pipelineKeys.lists(), params] as const,
  details: () => [...pipelineKeys.all, 'detail'] as const,
  detail: (id: string) => [...pipelineKeys.details(), id] as const,
}

export function usePipelinesQuery(params: Ref<PipelineListParams>) {
  return useQuery({
    queryKey: computed(() => pipelineKeys.list(params.value)),
    queryFn: () => pipelinesApi.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreatePipelineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PipelinePayload) => pipelinesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

export function useUpdatePipelineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<Pick<PipelinePayload, 'name' | 'is_default'>>
    }) => pipelinesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

export function useDeletePipelineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pipelinesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

export function useRestorePipelineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pipelinesApi.restore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

export function useArchivePipelineMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pipelinesApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}

export function useReplaceStagesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stages }: { id: string; stages: StageInput[] }) =>
      pipelinesApi.replaceStages(id, stages),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pipelineKeys.all })
    },
  })
}
