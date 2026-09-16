import {
  btnGhost,
  btnOutline,
  btnPrimary,
  CONTAINER,
  COLOR,
  eyebrow,
  GRADIENT,
  icon,
  node,
  SECTION_PAD,
  type GrapesBlockDef,
} from './tokens'

const heroBlock = `
  <section style="padding:${SECTION_PAD};text-align:center;background:${COLOR.navy};color:#fff;position:relative;overflow:hidden">
    <div style="position:absolute;top:-80px;right:-60px;width:280px;height:280px;border-radius:999px;background:${GRADIENT};opacity:.25;filter:blur(60px)"></div>
    <div style="${CONTAINER};position:relative;max-width:760px">
      ${eyebrow('Badge', COLOR.skyLight)}
      <h1 style="font-size:clamp(32px,5vw,60px);line-height:1.1;font-weight:700;letter-spacing:-.02em;margin:0 0 16px">Judul utama halaman</h1>
      <p style="font-size:18px;line-height:1.6;color:${COLOR.mutedOnDark};margin:0 0 28px">Kalimat pendukung singkat yang menjelaskan nilai produk.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${btnPrimary('Mulai sekarang')}
        ${btnGhost('Pelajari lebih lanjut')}
      </div>
    </div>
  </section>`

const pageHeaderBlock = `
  <section style="padding:clamp(40px,6vw,64px) 24px;background:${COLOR.surface};border-bottom:1px solid ${COLOR.hairline}">
    <div style="${CONTAINER};max-width:900px">
      ${eyebrow('Kategori')}
      <h1 style="font-size:clamp(28px,4vw,40px);font-weight:700;color:${COLOR.navy};margin:0 0 8px">Judul halaman</h1>
      <p style="font-size:16px;color:${COLOR.muted};margin:0">Deskripsi singkat tentang isi halaman ini.</p>
    </div>
  </section>`

const videoHeroBlock = `
  <section style="padding:${SECTION_PAD};text-align:center;background:#fff">
    <div style="${CONTAINER};max-width:820px">
      ${eyebrow('Badge')}
      <h1 style="font-size:clamp(30px,4.5vw,52px);font-weight:700;letter-spacing:-.02em;color:${COLOR.navy};margin:0 0 16px">Lihat produk kami bekerja</h1>
      <p style="font-size:18px;color:${COLOR.muted};margin:0 0 32px">Kalimat pendukung singkat tentang video di bawah.</p>
      <div style="position:relative;border-radius:16px;overflow:hidden;aspect-ratio:16/9;background:${COLOR.navy};display:flex;align-items:center;justify-content:center">
        <span style="width:64px;height:64px;border-radius:999px;background:${GRADIENT};display:flex;align-items:center;justify-content:center;color:#fff">${icon('play_arrow')}</span>
      </div>
    </div>
  </section>`

const splitHeroBlock = `
  <section style="padding:${SECTION_PAD};background:#fff">
    <div style="${CONTAINER};display:flex;gap:48px;align-items:center;flex-wrap:wrap">
      <div style="flex:1 1 380px;min-width:280px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">${node()}${eyebrow('Badge')}</div>
        <h1 style="font-size:clamp(30px,4.5vw,48px);font-weight:700;letter-spacing:-.02em;color:${COLOR.navy};margin:0 0 16px">Judul yang menjelaskan nilai utama</h1>
        <p style="font-size:18px;line-height:1.6;color:${COLOR.muted};margin:0 0 28px">Kalimat pendukung yang menjelaskan produk secara singkat.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${btnPrimary('Mulai sekarang')}
          ${btnOutline('Lihat demo')}
        </div>
      </div>
      <div style="flex:1 1 320px;min-width:260px;aspect-ratio:4/3;border-radius:16px;background:${COLOR.surface};border:1px solid ${COLOR.hairline}"></div>
    </div>
  </section>`

const minimalHeroBlock = `
  <section style="padding:${SECTION_PAD};text-align:center;background:#fff">
    <div style="${CONTAINER};max-width:640px">
      <h1 style="font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-.02em;color:${COLOR.navy};margin:0 0 16px">Judul singkat dan jelas</h1>
      <p style="font-size:17px;color:${COLOR.muted};margin:0 0 24px">Satu kalimat pendukung, tanpa gambar besar.</p>
      ${btnPrimary('Mulai sekarang')}
    </div>
  </section>`

export const INTRODUCTION_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'intro-hero',
    label: 'Hero',
    category: 'Introduction',
    media: icon('web'),
    content: heroBlock,
  },
  {
    id: 'intro-page-header',
    label: 'Page Header',
    category: 'Introduction',
    media: icon('view_headline'),
    content: pageHeaderBlock,
  },
  {
    id: 'intro-video-hero',
    label: 'Video Hero',
    category: 'Introduction',
    media: icon('smart_display'),
    content: videoHeroBlock,
  },
  {
    id: 'intro-split-hero',
    label: 'Split Hero',
    category: 'Introduction',
    media: icon('vertical_split'),
    content: splitHeroBlock,
  },
  {
    id: 'intro-minimal-hero',
    label: 'Minimal Hero',
    category: 'Introduction',
    media: icon('crop_free'),
    content: minimalHeroBlock,
  },
]
