import type { Component } from 'vue'
import {
  BadgeInfo,
  CheckSquare2,
  FileText,
  Folders,
  Globe2,
  Layers3,
  Menu,
  Palette,
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
  hiddenFromMenu?: boolean
}

export const landingMenuPages: LandingMenuPageDefinition[] = [
  {
    key: 'pages',
    routeNameSuffix: 'pages',
    label: 'Pages',
    description: 'Atur jenis page, metadata, slug, status publikasi, SEO, dan Open Graph image.',
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
        items: ['Status: draft / published', 'Layout template', 'SEO', 'Open Graph image'],
      },
    ],
  },
  {
    key: 'content',
    routeNameSuffix: 'content',
    label: 'Content',
    description: 'Susun section (hero, pricing, FAQ, CTA, dll), urutan, dan isi konten tiap page.',
    icon: Layers3,
    tone: 'cyan',
    stats: [
      { label: 'Editor', value: 'Visual canvas' },
      { label: 'Blok', value: '15' },
      { label: 'Simpan', value: 'Autosave' },
    ],
    sections: [
      {
        title: 'Palette blok',
        items: [
          'Hero',
          'Problem',
          'Benefits',
          'Solution',
          'Features',
          'FAQ',
          'Pricing',
          'CTA',
          'Footer',
        ],
      },
      {
        title: 'Canvas',
        items: ['Drag & drop', 'Live preview', 'Undo / redo', 'Autosave + publish'],
      },
    ],
  },
  {
    key: 'templates',
    routeNameSuffix: 'templates',
    label: 'Templates',
    description:
      'Kelola katalog page template dan master section template yang menjadi dasar create page tenant.',
    icon: Sparkles,
    tone: 'violet',
    stats: [
      { label: 'Page templates', value: '32' },
      { label: 'Section masters', value: '256' },
      { label: 'Source tables', value: '2' },
    ],
    hiddenFromMenu: true,
    sections: [
      {
        title: 'Page template source',
        items: ['landing_pages', 'is_template=true', 'Preview', 'Use as draft'],
      },
      {
        title: 'Section template source',
        items: ['landing_section_templates', 'templateSlug', 'sectionKey', 'variant'],
      },
      {
        title: 'Draft flow',
        items: ['Select page template', 'Instantiate section masters', 'Customize content'],
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
    key: 'domains',
    routeNameSuffix: 'domains',
    label: 'Domains',
    description: 'Kelola domain, verifikasi DNS, SSL, dan primary domain untuk landing page.',
    icon: Globe2,
    tone: 'emerald',
    stats: [
      { label: 'Domain types', value: '2' },
      { label: 'DNS checks', value: 'TXT' },
      { label: 'SSL states', value: '4' },
    ],
    sections: [
      {
        title: 'Domain setup',
        items: ['Custom domain', 'Workspace subdomain', 'DNS ownership TXT'],
      },
      {
        title: 'Publication routing',
        items: ['Primary domain', 'Landing page binding', 'CNAME and root records'],
      },
      {
        title: 'Operations',
        items: ['Verification status', 'SSL status', 'Disable domain'],
      },
    ],
  },
  {
    key: 'settings',
    routeNameSuffix: 'settings',
    label: 'Settings',
    description: 'Atur publish rules, footer content, domain binding, dan preferensi halaman.',
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
  return landingMenuPages
    .filter((page) => !page.hiddenFromMenu)
    .map((page) => ({
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
        ? () => import('../pages/LandingPagesManagementPage.vue')
        : page.key === 'content'
          ? () => import('../pages/LandingBuilderPage.vue')
          : page.key === 'navigation'
            ? () => import('../pages/LandingNavigationManagementPage.vue')
            : page.key === 'brand-theme'
              ? () => import('../pages/LandingBrandThemeManagementPage.vue')
              : page.key === 'templates'
                ? () => import('../pages/LandingTemplatesManagementPage.vue')
                : page.key === 'domains'
                  ? () => import('@/features/domains/pages/DomainManagementPage.vue')
                  : page.key === 'settings'
                    ? () => import('../pages/LandingSettingsManagementPage.vue')
                    : () => import('../pages/LandingMenuDetailPage.vue'),
    props:
      page.key === 'pages'
        ? {
            title: isPlatformRoute ? 'Platform Landing Pages' : 'Landing Pages',
            description: isPlatformRoute
              ? 'Kelola page, create slug, status publish, dan unpublish untuk landing page platform.'
              : 'Kelola page, create slug, status publish, dan unpublish untuk landing page workspace.',
            mode: isPlatformRoute ? 'platform' : 'workspace',
            parentRouteName: routePrefix,
          }
        : page.key === 'content'
          ? {
              title: isPlatformRoute ? 'Platform Landing Content' : 'Content',
              description:
                'Susun section (hero, pricing, FAQ, CTA, dll), urutan, dan isi konten tiap page.',
              mode: isPlatformRoute ? 'platform' : 'workspace',
              parentRouteName: routePrefix,
            }
          : page.key === 'templates'
            ? {
                title: isPlatformRoute ? 'Platform Landing Templates' : 'Landing Templates',
                description:
                  'Lihat page template dan master section template yang dipakai flow create landing page.',
                mode: isPlatformRoute ? 'platform' : 'workspace',
                parentRouteName: routePrefix,
              }
            : page.key === 'navigation'
              ? {
                  title: isPlatformRoute ? 'Platform Landing Navigation' : 'Landing Navigation',
                  description:
                    'Kelola header, footer, anchor, route publik, dan CTA menu tanpa mengetik destination mentah.',
                  mode: isPlatformRoute ? 'platform' : 'workspace',
                  parentRouteName: routePrefix,
                }
              : page.key === 'brand-theme'
                ? {
                    title: isPlatformRoute ? 'Platform Brand & Theme' : 'Landing Brand & Theme',
                    description:
                      'Kelola identitas brand, asset visual, theme token, kontak, dan social link landing page.',
                    mode: isPlatformRoute ? 'platform' : 'workspace',
                    parentRouteName: routePrefix,
                  }
                : page.key === 'domains'
                  ? {
                      title: isPlatformRoute ? 'Landing Domain Bindings' : 'Domains',
                      description: isPlatformRoute
                        ? 'Kelola domain yang tersedia dan binding domain ke landing page pada platform landing page management.'
                        : 'Kelola domain, subdomain, verifikasi DNS, SSL, dan primary domain untuk landing page workspace.',
                      mode: isPlatformRoute ? 'platform' : 'workspace',
                      parentRouteName: routePrefix,
                    }
                  : page.key === 'settings'
                    ? {
                        title: isPlatformRoute ? 'Platform Landing Settings' : 'Landing Settings',
                        description:
                          'Atur publish rules, footer content, domain binding, dan preferensi page lain per landing page.',
                        mode: isPlatformRoute ? 'platform' : 'workspace',
                        parentRouteName: routePrefix,
                      }
                    : {
                        definition: page,
                        parentRouteName: routePrefix,
                        parentLabel: 'Landing Page',
                      },
    meta: { title: page.label },
  }))
}

export const landingManagementTopIcon = Sparkles
export const landingManagementMenuIcon = SquareMenu
export const landingManagementNavIcon = Waypoints
export const landingManagementInfoIcon = BadgeInfo
export const landingManagementFolderIcon = Folders
export const landingManagementCheckIcon = CheckSquare2
