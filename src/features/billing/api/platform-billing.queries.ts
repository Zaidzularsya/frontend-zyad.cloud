import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  platformBillingApi,
  type CreatePlatformBillingPlanPayload,
  type PlatformBillingFeatureListParams,
  type PlatformBillingPlanListParams,
  type PlatformBillingPlanPricePayload,
  type ReplacePlatformBillingPlanEntitlementsPayload,
  type UpdatePlatformBillingPlanPayload,
  type UpdatePlatformBillingPlanPricePayload,
} from '@/features/billing/api/platform-billing.api'

export const platformBillingKeys = {
  all: ['platform-billing'] as const,
  plans: () => [...platformBillingKeys.all, 'plans'] as const,
  planList: (params: PlatformBillingPlanListParams) =>
    [...platformBillingKeys.plans(), params] as const,
  planDetail: (id: string) => [...platformBillingKeys.plans(), 'detail', id] as const,
  planPrices: (id: string, includeDeleted: boolean) =>
    [...platformBillingKeys.planDetail(id), 'prices', includeDeleted] as const,
  features: () => [...platformBillingKeys.all, 'features'] as const,
  featureList: (params: PlatformBillingFeatureListParams) =>
    [...platformBillingKeys.features(), params] as const,
  planEntitlements: (id: string) =>
    [...platformBillingKeys.planDetail(id), 'entitlements'] as const,
}

export function usePlatformBillingPlansQuery(params: Ref<PlatformBillingPlanListParams>) {
  return useQuery({
    queryKey: computed(() => platformBillingKeys.planList({ ...params.value })),
    queryFn: () => platformBillingApi.listPlans(params.value),
    placeholderData: keepPreviousData,
  })
}

export function usePlatformBillingPlanDetailQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => platformBillingKeys.planDetail(id.value)),
    queryFn: () => platformBillingApi.getPlan(id.value),
    enabled: computed(() => Boolean(id.value.trim())),
  })
}

export function usePlatformBillingPlanPricesQuery(id: Ref<string>, includeDeleted: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => platformBillingKeys.planPrices(id.value, includeDeleted.value)),
    queryFn: () => platformBillingApi.listPlanPrices(id.value, includeDeleted.value),
    enabled: computed(() => Boolean(id.value.trim())),
  })
}

export function usePlatformBillingFeaturesQuery(params: Ref<PlatformBillingFeatureListParams>) {
  return useQuery({
    queryKey: computed(() => platformBillingKeys.featureList({ ...params.value })),
    queryFn: () => platformBillingApi.listFeatures(params.value),
    placeholderData: keepPreviousData,
  })
}

export function usePlatformBillingPlanEntitlementsQuery(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => platformBillingKeys.planEntitlements(id.value)),
    queryFn: () => platformBillingApi.listPlanEntitlements(id.value),
    enabled: computed(() => Boolean(id.value.trim())),
  })
}

export function useCreatePlatformBillingPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePlatformBillingPlanPayload) =>
      platformBillingApi.createPlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
    },
  })
}

export function useUpdatePlatformBillingPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlatformBillingPlanPayload }) =>
      platformBillingApi.updatePlan(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planDetail(id) })
    },
  })
}

export function useDeletePlatformBillingPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => platformBillingApi.deletePlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
    },
  })
}

export function useCreatePlatformBillingPlanPriceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlatformBillingPlanPricePayload }) =>
      platformBillingApi.createPlanPrice(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planDetail(id) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planPrices(id, false) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
    },
  })
}

export function useUpdatePlatformBillingPlanPriceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      priceId,
      payload,
    }: {
      id: string
      priceId: string
      payload: UpdatePlatformBillingPlanPricePayload
    }) => platformBillingApi.updatePlanPrice(id, priceId, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planDetail(id) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planPrices(id, false) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
    },
  })
}

export function useDeletePlatformBillingPlanPriceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, priceId }: { id: string; priceId: string }) =>
      platformBillingApi.deletePlanPrice(id, priceId),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planDetail(id) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planPrices(id, false) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.plans() })
    },
  })
}

export function useReplacePlatformBillingPlanEntitlementsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: ReplacePlatformBillingPlanEntitlementsPayload
    }) => platformBillingApi.replacePlanEntitlements(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planEntitlements(id) })
      void queryClient.invalidateQueries({ queryKey: platformBillingKeys.planDetail(id) })
    },
  })
}
