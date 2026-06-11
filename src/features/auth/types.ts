import type { AuthSession } from '@/types/auth'
import type { Tenant } from '@/types/tenant'

export interface LoginPayload {
  email: string
  password: string
  remember: boolean
}

export interface SessionResponse extends AuthSession {
  tenants: Tenant[]
  activeTenantId?: string
}
