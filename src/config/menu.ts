import type { Component } from 'vue'
import {
  Bell,
  Brush,
  Building2,
  Calculator,
  CreditCard,
  FileClock,
  FileText,
  Globe,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  Magnet,
  Package,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-vue-next'

import { buildFinanceMenuItems } from '@/features/finance/config/finance-menu'
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
        label: 'Product Catalog',
        route: 'platform-billing-plans',
        icon: Package,
        description: 'Katalog plan, harga, dan feature platform untuk berlangganan.',
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
      {
        label: 'Storage Quota',
        route: 'platform-storage',
        icon: HardDrive,
        description: 'Atur batas kapasitas storage per tenant.',
        permission: 'platform.organization.manage',
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
  {
    label: 'Finance',
    items: [
      {
        label: 'Finance',
        route: 'platform-finance-dashboard',
        icon: Calculator,
        description: 'Pembukuan double-entry PT Zyad Technovation.',
        children: buildFinanceMenuItems(),
      },
    ],
  },
]

export const customerMenuGroups: MenuGroup[] = [
  {
    label: 'CRM',
    items: [
      { label: 'Leads', route: 'crm-leads', icon: Magnet, permission: 'lead.read' },
      { label: 'Contacts', route: 'crm-contacts', icon: Users, permission: 'contact.read' },
      { label: 'Companies', route: 'crm-companies', icon: Building2, permission: 'company.read' },
      { label: 'Deals', route: 'crm-deals', icon: Waypoints, permission: 'deal.read' },
      { label: 'Pipelines', route: 'crm-pipelines', icon: Waypoints, permission: 'pipeline.read' },
      {
        label: 'Activities',
        route: 'crm-activities',
        icon: FileClock,
        permission: 'activity.read',
      },
      {
        label: 'Quotations',
        route: 'crm-quotations',
        icon: FileText,
        permission: 'quotation.read',
      },
      { label: 'Invoices', route: 'crm-invoices', icon: CreditCard, permission: 'invoice.read' },
      {
        label: 'Integrations',
        route: 'crm-integrations',
        icon: Package,
        permission: 'integration.read',
      },
    ],
  },
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
  {
    label: 'Storage',
    items: [
      {
        label: 'Files',
        route: 'storage',
        icon: HardDrive,
        permission: 'storage.object.read',
      },
    ],
  },
]
