/**
 * Starter block set for the GrapesJS editor. Plain HTML snippets — no custom
 * component types yet (that comes with the real editor phase). `grapesjs-blocks-basic`
 * already contributes 1-column/2-column/text/link/image/video/map primitives;
 * these add the layout shells our pages actually use.
 */
export interface GrapesBlockDef {
  id: string
  label: string
  category: 'Layout' | 'Dasar' | 'Media'
  /** HTML string or a GrapesJS component definition. */
  content: string | Record<string, unknown>
  attributes?: Record<string, string>
}

const sectionShell = `
  <section style="padding:64px 24px">
    <div style="max-width:1120px;margin:0 auto"></div>
  </section>`

const containerShell = `<div style="max-width:960px;margin:0 auto;padding:24px"></div>`

const rowShell = `
  <div style="display:flex;gap:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:200px"></div>
    <div style="flex:1;min-width:200px"></div>
  </div>`

export const GRAPES_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'zy-section',
    label: 'Section',
    category: 'Layout',
    attributes: { class: 'gjs-block-section' },
    content: sectionShell,
  },
  {
    id: 'zy-container',
    label: 'Container',
    category: 'Layout',
    content: containerShell,
  },
  {
    id: 'zy-row',
    label: 'Baris 2 kolom',
    category: 'Layout',
    content: rowShell,
  },
  {
    id: 'zy-heading',
    label: 'Judul',
    category: 'Dasar',
    content: '<h2 style="font-size:32px;font-weight:700;margin:0">Judul baru</h2>',
  },
  {
    id: 'zy-text',
    label: 'Teks',
    category: 'Dasar',
    content: '<p style="font-size:16px;line-height:1.6;margin:0">Tulis teks di sini.</p>',
  },
  {
    id: 'zy-button',
    label: 'Tombol',
    category: 'Dasar',
    content:
      '<a href="#" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;text-decoration:none">Klik di sini</a>',
  },
  {
    id: 'zy-divider',
    label: 'Divider',
    category: 'Dasar',
    content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />',
  },
  {
    id: 'zy-spacer',
    label: 'Spacer',
    category: 'Layout',
    content: '<div style="height:48px"></div>',
  },
  {
    id: 'zy-image',
    label: 'Gambar',
    category: 'Media',
    content: { type: 'image' },
  },
]
