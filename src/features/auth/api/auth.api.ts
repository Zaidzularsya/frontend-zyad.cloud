import { apiClient } from '@/lib/api-client'
import type { LoginPayload, SessionResponse } from '@/features/auth/types'

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<SessionResponse, LoginPayload>('/auth/login', payload),
  session: () => apiClient.get<SessionResponse>('/auth/me'),
  logout: () => apiClient.post<void>('/auth/logout'),
}
