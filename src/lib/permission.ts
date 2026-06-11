import type { Permission } from '@/types/auth'

export function hasPermission(granted: readonly Permission[], required: Permission | Permission[]) {
  const requirements = Array.isArray(required) ? required : [required]
  return requirements.every((permission) => granted.includes(permission))
}
