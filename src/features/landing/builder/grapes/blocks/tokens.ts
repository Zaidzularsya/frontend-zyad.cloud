/**
 * Shared color/spacing tokens + tiny HTML helpers for the static GrapesJS
 * section blocks (DESIGN.md: sky/teal palette, 16px card radius, 10-12px
 * button radius, clamp()-based section padding instead of media queries
 * since these are standalone inline-styled snippets).
 */
export type GrapesBlockCategory =
  | 'Navigation'
  | 'Introduction'
  | 'Product & Service'
  | 'Trust & Social Proof'
  | 'Conversion'
  | 'Information & Content'
  | 'Ecosystem'
  | 'Footer'
  | 'Layout'
  | 'Dasar'
  | 'Media'

export interface GrapesBlockDef {
  id: string
  label: string
  category: GrapesBlockCategory
  /** HTML string or a GrapesJS component definition. */
  content: string | Record<string, unknown>
  media?: string
}

export const COLOR = {
  sky: '#0EA5E9',
  skyLight: '#7DD3FC',
  teal: '#14B8A6',
  tealLight: '#2DD4BF',
  cyanNode: '#22D3EE',
  navy: '#0B1F3A',
  darkSurface: '#0F172A',
  darkSurfaceAlt: '#0B0F19',
  ink: '#191C1E',
  muted: '#475569',
  mutedOnDark: '#94A3B8',
  hairline: '#E0E3E5',
  hairlineOnDark: '#1E293B',
  surface: '#F7F9FB',
  white: '#FFFFFF',
  link: '#0058BE',
} as const

/** The one blue -> teal focal-accent gradient DESIGN.md allows per view. */
export const GRADIENT = `linear-gradient(100deg, ${COLOR.sky} 0%, ${COLOR.tealLight} 100%)`

export const SECTION_PAD = 'clamp(56px,8vw,96px) 24px'
export const SECTION_PAD_TIGHT = 'clamp(32px,5vw,56px) 24px'
export const CONTAINER = 'max-width:1120px;margin:0 auto'
export const CONTAINER_NARROW = 'max-width:760px;margin:0 auto'

export function icon(name: string): string {
  return `<span class="material-symbols-outlined" style="font-size:22px">${name}</span>`
}

export function btnPrimary(label: string, href = '#'): string {
  return `<a href="${href}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:${COLOR.sky};color:#fff;font-weight:700;text-decoration:none">${label}</a>`
}

export function btnOutline(label: string, href = '#', color: string = COLOR.sky): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;border-radius:10px;border:1.5px solid ${color};color:${color};font-weight:600;text-decoration:none">${label}</a>`
}

export function btnGhost(label: string, href = '#', color: string = COLOR.white): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;border-radius:10px;border:1.5px solid rgba(255,255,255,.35);color:${color};font-weight:600;text-decoration:none">${label}</a>`
}

/** The single detached "node" accent DESIGN.md allows per section — must mark something. */
export function node(color: string = COLOR.cyanNode, size = 10): string {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:999px;background:${color};flex-shrink:0"></span>`
}

export function eyebrow(text: string, color: string = COLOR.sky): string {
  return `<p style="font-size:14px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${color};margin:0 0 12px">${text}</p>`
}

export function avatarPlaceholder(size = 48): string {
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${COLOR.surface};border:1px solid ${COLOR.hairline}"></div>`
}
