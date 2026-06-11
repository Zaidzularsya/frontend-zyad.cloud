import type { Component } from 'vue'
import {
  ChartNoAxesCombined,
  CreditCard,
  FileClock,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'

import type { Permission } from '@/types/auth'

export interface MenuItem {
  label: string
  route: string
  icon: Component
  permission?: Permission
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

export const menuGroups: MenuGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Dashboard',
        route: 'dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.read',
      },
      { label: 'CRM Overview', route: 'crm', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Users', route: 'users', icon: Users, permission: 'users.read' },
      { label: 'Roles', route: 'roles', icon: ShieldCheck, permission: 'roles.read' },
      { label: 'Billing', route: 'billing', icon: CreditCard, permission: 'billing.read' },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Audit Logs',
        route: 'audit-logs',
        icon: FileClock,
        permission: 'audit-logs.read',
      },
      { label: 'Settings', route: 'settings', icon: Settings, permission: 'settings.read' },
    ],
  },
]
