import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  auditApi,
  type AuditLogQuery,
  type LoginHistoryQuery,
} from '@/features/audit/api/audit.api'

export const auditKeys = {
  all: ['audit'] as const,
  logs: () => [...auditKeys.all, 'logs'] as const,
  logList: (params: AuditLogQuery) => [...auditKeys.logs(), params] as const,
  login: () => [...auditKeys.all, 'login-histories'] as const,
  loginList: (params: LoginHistoryQuery) => [...auditKeys.login(), params] as const,
}

export function useAuditLogsQuery(params: Ref<AuditLogQuery>) {
  return useQuery({
    queryKey: computed(() => auditKeys.logList(params.value)),
    queryFn: () => auditApi.listAuditLogs(params.value),
    placeholderData: keepPreviousData,
  })
}

export function useLoginHistoriesQuery(params: Ref<LoginHistoryQuery>) {
  return useQuery({
    queryKey: computed(() => auditKeys.loginList(params.value)),
    queryFn: () => auditApi.listLoginHistories(params.value),
    placeholderData: keepPreviousData,
  })
}
