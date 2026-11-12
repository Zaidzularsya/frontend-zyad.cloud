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

function isPublicUrl(url: string | undefined): boolean {
  const value = url ?? ''
  return value.startsWith('/public/') || value.includes('/api/v1/public/')
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  const tenantId = tenantStorage.get()
  const isPublicEndpoint = isPublicUrl(config.url)

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

const REFRESH_LOCK = 'zyad.auth-refresh'

async function postRefresh(): Promise<string | undefined> {
  const { data } = await http.post<RefreshResponse>('/auth/refresh-token', {
    refresh_token: tokenStorage.getRefreshToken() || undefined,
  })
  tokenStorage.set(data.data.access_token)
  tokenStorage.setRefreshToken(data.data.refresh_token)
  return data.data.access_token
}

// The backend rotates the refresh token on every refresh and revokes the whole
// session when a rotated token is presented again (refresh_token_reuse). Tabs
// share localStorage, so refreshes are serialized across tabs with the Web
// Locks API, and a tab that finds the refresh token already rotated by another
// tab reuses the stored access token instead of replaying the old one.
async function refreshAcrossTabs(): Promise<string | undefined> {
  const seen = tokenStorage.getRefreshToken()
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks) return postRefresh()
  return locks.request(REFRESH_LOCK, async () => {
    const current = tokenStorage.getRefreshToken()
    const access = tokenStorage.get()
    if (seen && current && current !== seen && access) return access
    return postRefresh()
  })
}

/**
 * Refreshes the access token (one request shared by concurrent callers in this
 * tab, serialized across tabs). Rejects when the session cannot be renewed; the
 * caller decides how to react.
 */
export function refreshAccessToken(): Promise<string | undefined> {
  refreshPromise ??= refreshAcrossTabs().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

function bearerOf(request: InternalAxiosRequestConfig): string | undefined {
  const raw = request.headers?.Authorization
  return typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7) : undefined
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
    // 401 dari endpoint publik (mis. kredensial Google checkout tidak valid) bukan sesi
    // kedaluwarsa: jangan refresh/redirect ke login, biarkan halaman menampilkan galatnya.
    const isPublicEndpoint = isPublicUrl(request?.url)

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isAuthEndpoint ||
      isPublicEndpoint
    ) {
      return Promise.reject(error)
    }

    request._retry = true
    // Another tab refreshed after this request was sent: retry with its token.
    const stored = tokenStorage.get()
    const sent = bearerOf(request)
    if (stored && sent && stored !== sent) {
      request.headers.Authorization = `Bearer ${stored}`
      return http(request)
    }
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
