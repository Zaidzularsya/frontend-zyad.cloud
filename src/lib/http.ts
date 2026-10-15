import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/config/env'
import { tokenStorage } from '@/lib/auth'
import { tenantStorage } from '@/lib/tenant'
import { WORKSPACE_SUSPENDED_EVENT } from '@/lib/workspace-suspended'
import type { ApiErrorPayload } from '@/types/api'

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const http = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: env.VITE_AUTH_MODE === 'cookie',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  const tenantId = tenantStorage.get()
  const url = config.url ?? ''
  const isPublicEndpoint = url.startsWith('/public/') || url.includes('/api/v1/public/')

  if (isPublicEndpoint) {
    config.baseURL = '/api/v1'
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantId && !isPublicEndpoint) config.headers[env.VITE_TENANT_HEADER] = tenantId

  return config
})

let refreshPromise: Promise<string | undefined> | null = null

interface RefreshResponse {
  success: boolean
  data: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }
}

/**
 * Refreshes the access token (one request shared by concurrent callers).
 * Rejects when the session cannot be renewed; the caller decides how to react.
 */
export function refreshAccessToken(): Promise<string | undefined> {
  refreshPromise ??= http
    .post<RefreshResponse>('/auth/refresh-token', {
      refresh_token: tokenStorage.getRefreshToken() || undefined,
    })
    .then(({ data }) => {
      const nextAccessToken = data.data.access_token
      const nextRefreshToken = data.data.refresh_token
      tokenStorage.set(nextAccessToken)
      tokenStorage.setRefreshToken(nextRefreshToken)
      return nextAccessToken
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    // Backend menaruh `code` di level atas body (lihat corehttp.Fail).
    const body = error.response?.data as { code?: string } | undefined
    if (error.response?.status === 403 && body?.code === 'ORGANIZATION_NOT_ACTIVE') {
      window.dispatchEvent(new CustomEvent(WORKSPACE_SUSPENDED_EVENT))
      return Promise.reject(error)
    }

    const request = error.config as RetryableRequest | undefined
    const isAuthEndpoint = request?.url?.includes('/auth/')

    if (error.response?.status !== 401 || !request || request._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    request._retry = true
    try {
      const token = await refreshAccessToken()
      if (token) request.headers.Authorization = `Bearer ${token}`
      return http(request)
    } catch {
      tokenStorage.set()
      tokenStorage.setRefreshToken()
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(error)
    }
  },
)
