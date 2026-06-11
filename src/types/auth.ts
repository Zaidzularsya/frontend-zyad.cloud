export type Permission =
  | 'dashboard.read'
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'roles.read'
  | 'roles.manage'
  | 'billing.read'
  | 'billing.manage'
  | 'settings.read'
  | 'settings.update'
  | 'audit-logs.read'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  permissions: Permission[]
}

export interface AuthSession {
  user: AuthUser
  accessToken?: string
  expiresAt?: string
}
