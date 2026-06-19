import type { Component } from 'vue'
import {
  BadgeInfo,
  Bot,
  CheckSquare2,
  FileText,
  Folders,
  LayoutGrid,
  Menu,
  Palette,
  PanelTop,
  SlidersHorizontal,
  Sparkles,
  SquareMenu,
  Waypoints,
} from 'lucide-vue-next'
import type { RouteRecordRaw } from 'vue-router'

export type LandingMenuTone = 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate'

export interface LandingMenuStat {
  label: string
  value: string
}

export interface LandingMenuSection {
  title: string
  items: string[]
}

export interface LandingMenuPageDefinition {
  key: string
  routeNameSuffix: string
  label: string
  description: string
  icon: Component
  tone: LandingMenuTone
  stats: LandingMenuStat[]
  sections: LandingMenuSection[]
}

export const landingMenuPages: LandingMenuPageDefinition[] = [
  {
    key: 'pages',
    routeNameSuffix: 'pages',
    label: 'Pages',
    description: 'Atur jenis page, metadata, slug, status, layout, sections, dan Open Graph image.',
    icon: FileText,
    tone: 'sky',
    stats: [
      { label: 'Page types', value: '6' },
      { label: 'Core fields', value: '8' },
      { label: 'Publish states', value: '2' },
    ],
    sections: [
      {
        title: 'Page variants',
        items: [
          'Company Profile',
          'Product Page',
          'SaaS Landing Page',
          'Pricing Page',
          'Contact Page',
          'Custom Page',
        ],
      },
      {
        title: 'Editable data',
        items: ['Page title', 'Slug', 'Meta title', 'Meta description'],
      },
      {
        title: 'Publishing and SEO',
        items: [
          'Status: draft / published',
          'Layout template',
          'Sections',
          'SEO',
          'Open Graph image',
        ],
      },
    ],
  },
  {
    key: 'templates',
    routeNameSuffix: 'templates',
    label: 'Templates',
    description:
      'Susun pola template untuk company profile, SaaS, product, agency, portfolio, dan event.',
    icon: LayoutGrid,
    tone: 'violet',
    stats: [
      { label: 'Template families', value: '6' },
      { label: 'Core blocks', value: '18' },
      { label: 'Reusable layouts', value: '1 set' },
    ],
    sections: [
      {
        title: 'Template families',
        items: [
          'Company Profile Template',
          'SaaS Landing Template',
          'Product Landing Template',
          'Agency Template',
          'Portfolio Template',
          'Event / Campaign Template',
        ],
      },
      {
        title: 'Company profile blocks',
        items: [
          'Hero',
          'About',
          'Vision Mission',
          'Services',
          'Portfolio',
          'FAQ',
          'CTA',
          'Contact',
        ],
      },
      {
        title: 'SaaS landing blocks',
        items: ['Hero', 'Problem', 'Features', 'Benefits', 'Pricing', 'FAQ', 'CTA'],
      },
    ],
  },
  {
    key: 'sections',
    routeNameSuffix: 'sections',
    label: 'Sections',
    description: 'Kelola section reusable yang bisa dipakai ulang di berbagai halaman landing.',
    icon: PanelTop,
    tone: 'emerald',
    stats: [
      { label: 'Section types', value: '10' },
      { label: 'Reusable blocks', value: '10' },
      { label: 'Common CTAs', value: '4' },
    ],
    sections: [
      {
        title: 'Reusable sections',
        items: [
          'Hero Section',
          'About Section',
          'Service Grid',
          'Feature Grid',
          'Portfolio Grid',
          'Testimonial',
          'FAQ',
          'CTA',
          'Contact Form',
          'Pricing',
        ],
      },
      {
        title: 'Editorial flow',
        items: ['Arrange section order', 'Preview section density', 'Duplicate reusable blocks'],
      },
      {
        title: 'Content polish',
        items: ['Spacing rhythm', 'Visual hierarchy', 'CTA placement'],
      },
    ],
  },
  {
    key: 'navigation',
    routeNameSuffix: 'navigation',
    label: 'Navigation',
    description:
      'Rancang header menu, anchor link, CTA, dan urutan navigasi yang paling mudah dipindai.',
    icon: Menu,
    tone: 'amber',
    stats: [
      { label: 'Nav surfaces', value: '3' },
      { label: 'Primary actions', value: '1-2' },
      { label: 'Link groups', value: 'Flexible' },
    ],
    sections: [
      {
        title: 'Navigation surfaces',
        items: ['Header navigation', 'Mobile drawer', 'Footer navigation'],
      },
      {
        title: 'Interaction rules',
        items: ['Active state', 'Sticky behavior', 'CTA emphasis'],
      },
      {
        title: 'Content structure',
        items: ['Anchor links', 'Product links', 'Support links', 'Contact shortcut'],
      },
    ],
  },
  {
    key: 'brand-theme',
    routeNameSuffix: 'brand-theme',
    label: 'Brand & Theme',
    description:
      'Atur identitas visual, warna, tipografi, tombol, dan kontak brand dalam satu panel.',
    icon: Palette,
    tone: 'rose',
    stats: [
      { label: 'Brand fields', value: '12' },
      { label: 'Palette slots', value: '3' },
      { label: 'Theme controls', value: '7' },
    ],
    sections: [
      {
        title: 'Brand identity',
        items: ['Brand name', 'Logo', 'Favicon', 'Tagline'],
      },
      {
        title: 'Theme system',
        items: [
          'Primary color',
          'Secondary color',
          'Accent color',
          'Font',
          'Button style',
          'Border radius',
        ],
      },
      {
        title: 'Contact and social',
        items: ['Social media', 'Contact info'],
      },
    ],
  },
  {
    key: 'footer',
    routeNameSuffix: 'footer',
    label: 'Footer',
    description: 'Susun penutup halaman dengan link penting, kontak, legal, dan social channel.',
    icon: Bot,
    tone: 'cyan',
    stats: [
      { label: 'Footer zones', value: '4' },
      { label: 'Link columns', value: 'Flexible' },
      { label: 'Legal items', value: '2+' },
    ],
    sections: [
      {
        title: 'Footer zones',
        items: ['Brand summary', 'Quick links', 'Support links', 'Legal links'],
      },
      {
        title: 'Signals',
        items: ['Social media', 'Contact info', 'Copyright'],
      },
      {
        title: 'Optional blocks',
        items: ['Newsletter form', 'Trust badges', 'Secondary CTA'],
      },
    ],
  },
  {
    key: 'settings',
    routeNameSuffix: 'settings',
    label: 'Settings',
    description: 'Atur default behavior, akses, domain binding, dan preferensi publikasi halaman.',
    icon: SlidersHorizontal,
    tone: 'slate',
    stats: [
      { label: 'System controls', value: '6' },
      { label: 'Visibility rules', value: '3' },
      { label: 'Integrations', value: 'Optional' },
    ],
    sections: [
      {
        title: 'System preferences',
        items: ['Default locale', 'Timezone', 'Publish rules'],
      },
      {
        title: 'Access control',
        items: ['Workspace access', 'Role scope', 'Approval flow'],
      },
      {
        title: 'Operational settings',
        items: ['Domain binding', 'SEO defaults', 'Lead routing', 'Analytics hooks'],
      },
    ],
  },
]

const toneRoute = {
  sky: 'bg-gradient-to-br from-sky-500 to-cyan-500',
  violet: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-500',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-500',
  cyan: 'bg-gradient-to-br from-cyan-500 to-sky-500',
  slate: 'bg-gradient-to-br from-slate-600 to-gray-700',
} as const

export function getLandingMenuToneClasses(tone: LandingMenuTone) {
  return toneRoute[tone]
}

export function buildLandingManagementMenuItems(routePrefix: string) {
  return landingMenuPages.map((page) => ({
    label: page.label,
    route: `${routePrefix}-${page.routeNameSuffix}`,
    icon: page.icon,
    tone: page.tone,
    description: page.description,
  }))
}

export function buildLandingManagementRoutes(routePrefix: string): RouteRecordRaw[] {
  const isPlatformRoute = routePrefix.startsWith('platform-')

  return landingMenuPages.map((page) => ({
    path: `${routePrefix}/${page.routeNameSuffix}`,
    name: `${routePrefix}-${page.routeNameSuffix}`,
    component:
      page.key === 'pages'
        ? () => import('./pages/LandingPagesManagementPage.vue')
        : () => import('./pages/LandingMenuDetailPage.vue'),
    props:
      page.key === 'pages'
        ? {
            title: isPlatformRoute ? 'Platform Landing Pages' : 'Landing Pages',
            description: isPlatformRoute
              ? 'Kelola page, create slug, status publish, dan unpublish untuk landing page platform.'
              : 'Kelola page, create slug, status publish, dan unpublish untuk landing page workspace.',
            mode: isPlatformRoute ? 'platform' : 'workspace',
          }
        : { definition: page, parentRouteName: routePrefix, parentLabel: 'Landing Page' },
    meta: { title: page.label },
  }))
}

export const landingManagementTopIcon = Sparkles
export const landingManagementMenuIcon = SquareMenu
export const landingManagementNavIcon = Waypoints
export const landingManagementInfoIcon = BadgeInfo
export const landingManagementFolderIcon = Folders
export const landingManagementCheckIcon = CheckSquare2
