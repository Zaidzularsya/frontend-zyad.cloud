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

interface UserOrganizationRaw {
  organization: {
    id: string
    name: string
    slug: string
    type: string
    status: string
    metadata?: {
      logo_url?: string
    }
  }
  membership: {
    status: string
  }
  is_current: boolean
}

function mapOrganizationToTenant(org: UserOrganizationRaw): Tenant {
  return {
    id: org.organization.id,
    name: org.organization.name,
    slug: org.organization.slug,
    logoUrl: org.organization.metadata?.logo_url,
    plan: org.organization.type === 'platform' ? 'enterprise' : 'growth',
    status: org.organization.status === 'active' ? 'active' : 'suspended',
  }
}

export const authApi = {
  async login(payload: LoginPayload): Promise<SessionResponse> {
    const raw = await apiClient.post<RawLoginResponse>('/auth/login', {
      identifier: payload.email,
      password: payload.password,
      remember_me: payload.remember,
      device_name: 'Web Browser',
    })

    let tenants: Tenant[] = []
    let activeTenantId: string | undefined

    try {
      const orgs = await apiClient.get<UserOrganizationRaw[]>('/users/me/organizations', {
        headers: {
          Authorization: `Bearer ${raw.access_token}`,
        },
      })
      tenants = orgs.map(mapOrganizationToTenant)
      const currentOrg = orgs.find((o) => o.is_current)
      activeTenantId = currentOrg?.organization.id || tenants[0]?.id
    } catch (err) {
      console.error('Failed to load organizations during login:', err)
    }

    return {
      user: {
        id: raw.user.id,
        name: raw.user.name,
        email: raw.user.email,
        permissions: raw.user.permissions as Permission[],
        roles: raw.user.roles,
      },
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      tenants,
      activeTenantId,
    }
  },

  async session(): Promise<SessionResponse> {
    const raw = await apiClient.get<RawCurrentUserResponse>('/auth/me')

    let tenants: Tenant[] = []
    let activeTenantId: string | undefined

    try {
      const orgs = await apiClient.get<UserOrganizationRaw[]>('/users/me/organizations')
      tenants = orgs.map(mapOrganizationToTenant)
      const currentOrg = orgs.find((o) => o.is_current)
      activeTenantId = currentOrg?.organization.id || tenants[0]?.id
    } catch (err) {
      console.error('Failed to load organizations during session bootstrap:', err)
    }

    return {
      user: {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        avatarUrl: raw.profile?.avatar_url,
        permissions: raw.permissions as Permission[],
        roles: raw.roles,
      },
      tenants,
      activeTenantId,
    }
  },

  logout: () => apiClient.post<void>('/auth/logout'),
}
