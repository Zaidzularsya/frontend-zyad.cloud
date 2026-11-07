import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/types/api'

import type {
  AccountRef,
  ActivityItem,
  ActivityMeta,
  ActivityParams,
  AnalyzeResult,
  ApplySetupPayload,
  ControlState,
  CreateRouterPayload,
  CustomerPolicy,
  CustomerStatus,
  ImportResult,
  IsolationTask,
  OnboardingStatus,
  PairBulkItem,
  PairBulkResult,
  PilotAccount,
  PilotTest,
  PreviewItem,
  PreviewParams,
  PreviewSummary,
  PppSecret,
  Product,
  ProductTrigger,
  RestoreAllResult,
  Router,
  SecretListParams,
  SetModePayload,
  SetPolicyPayload,
  SetupPayload,
  SetupPlan,
  TaskListParams,
  TaskSummary,
  TriggerItem,
  TriggerPreview,
  UpdateRouterPayload,
} from '@/features/mikrotik/types'

type Envelope<T> = { success: boolean; data: T }
type Paged<T> = { success: boolean; data: T[]; meta: PaginatedResponse<T>['meta'] }

const BASE = '/app/mikrotik'

// Satu fungsi tipis per endpoint /api/v1/app/mikrotik; tanpa logika bisnis.
export const mikrotikApi = {
  routers: {
    list: async (params: { page?: number; per_page?: number } = {}) => {
      const r = await http.get<Paged<Router>>(`${BASE}/routers`, { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    get: (id: string) =>
      http.get<Envelope<Router>>(`${BASE}/routers/${id}`).then((r) => r.data.data),
    create: (payload: CreateRouterPayload) =>
      http.post<Envelope<Router>>(`${BASE}/routers`, payload).then((r) => r.data.data),
    update: (id: string, payload: UpdateRouterPayload) =>
      http.patch<Envelope<Router>>(`${BASE}/routers/${id}`, payload).then((r) => r.data.data),
    remove: (id: string) => http.delete(`${BASE}/routers/${id}`).then(() => undefined),
    check: (id: string) =>
      http.post<Envelope<Router>>(`${BASE}/routers/${id}/check`).then((r) => r.data.data),
  },

  setup: {
    preview: (routerId: string, payload: SetupPayload) =>
      http
        .post<Envelope<SetupPlan>>(`${BASE}/routers/${routerId}/setup/preview`, payload)
        .then((r) => r.data.data),
    apply: (routerId: string, payload: ApplySetupPayload) =>
      http
        .post<Envelope<Router>>(`${BASE}/routers/${routerId}/setup/apply`, payload)
        .then((r) => r.data.data),
    cleanup: (routerId: string) =>
      http
        .post<Envelope<Router>>(`${BASE}/routers/${routerId}/setup/cleanup`, {})
        .then((r) => r.data.data),
  },

  secrets: {
    list: async (params: SecretListParams = {}) => {
      const r = await http.get<Paged<PppSecret>>(`${BASE}/secrets`, { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    import: (routerId: string) =>
      http
        .post<Envelope<ImportResult>>(`${BASE}/routers/${routerId}/secrets/import`)
        .then((r) => r.data.data),
    analyze: (routerId: string) =>
      http
        .post<Envelope<AnalyzeResult>>(`${BASE}/routers/${routerId}/secrets/analyze`)
        .then((r) => r.data.data),
    pairBulk: (items: PairBulkItem[]) =>
      http
        .post<Envelope<PairBulkResult>>(`${BASE}/secrets/pair-bulk`, { items })
        .then((r) => r.data.data),
    pair: (id: string, accountId: string) =>
      http
        .post<Envelope<PppSecret>>(`${BASE}/secrets/${id}/pair`, { account_id: accountId })
        .then((r) => r.data.data),
    pairNewCustomer: (id: string) =>
      http
        .post<Envelope<PppSecret>>(`${BASE}/secrets/${id}/pair-new-customer`)
        .then((r) => r.data.data),
    unpair: (id: string) => http.post(`${BASE}/secrets/${id}/unpair`).then(() => undefined),
    setOriginalProfile: (id: string, profile: string) =>
      http.put(`${BASE}/secrets/${id}/original-profile`, { profile }).then(() => undefined),
  },

  accounts: {
    search: (q: string) =>
      http
        .get<Envelope<AccountRef[]>>(`${BASE}/accounts/search`, { params: { q } })
        .then((r) => r.data.data),
  },

  onboarding: {
    get: () => http.get<Envelope<OnboardingStatus>>(`${BASE}/onboarding`).then((r) => r.data.data),
    customerStatus: (accountIds: string[]) =>
      http
        .get<
          Envelope<CustomerStatus[]>
        >(`${BASE}/customers/status`, { params: { account_ids: accountIds.join(',') } })
        .then((r) => r.data.data),
  },

  policy: {
    get: (accountId: string) =>
      http
        .get<Envelope<CustomerPolicy>>(`${BASE}/customers/${accountId}/policy`)
        .then((r) => r.data.data),
    set: (accountId: string, payload: SetPolicyPayload) =>
      http
        .put<Envelope<CustomerPolicy>>(`${BASE}/customers/${accountId}/policy`, payload)
        .then((r) => r.data.data),
  },

  products: {
    unmarked: () =>
      http.get<Envelope<Product[]>>(`${BASE}/products/unmarked`).then((r) => r.data.data),
    triggers: () =>
      http.get<Envelope<TriggerItem[]>>(`${BASE}/products/triggers`).then((r) => r.data.data),
    triggerPreview: (productId: string) =>
      http
        .get<Envelope<TriggerPreview>>(`${BASE}/products/${productId}/trigger/preview`)
        .then((r) => r.data.data),
    setTrigger: (productId: string, enabled: boolean) =>
      http
        .put<Envelope<ProductTrigger>>(`${BASE}/products/${productId}/trigger`, { enabled })
        .then((r) => r.data.data),
  },

  tasks: {
    list: async (params: TaskListParams = {}) => {
      const r = await http.get<Paged<IsolationTask>>(`${BASE}/tasks`, { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    summary: () =>
      http.get<Envelope<TaskSummary>>(`${BASE}/tasks/summary`).then((r) => r.data.data),
    retry: (id: string) =>
      http.post<Envelope<IsolationTask>>(`${BASE}/tasks/${id}/retry`).then((r) => r.data.data),
  },

  control: {
    get: () => http.get<Envelope<ControlState>>(`${BASE}/control`).then((r) => r.data.data),
    setGraceDays: (graceDays: number) =>
      http
        .put<Envelope<ControlState>>(`${BASE}/control/grace-days`, { grace_days: graceDays })
        .then((r) => r.data.data),
    setMode: (payload: SetModePayload) =>
      http.put<Envelope<ControlState>>(`${BASE}/control/mode`, payload).then((r) => r.data.data),
    restoreAll: () =>
      http.post<Envelope<RestoreAllResult>>(`${BASE}/control/restore-all`).then((r) => r.data.data),
    previewSummary: () =>
      http
        .get<Envelope<PreviewSummary>>(`${BASE}/control/preview/summary`)
        .then((r) => r.data.data),
    preview: async (params: PreviewParams = {}) => {
      const r = await http.get<Paged<PreviewItem>>(`${BASE}/control/preview`, { params })
      return { data: r.data.data, meta: r.data.meta }
    },
    // Ekspor CSV lewat klien http agar Authorization dan header organisasi ikut terkirim.
    // Hanya filter status/q yang berlaku; paginasi diabaikan backend.
    exportPreview: (params: Pick<PreviewParams, 'status' | 'q'> = {}) =>
      http
        .get<Blob>(`${BASE}/control/preview/export`, { params, responseType: 'blob' })
        .then((r) => r.data),
    activity: async (params: ActivityParams = {}) => {
      const r = await http.get<{ success: boolean; data: ActivityItem[]; meta: ActivityMeta }>(
        `${BASE}/control/activity`,
        { params },
      )
      return { data: r.data.data, meta: r.data.meta }
    },
  },

  pilot: {
    list: () =>
      http.get<Envelope<PilotAccount[]>>(`${BASE}/control/pilot`).then((r) => r.data.data),
    add: (accountId: string) =>
      http.put(`${BASE}/control/pilot/${accountId}`).then(() => undefined),
    remove: (accountId: string) =>
      http.delete(`${BASE}/control/pilot/${accountId}`).then(() => undefined),
    startTest: (accountId: string) =>
      http
        .post<Envelope<PilotTest>>(`${BASE}/control/pilot/${accountId}/test`)
        .then((r) => r.data.data),
    stopTest: (accountId: string) =>
      http.delete(`${BASE}/control/pilot/${accountId}/test`).then(() => undefined),
  },
}
