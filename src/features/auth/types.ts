import type { AuthUser } from '@/types/auth'
import type { Tenant } from '@/types/tenant'

export interface LoginPayload {
  email: string
  password: string
  remember: boolean
}

export interface GoogleLoginPayload {
  idToken: string
  remember?: boolean
  deviceName?: string
}

export interface SessionResponse {
  user: AuthUser
  accessToken?: string
  refreshToken?: string
  tenants: Tenant[]
  activeTenantId?: string
}
