import type { Component } from 'vue'
import {
  Bell,
  Building2,
  Calculator,
  ClipboardList,
  CreditCard,
  FileClock,
  FileMinus,
  FileSignature,
  FileText,
  Globe,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  Magnet,
  Package,
  Plug,
  Receipt,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
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
      { label: 'Members', route: 'platform-users', icon: ShieldCheck },
      {
        label: 'Product Catalog',
        route: 'platform-billing-plans',
        icon: Package,
        description: 'Katalog plan, harga, dan feature platform untuk berlangganan.',
      },
      {
        label: 'Storage Quota',
        route: 'platform-storage',
        icon: HardDrive,
        description: 'Atur batas kapasitas storage per tenant.',
        permission: 'platform.organization.manage',
      },
      {
        label: 'Settings',
        icon: Settings,
        children: [
          {
            label: 'Notification Templates',
            route: 'platform-notifications',
            icon: Bell,
            description: 'Template & aturan pengiriman notifikasi sistem ke tenant.',
            permission: 'notification_template.read',
          },
          {
            label: 'Audit Logs',
            route: 'platform-audit-logs',
            icon: FileClock,
            description: 'Riwayat aktivitas admin & perubahan data di seluruh platform.',
            permission: 'audit.read',
          },
        ],
      },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads', route: 'platform-crm-leads', icon: Magnet, permission: 'lead.read' },
      {
        label: 'Contacts',
        route: 'platform-crm-contacts',
        icon: Users,
        permission: 'contact.read',
      },
      {
        label: 'Companies',
        route: 'platform-crm-companies',
        icon: Building2,
        permission: 'company.read',
      },
      { label: 'Deals', route: 'platform-crm-deals', icon: Waypoints, permission: 'deal.read' },
      {
        label: 'Pipelines',
        route: 'platform-crm-pipelines',
        icon: Waypoints,
        permission: 'pipeline.read',
      },
      {
        label: 'Activities',
        route: 'platform-crm-activities',
        icon: FileClock,
        permission: 'activity.read',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Quotations',
        route: 'platform-crm-quotations',
        icon: FileText,
        permission: 'quotation.read',
      },
      {
        label: 'Sales Orders',
        route: 'platform-sales-orders',
        icon: ClipboardList,
        description: 'Belum tersedia — placeholder sampai modul backend Sales Order dibangun.',
      },
      {
        label: 'Contracts',
        route: 'platform-contracts',
        icon: FileSignature,
        description: 'Belum tersedia — placeholder sampai modul backend Contract dibangun.',
      },
    ],
  },
  {
    label: 'Billing',
    items: [
      {
        label: 'Invoices',
        route: 'platform-crm-invoices',
        icon: Receipt,
        permission: 'invoice.read',
      },
      {
        label: 'Payments',
        route: 'platform-billing-payments',
        icon: Wallet,
        description: 'Belum tersedia — placeholder sampai modul backend Payments dibangun.',
      },
      {
        label: 'Recurring Billing',
        route: 'platform-billing-recurring',
        icon: RefreshCw,
        description:
          'Belum tersedia — placeholder sampai modul backend Recurring Billing dibangun.',
      },
      {
        label: 'Credit Notes',
        route: 'platform-billing-credit-notes',
        icon: FileMinus,
        description: 'Belum tersedia — placeholder sampai modul backend Credit Notes dibangun.',
      },
      {
        label: 'Refunds',
        route: 'platform-billing-refunds',
        icon: RotateCcw,
        description: 'Belum tersedia — placeholder sampai modul backend Refunds dibangun.',
      },
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
  {
    label: 'Integrations',
    items: [
      {
        label: 'Integrations',
        route: 'platform-crm-integrations',
        icon: Plug,
        permission: 'integration.read',
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
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Quotations',
        route: 'crm-quotations',
        icon: FileText,
        permission: 'quotation.read',
      },
      {
        label: 'Sales Orders',
        route: 'sales-orders',
        icon: ClipboardList,
        description: 'Belum tersedia — placeholder sampai modul backend Sales Order dibangun.',
      },
      {
        label: 'Contracts',
        route: 'contracts',
        icon: FileSignature,
        description: 'Belum tersedia — placeholder sampai modul backend Contract dibangun.',
      },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Invoices', route: 'crm-invoices', icon: Receipt, permission: 'invoice.read' },
      {
        label: 'Payments',
        route: 'billing-payments',
        icon: Wallet,
        description: 'Belum tersedia — placeholder sampai modul backend Payments dibangun.',
      },
      {
        label: 'Recurring Billing',
        route: 'billing-recurring',
        icon: RefreshCw,
        description:
          'Belum tersedia — placeholder sampai modul backend Recurring Billing dibangun.',
      },
      {
        label: 'Credit Notes',
        route: 'billing-credit-notes',
        icon: FileMinus,
        description: 'Belum tersedia — placeholder sampai modul backend Credit Notes dibangun.',
      },
      {
        label: 'Refunds',
        route: 'billing-refunds',
        icon: RotateCcw,
        description: 'Belum tersedia — placeholder sampai modul backend Refunds dibangun.',
      },
    ],
  },
  {
    label: 'Integrations',
    items: [
      {
        label: 'Integrations',
        route: 'crm-integrations',
        icon: Plug,
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
