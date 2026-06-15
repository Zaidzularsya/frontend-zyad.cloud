import { apiClient } from '@/lib/api-client'
import type { LoginPayload, SessionResponse } from '@/features/auth/types'
import type { Permission } from '@/types/auth'
import type { Tenant } from '@/types/tenant'

interface RawLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    name: string
    email: string
    username?: string
    status: string
    roles: string[]
    permissions: string[]
  }
}

interface RawCurrentUserResponse {
  id: string
  name: string
  email: string
  username?: string
  status: string
  roles: string[]
  permissions: string[]
  profile?: {
    avatar_url?: string
  }
}

const defaultTenants: Tenant[] = [
  {
    id: 'default-tenant-id',
    name: 'Zyad Cloud Main Workspace',
    slug: 'main',
    plan: 'growth',
    status: 'active',
  },
]

export const authApi = {
  async login(payload: LoginPayload): Promise<SessionResponse> {
    const raw = await apiClient.post<RawLoginResponse>('/auth/login', {
      identifier: payload.email,
      password: payload.password,
      remember_me: payload.remember,
      device_name: 'Web Browser',
    })

    return {
      user: {
        id: raw.user.id,
        name: raw.user.name,
        email: raw.user.email,
        permissions: raw.user.permissions as Permission[],
      },
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      tenants: defaultTenants,
      activeTenantId: 'default-tenant-id',
    }
  },

  async session(): Promise<SessionResponse> {
    const raw = await apiClient.get<RawCurrentUserResponse>('/auth/me')

    return {
      user: {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        avatarUrl: raw.profile?.avatar_url,
        permissions: raw.permissions as Permission[],
      },
      tenants: defaultTenants,
      activeTenantId: 'default-tenant-id',
    }
  },

  logout: () => apiClient.post<void>('/auth/logout'),
}
