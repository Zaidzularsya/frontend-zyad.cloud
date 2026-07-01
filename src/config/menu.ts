import type { Component } from 'vue'
import {
  Bell,
  Brush,
  CreditCard,
  FileClock,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Magnet,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'

import { buildLandingManagementMenuItems } from '@/features/landing/builder/config/landing-menu'
import type { Permission } from '@/types/auth'

export interface MenuItem {
  label: string
  route?: string
  icon: Component
  tone?: string
  description?: string
  children?: MenuChildItem[]
  permission?: Permission | Permission[]
}

export interface MenuChildItem {
  label: string
  route?: string
  icon?: Component
  tone?: string
  description?: string
  children?: MenuChildItem[]
  permission?: Permission | Permission[]
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

export const platformMenuGroups: MenuGroup[] = [
  {
    label: 'Platform Control',
    items: [
      { label: 'Overview', route: 'platform-dashboard', icon: LayoutDashboard },
      {
        label: 'Landing Page',
        route: 'platform-landing-pages',
        icon: Globe,
        children: buildLandingManagementMenuItems('platform-landing-pages'),
      },
      { label: 'Branding', route: 'platform-branding', icon: Brush },
      { label: 'Admins & Roles', route: 'platform-users', icon: ShieldCheck },
      {
        label: 'Billing Plans',
        route: 'platform-billing-plans',
        icon: CreditCard,
        description: 'Plan catalog, pricing, and entitlement mapping.',
      },
      {
        label: 'Notifications',
        route: 'platform-notifications',
        icon: Bell,
        permission: 'notification_template.read',
      },
      {
        label: 'Audit Logs',
        route: 'platform-audit-logs',
        icon: FileClock,
        permission: 'audit.read',
      },
    ],
  },
  {
    label: 'Business Management',
    items: [
      { label: 'Customers', route: 'platform-customers', icon: Users },
      { label: 'Leads', route: 'platform-leads', icon: Magnet },
    ],
  },
]

export const customerMenuGroups: MenuGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Landing Page',
        route: 'landing-pages',
        icon: Globe,
        children: buildLandingManagementMenuItems('landing-pages'),
      },
      { label: 'Team & Roles', route: 'users', icon: ShieldCheck },
    ],
  },
  {
    label: 'Account Services',
    items: [
      { label: 'Plan & Billing', route: 'billing', icon: CreditCard },
      { label: 'Support Tickets', route: 'ticketing', icon: LifeBuoy },
    ],
  },
]
