import {
  avatarPlaceholder,
  btnOutline,
  CONTAINER,
  CONTAINER_NARROW,
  COLOR,
  eyebrow,
  icon,
  SECTION_PAD,
  type GrapesBlockDef,
} from './tokens'

const aboutBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};display:flex;gap:48px;align-items:center;flex-wrap:wrap">
      <div style="flex:1 1 320px;min-width:260px;aspect-ratio:4/3;border-radius:16px;background:${COLOR.surface};border:1px solid ${COLOR.hairline}"></div>
      <div style="flex:1 1 380px;min-width:280px">
        ${eyebrow('Tentang kami')}
        <h2 style="font-size:30px;font-weight:700;color:${COLOR.navy};margin:0 0 16px">Cerita di balik produk ini</h2>
        <p style="margin:0;color:${COLOR.muted};font-size:16px;line-height:1.7">Ceritakan singkat latar belakang, misi, dan nilai yang dipegang perusahaan Anda.</p>
      </div>
    </div>
  </section>`

const teamBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Tim kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;text-align:center">
        ${[1, 2, 3, 4]
          .map(
            () => `
          <div>
            ${avatarPlaceholder(88)}
            <p style="margin:12px 0 2px;font-weight:700;color:${COLOR.navy};font-size:15px">Nama Anggota</p>
            <p style="margin:0;color:${COLOR.muted};font-size:13px">Jabatan</p>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const timelineBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};max-width:800px">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 48px">Perjalanan kami</h2>
      ${['2023 — Mulai berdiri', '2024 — Peluncuran produk pertama', '2025 — Ekspansi ke luar Jawa']
        .map(
          (item) => `
        <div style="display:flex;gap:16px;margin-bottom:24px">
          <div style="width:10px;height:10px;border-radius:999px;background:${COLOR.sky};margin-top:6px;flex-shrink:0"></div>
          <p style="margin:0;color:${COLOR.ink};font-size:15px"><strong style="color:${COLOR.navy}">${item.split(' — ')[0]}</strong> — ${item.split(' — ')[1]}</p>
        </div>`,
        )
        .join('')}
    </div>
  </section>`

const faqBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER_NARROW}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 32px">Pertanyaan umum</h2>
      ${[
        'Bagaimana cara mendaftar?',
        'Apakah ada masa uji coba gratis?',
        'Bagaimana cara membatalkan langganan?',
      ]
        .map(
          (q) => `
        <details style="border-bottom:1px solid ${COLOR.hairline};padding:16px 0">
          <summary style="font-weight:600;cursor:pointer;color:${COLOR.navy}">${q}</summary>
          <p style="margin:12px 0 0;color:${COLOR.muted};font-size:15px;line-height:1.6">Jawaban singkat untuk pertanyaan ini.</p>
        </details>`,
        )
        .join('')}
    </div>
  </section>`

const blogBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Dari blog kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="background:#fff;border:1px solid ${COLOR.hairline};border-radius:16px;overflow:hidden">
            <div style="aspect-ratio:16/9;background:${COLOR.surface}"></div>
            <div style="padding:20px">
              <p style="margin:0 0 6px;font-size:13px;color:${COLOR.muted}">12 Sep 2026</p>
              <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0">Judul artikel yang menarik</h3>
            </div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const articlesBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};max-width:800px">
      <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 24px">Artikel terbaru</h2>
      ${[1, 2, 3]
        .map(
          () => `
        <a href="#" style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid ${COLOR.hairline};text-decoration:none">
          <span style="color:${COLOR.ink};font-weight:600;font-size:15px">Judul artikel singkat</span>
          <span style="color:${COLOR.sky}">${icon('arrow_forward')}</span>
        </a>`,
        )
        .join('')}
    </div>
  </section>`

const resourcesBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Sumber daya</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px">
        ${['Dokumentasi', 'Panduan memulai', 'Studi kasus']
          .map(
            (title) => `
          <div style="padding:24px;background:#fff;border:1px solid ${COLOR.hairline};border-radius:16px">
            <div style="color:${COLOR.sky};margin-bottom:12px">${icon('menu_book')}</div>
            <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">${title}</h3>
            <p style="margin:0;color:${COLOR.muted};font-size:14px">Deskripsi singkat sumber daya ini.</p>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const galleryBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Galeri</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px">
        ${Array.from({ length: 6 })
          .map(
            () =>
              `<div style="aspect-ratio:1;border-radius:12px;background:${COLOR.surface};border:1px solid ${COLOR.hairline}"></div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const portfolioBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Portofolio kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">
        ${[1, 2, 3, 4]
          .map(
            () => `
          <div style="border-radius:16px;overflow:hidden;background:#fff;border:1px solid ${COLOR.hairline}">
            <div style="aspect-ratio:4/3;background:${COLOR.surface}"></div>
            <div style="padding:16px">
              <h3 style="font-size:15px;font-weight:700;color:${COLOR.navy};margin:0">Nama proyek</h3>
            </div>
          </div>`,
          )
          .join('')}
      </div>
      ${btnOutline('Lihat semua proyek')}
    </div>
  </section>`

export const INFORMATION_CONTENT_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'ic-about',
    label: 'About',
    category: 'Information & Content',
    media: icon('info'),
    content: aboutBlock,
  },
  {
    id: 'ic-team',
    label: 'Team',
    category: 'Information & Content',
    media: icon('groups'),
    content: teamBlock,
  },
  {
    id: 'ic-timeline',
    label: 'Timeline',
    category: 'Information & Content',
    media: icon('timeline'),
    content: timelineBlock,
  },
  {
    id: 'ic-faq',
    label: 'FAQ',
    category: 'Information & Content',
    media: icon('help'),
    content: faqBlock,
  },
  {
    id: 'ic-blog',
    label: 'Blog',
    category: 'Information & Content',
    media: icon('article'),
    content: blogBlock,
  },
  {
    id: 'ic-articles',
    label: 'Articles',
    category: 'Information & Content',
    media: icon('description'),
    content: articlesBlock,
  },
  {
    id: 'ic-resources',
    label: 'Resources',
    category: 'Information & Content',
    media: icon('menu_book'),
    content: resourcesBlock,
  },
  {
    id: 'ic-gallery',
    label: 'Gallery',
    category: 'Information & Content',
    media: icon('collections'),
    content: galleryBlock,
  },
  {
    id: 'ic-portfolio',
    label: 'Portfolio',
    category: 'Information & Content',
    media: icon('work'),
    content: portfolioBlock,
  },
]
