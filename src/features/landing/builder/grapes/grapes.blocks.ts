/**
 * Block catalog for the GrapesJS editor, organized as a standard landing-page
 * section library (8 marketing categories: Navigation, Introduction, Product &
 * Service, Trust & Social Proof, Conversion, Information & Content, Ecosystem,
 * Footer — see `./blocks/*`), plus generic Layout/Dasar/Media primitives below.
 *
 * Every block is a plain HTML snippet (self-contained inline styles, no
 * dependency on a starter's CSS classes) except the 3 "Tenant" ones
 * (`tenant-header`/`tenant-footer`/`tenant-pricing`, folded into the
 * Navigation/Footer/Conversion categories respectively) — those drop a
 * locked component type that renders LIVE tenant-wide data (see the comment
 * below). Each block carries a compact Material Symbols glyph as its `media`
 * (the webfont is loaded globally in index.html) so tiles stay small and
 * consistent.
 *
 * `grapesjs-blocks-basic` still contributes the flex column primitives
 * (`column1/2/3`) into the "Layout" category via grapes.config.ts.
 */
import { CONVERSION_BLOCKS } from './blocks/conversion'
import { ECOSYSTEM_BLOCKS } from './blocks/ecosystem'
import { FOOTER_BLOCKS } from './blocks/footer'
import { INFORMATION_CONTENT_BLOCKS } from './blocks/information-content'
import { INTRODUCTION_BLOCKS } from './blocks/introduction'
import { NAVIGATION_BLOCKS } from './blocks/navigation'
import { PRODUCT_SERVICE_BLOCKS } from './blocks/product-service'
import { icon, type GrapesBlockDef } from './blocks/tokens'
import { TRUST_SOCIAL_PROOF_BLOCKS } from './blocks/trust-social-proof'

export type { GrapesBlockDef } from './blocks/tokens'

// ── Tenant chrome (live) ───────────────────────────────────────────────────
// "Header tenant" / "Footer tenant" / "Pricing tenant" drop the
// `zyad-tenant-header` / `zyad-tenant-footer` / `zyad-pricing-plans`
// components (grapes.header-component.ts, grapes.footer-component.ts,
// grapes.pricing-component.ts): locked components that render a LIVE preview
// from tenant-wide data in the canvas, and export to a `data-zyad-slot`
// sentinel — the sentinel's innerHTML is (re)built at render time by
// GrapesPageFrame.vue / document_ssr.go. Each is meant to appear at most once
// per page (enforced in GrapesEditor.vue's `component:add` guard). They live
// in ./blocks/navigation.ts (header), ./blocks/footer.ts (footer) and
// ./blocks/conversion.ts (pricing) — grouped with their closest marketing
// category rather than a separate "Tenant" bucket.

const MARKETING_SECTION_BLOCKS: GrapesBlockDef[] = [
  ...NAVIGATION_BLOCKS,
  ...INTRODUCTION_BLOCKS,
  ...PRODUCT_SERVICE_BLOCKS,
  ...TRUST_SOCIAL_PROOF_BLOCKS,
  ...CONVERSION_BLOCKS,
  ...INFORMATION_CONTENT_BLOCKS,
  ...ECOSYSTEM_BLOCKS,
  ...FOOTER_BLOCKS,
]

// ── Layout ───────────────────────────────────────────────────────────────
const LAYOUT_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'zy-section',
    label: 'Section',
    category: 'Layout',
    media: icon('crop_landscape'),
    content:
      '<section style="padding:64px 24px"><div style="max-width:1120px;margin:0 auto"></div></section>',
  },
  {
    id: 'zy-container',
    label: 'Container',
    category: 'Layout',
    media: icon('check_box_outline_blank'),
    content: '<div style="max-width:960px;margin:0 auto;padding:24px"></div>',
  },
  {
    id: 'zy-grid',
    label: 'Grid 3',
    category: 'Layout',
    media: icon('grid_on'),
    content:
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px"><div></div><div></div><div></div></div>',
  },
  {
    id: 'zy-spacer',
    label: 'Spacer',
    category: 'Layout',
    media: icon('height'),
    content: '<div style="height:48px"></div>',
  },
  {
    id: 'zy-divider',
    label: 'Divider',
    category: 'Layout',
    media: icon('horizontal_rule'),
    content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />',
  },
]

// ── Dasar ────────────────────────────────────────────────────────────────
const DASAR_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'zy-heading',
    label: 'Judul',
    category: 'Dasar',
    media: icon('title'),
    content: '<h2 style="font-size:32px;font-weight:700;margin:0">Judul baru</h2>',
  },
  {
    id: 'zy-text',
    label: 'Teks',
    category: 'Dasar',
    media: icon('notes'),
    content: '<p style="font-size:16px;line-height:1.6;margin:0">Tulis teks di sini.</p>',
  },
  {
    id: 'zy-button',
    label: 'Tombol',
    category: 'Dasar',
    media: icon('smart_button'),
    content:
      '<a href="#" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;text-decoration:none">Klik di sini</a>',
  },
  {
    id: 'zy-link',
    label: 'Tautan',
    category: 'Dasar',
    media: icon('link'),
    content: '<a href="#" style="color:#2563eb;text-decoration:underline">Tautan teks</a>',
  },
  {
    id: 'zy-list',
    label: 'Daftar',
    category: 'Dasar',
    media: icon('format_list_bulleted'),
    content:
      '<ul style="margin:0;padding-left:20px;line-height:1.8"><li>Butir pertama</li><li>Butir kedua</li><li>Butir ketiga</li></ul>',
  },
  {
    id: 'zy-quote',
    label: 'Kutipan',
    category: 'Dasar',
    media: icon('format_quote'),
    content:
      '<blockquote style="margin:0;padding-left:16px;border-left:3px solid #2563eb;color:#475569;font-style:italic">Kutipan singkat.</blockquote>',
  },
]

// ── Media ────────────────────────────────────────────────────────────────
const MEDIA_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'zy-image',
    label: 'Gambar',
    category: 'Media',
    media: icon('image'),
    content: { type: 'image' },
  },
  {
    id: 'zy-video',
    label: 'Video',
    category: 'Media',
    media: icon('smart_display'),
    content: {
      type: 'video',
      provider: 'yt',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      style: { width: '100%', 'aspect-ratio': '16 / 9', height: 'auto' },
    },
  },
]

export const GRAPES_BLOCKS: GrapesBlockDef[] = [
  ...MARKETING_SECTION_BLOCKS,
  ...LAYOUT_BLOCKS,
  ...DASAR_BLOCKS,
  ...MEDIA_BLOCKS,
]
