import { http } from '@/lib/http'

export interface CrmSettings {
  lead_playbook_enabled: boolean
  updated_at?: string | null
}

export const crmSettingsApi = {
  get: () =>
    http
      .get<{ success: boolean; data: CrmSettings }>('/app/crm/settings')
      .then((response) => response.data.data),
  update: (payload: { lead_playbook_enabled: boolean }) =>
    http
      .patch<{ success: boolean; data: CrmSettings }>('/app/crm/settings', payload)
      .then((response) => response.data.data),
}
