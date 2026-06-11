import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/config/env'
import { tokenStorage } from '@/lib/auth'
import { tenantStorage } from '@/lib/tenant'
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

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantId) config.headers[env.VITE_TENANT_HEADER] = tenantId

  return config
})

let refreshPromise: Promise<string | undefined> | null = null

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const request = error.config as RetryableRequest | undefined
    const isAuthEndpoint = request?.url?.includes('/auth/')

    if (error.response?.status !== 401 || !request || request._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }

    request._retry = true
    refreshPromise ??= http
      .post<{ data: { accessToken?: string } }>('/auth/refresh')
      .then(({ data }) => {
        tokenStorage.set(data.data.accessToken)
        return data.data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })

    try {
      const token = await refreshPromise
      if (token) request.headers.Authorization = `Bearer ${token}`
      return http(request)
    } catch {
      tokenStorage.set()
      window.dispatchEvent(new CustomEvent('auth:expired'))
      return Promise.reject(error)
    }
  },
)
