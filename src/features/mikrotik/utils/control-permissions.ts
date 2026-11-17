import { hasPermission } from '@/lib/permission'
import type { Permission } from '@/types/auth'

export const CONTROL_OWNER_ONLY_TOOLTIP =
  'Hanya Pemilik Organisasi yang dapat mengubah pengaturan ini.'

export interface ControlPermissions {
  canRead: boolean
  canUpdate: boolean
  canRestore: boolean
  // Tooltip untuk kontrol nonaktif; null bila pengguna boleh mengubah.
  disabledReason: string | null
}

// Backend tetap menolak 403; ini hanya untuk UX (member melihat semuanya, kontrol nonaktif).
export function controlPermissions(granted: readonly Permission[]): ControlPermissions {
  const canUpdate = hasPermission(granted, 'mikrotik_control.update')
  const canRestore = hasPermission(granted, 'mikrotik_control.restore')
  return {
    canRead: hasPermission(granted, 'mikrotik_control.read'),
    canUpdate,
    canRestore,
    disabledReason: canUpdate && canRestore ? null : CONTROL_OWNER_ONLY_TOOLTIP,
  }
}
