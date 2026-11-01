import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, type Ref } from 'vue'

import { mikrotikApi } from '@/features/mikrotik/api/mikrotik.api'
import type {
  ApplySetupPayload,
  CreateRouterPayload,
  PairBulkItem,
  SecretListParams,
  SetPolicyPayload,
  SetupPayload,
  TaskListParams,
  UpdateRouterPayload,
} from '@/features/mikrotik/types'

export const mikrotikKeys = {
  all: ['mikrotik'] as const,
  routers: (params: object = {}) => [...mikrotikKeys.all, 'routers', params] as const,
  secrets: (params: object) => [...mikrotikKeys.all, 'secrets', params] as const,
  accountSearch: (q: string) => [...mikrotikKeys.all, 'account-search', q] as const,
  onboarding: () => [...mikrotikKeys.all, 'onboarding'] as const,
  customerStatus: (ids: string[]) => [...mikrotikKeys.all, 'customer-status', ids] as const,
  policy: (accountId: string) => [...mikrotikKeys.all, 'policy', accountId] as const,
  unmarkedProducts: () => [...mikrotikKeys.all, 'products', 'unmarked'] as const,
  triggers: () => [...mikrotikKeys.all, 'products', 'triggers'] as const,
  triggerPreview: (productId: string) =>
    [...mikrotikKeys.all, 'products', 'preview', productId] as const,
  tasks: (params: object) => [...mikrotikKeys.all, 'tasks', params] as const,
  taskSummary: () => [...mikrotikKeys.all, 'task-summary'] as const,
}

// Router, secret, tugas, onboarding, dan status pelanggan saling terkait: mutation menyegarkan semuanya.
function useInvalidateMikrotik() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: mikrotikKeys.all })
}

export function useRoutersQuery(
  params: Ref<{ page?: number; per_page?: number }> = ref({}),
  enabled: Ref<boolean> = ref(true),
) {
  return useQuery({
    enabled,
    queryKey: computed(() => mikrotikKeys.routers(params.value)),
    queryFn: () => mikrotikApi.routers.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useCreateRouterMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (payload: CreateRouterPayload) => mikrotikApi.routers.create(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateRouterMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { id: string; payload: UpdateRouterPayload }) =>
      mikrotikApi.routers.update(v.id, v.payload),
    onSuccess: invalidate,
  })
}

export function useDeleteRouterMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (id: string) => mikrotikApi.routers.remove(id),
    onSuccess: invalidate,
  })
}

export function useCheckRouterMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (id: string) => mikrotikApi.routers.check(id),
    onSuccess: invalidate,
  })
}

// Preview tidak mengubah apa pun di router, jadi tidak perlu invalidasi.
export function useSetupPreviewMutation() {
  return useMutation({
    mutationFn: (v: { routerId: string; payload: SetupPayload }) =>
      mikrotikApi.setup.preview(v.routerId, v.payload),
  })
}

export function useSetupApplyMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { routerId: string; payload: ApplySetupPayload }) =>
      mikrotikApi.setup.apply(v.routerId, v.payload),
    onSuccess: invalidate,
  })
}

export function useSecretsQuery(params: Ref<SecretListParams>, enabled: Ref<boolean> = ref(true)) {
  return useQuery({
    enabled,
    queryKey: computed(() => mikrotikKeys.secrets(params.value)),
    queryFn: () => mikrotikApi.secrets.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useImportSecretsMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (routerId: string) => mikrotikApi.secrets.import(routerId),
    onSuccess: invalidate,
  })
}

export function useAnalyzeMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (routerId: string) => mikrotikApi.secrets.analyze(routerId),
    onSuccess: invalidate,
  })
}

export function usePairBulkMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (items: PairBulkItem[]) => mikrotikApi.secrets.pairBulk(items),
    onSuccess: invalidate,
  })
}

export function usePairSecretMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { id: string; accountId: string }) =>
      mikrotikApi.secrets.pair(v.id, v.accountId),
    onSuccess: invalidate,
  })
}

export function usePairNewCustomerMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (id: string) => mikrotikApi.secrets.pairNewCustomer(id),
    onSuccess: invalidate,
  })
}

export function useUnpairMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (id: string) => mikrotikApi.secrets.unpair(id),
    onSuccess: invalidate,
  })
}

export function useSetOriginalProfileMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { id: string; profile: string }) =>
      mikrotikApi.secrets.setOriginalProfile(v.id, v.profile),
    onSuccess: invalidate,
  })
}

export function useAccountSearchQuery(q: Ref<string>) {
  return useQuery({
    queryKey: computed(() => mikrotikKeys.accountSearch(q.value)),
    queryFn: () => mikrotikApi.accounts.search(q.value),
    enabled: computed(() => q.value.trim().length > 0),
  })
}

export function useOnboardingQuery() {
  return useQuery({
    queryKey: mikrotikKeys.onboarding(),
    queryFn: () => mikrotikApi.onboarding.get(),
  })
}

export function useCustomerStatusQuery(accountIds: Ref<string[]>) {
  return useQuery({
    queryKey: computed(() => mikrotikKeys.customerStatus(accountIds.value)),
    queryFn: () => mikrotikApi.onboarding.customerStatus(accountIds.value),
    enabled: computed(() => accountIds.value.length > 0),
  })
}

export function usePolicyQuery(accountId: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => mikrotikKeys.policy(accountId.value ?? '')),
    queryFn: () => mikrotikApi.policy.get(accountId.value as string),
    enabled: computed(() => Boolean(accountId.value)),
  })
}

export function useSetPolicyMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { accountId: string; payload: SetPolicyPayload }) =>
      mikrotikApi.policy.set(v.accountId, v.payload),
    onSuccess: invalidate,
  })
}

export function useUnmarkedProductsQuery(enabled: Ref<boolean> = ref(true)) {
  return useQuery({
    enabled,
    queryKey: mikrotikKeys.unmarkedProducts(),
    queryFn: () => mikrotikApi.products.unmarked(),
  })
}

export function useTriggersQuery(enabled: Ref<boolean> = ref(true)) {
  return useQuery({
    enabled,
    queryKey: mikrotikKeys.triggers(),
    queryFn: () => mikrotikApi.products.triggers(),
  })
}

export function useTriggerPreviewQuery(productId: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => mikrotikKeys.triggerPreview(productId.value ?? '')),
    queryFn: () => mikrotikApi.products.triggerPreview(productId.value as string),
    enabled: computed(() => Boolean(productId.value)),
  })
}

export function useSetTriggerMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (v: { productId: string; enabled: boolean }) =>
      mikrotikApi.products.setTrigger(v.productId, v.enabled),
    onSuccess: invalidate,
  })
}

export function useTasksQuery(params: Ref<TaskListParams>) {
  return useQuery({
    queryKey: computed(() => mikrotikKeys.tasks(params.value)),
    queryFn: () => mikrotikApi.tasks.list(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useTaskSummaryQuery() {
  return useQuery({
    queryKey: mikrotikKeys.taskSummary(),
    queryFn: () => mikrotikApi.tasks.summary(),
  })
}

export function useRetryTaskMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (id: string) => mikrotikApi.tasks.retry(id),
    onSuccess: invalidate,
  })
}

export function useSetupCleanupMutation() {
  const invalidate = useInvalidateMikrotik()
  return useMutation({
    mutationFn: (routerId: string) => mikrotikApi.setup.cleanup(routerId),
    onSuccess: invalidate,
  })
}
