import { apiClient } from '@/lib/api-client'
import type { GoogleLoginPayload, LoginPayload, SessionResponse } from '@/features/auth/types'
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

interface RawGoogleLoginResponse extends RawLoginResponse {
  is_new_user: boolean
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

interface CreateWorkspaceResponse {
  current_organization: UserOrganizationRaw
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

async function loadOrganizations(accessToken?: string) {
  const orgs = await apiClient.get<UserOrganizationRaw[]>(
    '/users/me/organizations',
    accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  )
  const tenants = orgs.map(mapOrganizationToTenant)
  const currentOrg = orgs.find((o) => o.is_current)
  return {
    tenants,
    activeTenantId: currentOrg?.organization.id || tenants[0]?.id,
  }
}

function temporaryWorkspaceSlug(name: string, userId: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = userId.replace(/-/g, '').slice(0, 8)
  return [base || 'workspace', suffix].join('-').slice(0, 63)
}

async function createTemporaryWorkspace(raw: RawLoginResponse) {
  const response = await apiClient.post<CreateWorkspaceResponse>(
    '/onboarding/workspace',
    {
      name: raw.user.name || 'Workspace',
      slug: temporaryWorkspaceSlug(raw.user.name || 'Workspace', raw.user.id),
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
    },
    {
      headers: {
        Authorization: `Bearer ${raw.access_token}`,
      },
    },
  )
  const tenant = mapOrganizationToTenant(response.current_organization)
  return {
    tenants: [tenant],
    activeTenantId: tenant.id,
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
      const organizations = await loadOrganizations(raw.access_token)
      tenants = organizations.tenants
      activeTenantId = organizations.activeTenantId
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

  async googleLogin(payload: GoogleLoginPayload): Promise<SessionResponse> {
    const raw = await apiClient.post<RawGoogleLoginResponse>('/auth/google', {
      id_token: payload.idToken,
      remember_me: payload.remember ?? true,
      device_name: payload.deviceName || 'Web Browser',
    })

    let tenants: Tenant[] = []
    let activeTenantId: string | undefined

    try {
      const organizations = await loadOrganizations(raw.access_token)
      tenants = organizations.tenants
      activeTenantId = organizations.activeTenantId
      if (raw.is_new_user && tenants.length === 0) {
        const workspace = await createTemporaryWorkspace(raw)
        tenants = workspace.tenants
        activeTenantId = workspace.activeTenantId
      }
    } catch (err) {
      console.error('Failed to load organizations during Google login:', err)
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
      const organizations = await loadOrganizations()
      tenants = organizations.tenants
      activeTenantId = organizations.activeTenantId
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
