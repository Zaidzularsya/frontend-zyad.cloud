/**
 * Starter block set for the GrapesJS editor. Plain HTML snippets — no custom
 * component types yet (that comes with the real editor phase). Each block carries
 * a compact Material Symbols glyph as its `media` (the webfont is loaded globally
 * in index.html) so tiles stay small and consistent.
 *
 * `grapesjs-blocks-basic` still contributes the flex column primitives
 * (`column1/2/3`) into the "Layout" category via grapes.config.ts.
 */
export interface GrapesBlockDef {
  id: string
  label: string
  category: 'Section' | 'Layout' | 'Dasar' | 'Media'
  /** HTML string or a GrapesJS component definition. */
  content: string | Record<string, unknown>
  media?: string
}

function icon(name: string): string {
  return `<span class="material-symbols-outlined" style="font-size:22px">${name}</span>`
}

// ── Section composites ──────────────────────────────────────────────────────
const heroBlock = `
  <section style="padding:88px 24px;text-align:center;background:#0f172a;color:#fff">
    <div style="max-width:760px;margin:0 auto">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd;margin:0 0 12px">Badge</p>
      <h1 style="font-size:46px;line-height:1.1;font-weight:800;margin:0 0 16px">Judul utama halaman</h1>
      <p style="font-size:18px;opacity:.85;margin:0 0 28px">Kalimat pendukung singkat yang menjelaskan nilai produk.</p>
      <a href="#" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none">Mulai sekarang</a>
    </div>
  </section>`

const featuresBlock = `
  <section style="padding:72px 24px">
    <div style="max-width:1120px;margin:0 auto">
      <h2 style="font-size:32px;font-weight:700;text-align:center;margin:0 0 40px">Fitur unggulan</h2>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
        <div style="padding:24px;border:1px solid #e2e8f0;border-radius:14px">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">Judul fitur</h3>
          <p style="margin:0;color:#475569">Deskripsi singkat fitur pertama.</p>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-radius:14px">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">Judul fitur</h3>
          <p style="margin:0;color:#475569">Deskripsi singkat fitur kedua.</p>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-radius:14px">
          <h3 style="font-size:18px;font-weight:700;margin:0 0 8px">Judul fitur</h3>
          <p style="margin:0;color:#475569">Deskripsi singkat fitur ketiga.</p>
        </div>
      </div>
    </div>
  </section>`

const ctaBlock = `
  <section style="padding:64px 24px;background:#eff6ff;text-align:center">
    <div style="max-width:640px;margin:0 auto">
      <h2 style="font-size:28px;font-weight:800;margin:0 0 12px">Siap mencoba?</h2>
      <p style="margin:0 0 24px;color:#475569">Ajakan singkat untuk pengunjung mengambil tindakan.</p>
      <a href="#" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none">Hubungi kami</a>
    </div>
  </section>`

const testimonialBlock = `
  <section style="padding:72px 24px;text-align:center">
    <div style="max-width:720px;margin:0 auto">
      <p style="font-size:24px;line-height:1.5;font-weight:500;margin:0 0 20px">"Kutipan pelanggan yang menceritakan pengalaman positif memakai produk."</p>
      <p style="margin:0;font-weight:700">Nama Pelanggan</p>
      <p style="margin:0;color:#64748b;font-size:14px">Jabatan, Perusahaan</p>
    </div>
  </section>`

const faqBlock = `
  <section style="padding:72px 24px">
    <div style="max-width:760px;margin:0 auto">
      <h2 style="font-size:32px;font-weight:700;text-align:center;margin:0 0 32px">Pertanyaan umum</h2>
      <details style="border-bottom:1px solid #e2e8f0;padding:16px 0"><summary style="font-weight:600;cursor:pointer">Pertanyaan pertama?</summary><p style="margin:12px 0 0;color:#475569">Jawaban singkat.</p></details>
      <details style="border-bottom:1px solid #e2e8f0;padding:16px 0"><summary style="font-weight:600;cursor:pointer">Pertanyaan kedua?</summary><p style="margin:12px 0 0;color:#475569">Jawaban singkat.</p></details>
    </div>
  </section>`

const pricingBlock = `
  <section style="padding:72px 24px">
    <div style="max-width:1120px;margin:0 auto">
      <h2 style="font-size:32px;font-weight:700;text-align:center;margin:0 0 40px">Paket harga</h2>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
        <div style="padding:28px;border:1px solid #e2e8f0;border-radius:16px;text-align:center">
          <h3 style="margin:0 0 8px;font-weight:700">Starter</h3>
          <p style="font-size:32px;font-weight:800;margin:0 0 16px">Rp0</p>
          <a href="#" style="display:inline-block;padding:10px 20px;border-radius:8px;border:1px solid #2563eb;color:#2563eb;font-weight:600;text-decoration:none">Pilih</a>
        </div>
        <div style="padding:28px;border:2px solid #2563eb;border-radius:16px;text-align:center">
          <h3 style="margin:0 0 8px;font-weight:700">Growth</h3>
          <p style="font-size:32px;font-weight:800;margin:0 0 16px">Rp499rb</p>
          <a href="#" style="display:inline-block;padding:10px 20px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;text-decoration:none">Pilih</a>
        </div>
        <div style="padding:28px;border:1px solid #e2e8f0;border-radius:16px;text-align:center">
          <h3 style="margin:0 0 8px;font-weight:700">Scale</h3>
          <p style="font-size:32px;font-weight:800;margin:0 0 16px">Custom</p>
          <a href="#" style="display:inline-block;padding:10px 20px;border-radius:8px;border:1px solid #2563eb;color:#2563eb;font-weight:600;text-decoration:none">Kontak</a>
        </div>
      </div>
    </div>
  </section>`

const logoStripBlock = `
  <section style="padding:48px 24px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">
    <div style="max-width:1000px;margin:0 auto;display:flex;flex-wrap:wrap;gap:40px;align-items:center;justify-content:center;opacity:.7">
      <span style="font-weight:800;font-size:20px">LOGO</span><span style="font-weight:800;font-size:20px">LOGO</span>
      <span style="font-weight:800;font-size:20px">LOGO</span><span style="font-weight:800;font-size:20px">LOGO</span>
      <span style="font-weight:800;font-size:20px">LOGO</span>
    </div>
  </section>`

const footerBlock = `
  <footer style="padding:56px 24px;background:#0f172a;color:#cbd5e1">
    <div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between">
      <div style="max-width:280px">
        <p style="font-weight:800;font-size:18px;color:#fff;margin:0 0 8px">Brand</p>
        <p style="margin:0;font-size:14px">Deskripsi singkat perusahaan.</p>
      </div>
      <div><p style="color:#fff;font-weight:600;margin:0 0 12px">Produk</p><p style="margin:4px 0;font-size:14px">Tautan</p><p style="margin:4px 0;font-size:14px">Tautan</p></div>
      <div><p style="color:#fff;font-weight:600;margin:0 0 12px">Perusahaan</p><p style="margin:4px 0;font-size:14px">Tautan</p><p style="margin:4px 0;font-size:14px">Tautan</p></div>
    </div>
    <p style="max-width:1120px;margin:32px auto 0;font-size:13px;border-top:1px solid #1e293b;padding-top:16px">© 2026 Brand. Semua hak dilindungi.</p>
  </footer>`

export const GRAPES_BLOCKS: GrapesBlockDef[] = [
  // ── Section ──────────────────────────────────────────────────────────────
  { id: 'sec-hero', label: 'Hero', category: 'Section', media: icon('web'), content: heroBlock },
  {
    id: 'sec-features',
    label: 'Fitur 3 kolom',
    category: 'Section',
    media: icon('grid_view'),
    content: featuresBlock,
  },
  { id: 'sec-cta', label: 'CTA', category: 'Section', media: icon('campaign'), content: ctaBlock },
  {
    id: 'sec-testimonial',
    label: 'Testimoni',
    category: 'Section',
    media: icon('format_quote'),
    content: testimonialBlock,
  },
  { id: 'sec-faq', label: 'FAQ', category: 'Section', media: icon('help'), content: faqBlock },
  {
    id: 'sec-pricing',
    label: 'Harga',
    category: 'Section',
    media: icon('sell'),
    content: pricingBlock,
  },
  {
    id: 'sec-logos',
    label: 'Logo klien',
    category: 'Section',
    media: icon('apps'),
    content: logoStripBlock,
  },
  {
    id: 'sec-footer',
    label: 'Footer',
    category: 'Section',
    media: icon('call_to_action'),
    content: footerBlock,
  },

  // ── Layout ───────────────────────────────────────────────────────────────
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

  // ── Dasar ────────────────────────────────────────────────────────────────
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

  // ── Media ────────────────────────────────────────────────────────────────
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
