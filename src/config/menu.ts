import type { Component } from 'vue'
import { Bell, FileClock, ShieldCheck, Users } from 'lucide-vue-next'

import type { Permission } from '@/types/auth'

export interface MenuItem {
  label: string
  route: string
  icon: Component
  permission?: Permission | Permission[]
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
  {
    label: 'Access',
    items: [
      { label: 'Users', route: 'users', icon: Users, permission: 'user.read' },
      {
        label: 'Core Permission & RBAC',
        route: 'rbac',
        icon: ShieldCheck,
        permission: ['role.read', 'permission.read'],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Notifications',
        route: 'notifications',
        icon: Bell,
        permission: 'notification_template.read',
      },
      {
        label: 'Audit Logs',
        route: 'audit-logs',
        icon: FileClock,
        permission: 'audit.read',
      },
    ],
  },
]
