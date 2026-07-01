export type Permission =
  | 'platform.billing.plan.read'
  | 'platform.billing.plan.manage'
  | 'platform.billing.plan_price.read'
  | 'platform.billing.plan_price.manage'
  | 'platform.billing.feature.read'
  | 'platform.billing.feature.manage'
  | 'platform.billing.entitlement.read'
  | 'platform.billing.entitlement.manage'
  | 'platform.billing.subscription.read'
  | 'platform.billing.subscription.manage'
  | 'platform.billing.invoice.read'
  | 'platform.billing.invoice.manage'
  | 'platform.billing.payment.manage'
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.restore'
  | 'user.update_status'
  | 'user.session.read'
  | 'user.session.revoke'
  | 'role.read'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'role.assign'
  | 'permission.read'
  | 'permission.create'
  | 'permission.update'
  | 'permission.delete'
  | 'permission.manage'
  | 'notification_template.read'
  | 'notification_template.create'
  | 'notification_template.update'
  | 'notification_template.delete'
  | 'notification_template.preview'
  | 'notification_template.activate'
  | 'notification_template.deactivate'
  | 'notification_template.archive'
  | 'notification_template.clone'
  | 'notification_log.read'
  | 'notification_log.retry'
  | 'notification_log.cancel'
  | 'notification_preference.read'
  | 'notification_preference.update'
  | 'notification_preference.manage'
  | 'audit.read'
  | 'organization.user.read'
  | 'organization.user.manage'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  permissions: Permission[]
  roles?: string[]
}

export interface AuthSession {
  user: AuthUser
  accessToken?: string
  expiresAt?: string
}
