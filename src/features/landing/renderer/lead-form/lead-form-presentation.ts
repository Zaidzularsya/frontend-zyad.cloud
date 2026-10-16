import { pickOnColor } from './contrast'

/**
 * Konfigurasi tampilan blok Form Konsultasi, disimpan di atribut `data-zyad-config` blok
 * (per blok per halaman). Dipakai editor dan halaman publik. Pembacaan sangat ketat: nilai
 * tidak valid jatuh ke default tanpa error, karena nilai warna dipakai sebagai variabel CSS
 * dan tidak boleh menjadi jalur injeksi CSS.
 */

export type LeadFormStyle = 'kartu' | 'minimal' | 'glass' | 'split' | 'inline'
export type LeadFormDisplay = 'inline' | 'popup'
export type LeadFormRadius = 'page' | 'sm' | 'md' | 'lg'

export interface LeadFormPresentation {
  formId: string
  style: LeadFormStyle
  display: LeadFormDisplay
  /** '#rrggbb' atau null = ikut halaman. */
  accent: string | null
  /** '#rrggbb' atau null = otomatis sesuai gaya. */
  background: string | null
  text: string | null
  radius: LeadFormRadius
  columns: 1 | 2
  inheritFont: boolean
  split: { title: string; points: string[] }
  popup: { label: string; icon: 'chat' | 'whatsapp'; position: 'right' | 'left'; title: string }
}

export const SPLIT_TITLE_MAX = 80
export const SPLIT_POINT_MAX = 60
export const SPLIT_POINTS_MAX = 3
export const POPUP_LABEL_MAX = 30
export const POPUP_TITLE_MAX = 80

const STYLES: readonly LeadFormStyle[] = ['kartu', 'minimal', 'glass', 'split', 'inline']
const DISPLAYS: readonly LeadFormDisplay[] = ['inline', 'popup']
const RADII: readonly LeadFormRadius[] = ['page', 'sm', 'md', 'lg']
const RADIUS_PX: Record<Exclude<LeadFormRadius, 'page'>, string> = {
  sm: '6px',
  md: '12px',
  lg: '20px',
}
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const FALLBACK_FONT = "'Inter', 'Segoe UI', system-ui, sans-serif"

export const DEFAULT_PRESENTATION: LeadFormPresentation = {
  formId: '',
  style: 'kartu',
  display: 'inline',
  accent: null,
  background: null,
  text: null,
  radius: 'page',
  columns: 2,
  inheritFont: true,
  split: { title: '', points: [] },
  popup: { label: 'Konsultasi gratis', icon: 'chat', position: 'right', title: 'Hubungi kami' },
}

type Raw = Record<string, unknown>

const isRecord = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function color(value: unknown): string | null {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : null
}

function text(value: unknown, max: number, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return Array.from(value.trim()).slice(0, max).join('')
}

export function readLeadFormPresentation(raw: string | undefined): LeadFormPresentation {
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    parsed = {}
  }
  const o: Raw = isRecord(parsed) ? parsed : {}
  const split = isRecord(o.split) ? o.split : {}
  const popup = isRecord(o.popup) ? o.popup : {}
  const d = DEFAULT_PRESENTATION

  const points = Array.isArray(split.points)
    ? split.points
        .filter((p): p is string => typeof p === 'string')
        .map((p) => text(p, SPLIT_POINT_MAX, ''))
        .filter(Boolean)
        .slice(0, SPLIT_POINTS_MAX)
    : []

  return {
    formId: typeof o.form_id === 'string' ? o.form_id : '',
    style: oneOf(o.style, STYLES, d.style),
    display: oneOf(o.display, DISPLAYS, d.display),
    accent: color(o.accent),
    background: color(o.background),
    text: color(o.text),
    radius: oneOf(o.radius, RADII, d.radius),
    columns: o.columns === 1 ? 1 : 2,
    inheritFont: typeof o.inherit_font === 'boolean' ? o.inherit_font : d.inheritFont,
    split: { title: text(split.title, SPLIT_TITLE_MAX, ''), points },
    popup: {
      label: text(popup.label, POPUP_LABEL_MAX, d.popup.label) || d.popup.label,
      icon: oneOf(popup.icon, ['chat', 'whatsapp'] as const, d.popup.icon),
      position: oneOf(popup.position, ['right', 'left'] as const, d.popup.position),
      title: text(popup.title, POPUP_TITLE_MAX, d.popup.title) || d.popup.title,
    },
  }
}

/** JSON untuk `data-zyad-config` (snake_case). */
export function writeLeadFormPresentation(p: LeadFormPresentation): string {
  return JSON.stringify({
    form_id: p.formId,
    style: p.style,
    display: p.display,
    accent: p.accent,
    background: p.background,
    text: p.text,
    radius: p.radius,
    columns: p.columns,
    inherit_font: p.inheritFont,
    split: p.split,
    popup: p.popup,
  })
}

/** Ganti form_id tanpa menghilangkan pengaturan tampilan yang sudah ada. */
export function withFormId(raw: string | undefined, formId: string): string {
  return writeLeadFormPresentation({ ...readLeadFormPresentation(raw), formId })
}

/** Hanya gaya yang menghormati pilihan jumlah kolom. */
export function supportsColumns(style: LeadFormStyle): boolean {
  return style === 'kartu' || style === 'minimal' || style === 'glass'
}

/** Variabel CSS inline: hanya nilai custom; selain itu CSS jatuh ke token halaman / default gaya. */
export function presentationStyle(p: LeadFormPresentation): Record<string, string> {
  const style: Record<string, string> = {}
  if (p.accent) {
    style['--zy-lf-accent-custom'] = p.accent
    style['--zy-lf-on-accent-custom'] = pickOnColor(p.accent)
  }
  if (p.background) style['--zy-lf-bg-custom'] = p.background
  if (p.text) style['--zy-lf-fg-custom'] = p.text
  if (p.radius !== 'page') style['--zy-lf-radius-custom'] = RADIUS_PX[p.radius]
  if (!p.inheritFont) style['font-family'] = FALLBACK_FONT
  return style
}
