import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { crmSettingsApi } from '@/features/crm/settings/api/crm-settings.api'

export const crmSettingsKeys = { all: ['crm', 'settings'] as const }

export function useCrmSettingsQuery() {
  return useQuery({ queryKey: crmSettingsKeys.all, queryFn: () => crmSettingsApi.get() })
}

export function useUpdateCrmSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => crmSettingsApi.update({ lead_playbook_enabled: enabled }),
    onSuccess: (data) => queryClient.setQueryData(crmSettingsKeys.all, data),
  })
}
