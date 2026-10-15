import {
  btnOutline,
  btnPrimary,
  COLOR,
  CONTAINER,
  eyebrow,
  GRADIENT,
  icon,
  SECTION_PAD,
  type GrapesBlockDef,
} from './tokens'

/**
 * Blok beranimasi (MOTION 3). Kelas `zy-*` didefinisikan di
 * renderer/motion/zy-motion.css; runtime-nya dipasang renderer publik dan
 * kanvas editor. Konten tetap terbaca tanpa JS (state tersembunyi hanya di
 * bawah `.zy-js`). Aturan kualitas: satu `zy-aurora` per halaman (hanya blok
 * hero), headline LCP memakai `zy-anim-hero`, copy placeholder dalam kurung
 * siku — tanpa angka/testimoni/nama merek karangan.
 *
 * Responsif tanpa media query: grid `auto-fit/minmax(min(100%,…))` dan flex-wrap
 * membuat kolom bertumpuk di bawah 768px.
 */

const card = `padding:28px;border:1px solid ${COLOR.hairline};border-radius:16px;background:#fff`

const heroAuroraBlock = `
  <section class="zy-aurora" style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:40px;align-items:center">
      <div>
        ${eyebrow('[Badge]', COLOR.link)}
        <h1 class="zy-anim-hero" style="font-size:clamp(32px,5vw,56px);line-height:1.1;font-weight:700;letter-spacing:-.02em;color:${COLOR.navy};margin:0 0 16px">[Judul utama] <span class="zy-text-shimmer" style="color:${COLOR.link}">[frasa sorotan]</span></h1>
        <p style="font-size:18px;line-height:1.6;color:${COLOR.muted};margin:0 0 28px">[Kalimat pendukung singkat yang menjelaskan nilai produk.]</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${btnPrimary('[Tombol utama]')}
          ${btnOutline('[Tombol kedua]', '#', COLOR.link)}
        </div>
      </div>
      <div class="zy-float" style="min-height:280px;border-radius:16px;border:1px solid ${COLOR.hairline};background:#fff;display:flex;align-items:center;justify-content:center;color:${COLOR.muted};font-size:14px">[Visual produk]</div>
    </div>
  </section>`

const marqueeItem = `<div style="flex-shrink:0;margin-right:48px;padding:16px 32px;border:1px solid ${COLOR.hairline};border-radius:12px;background:#fff;color:${COLOR.muted};font-weight:600;white-space:nowrap">[Logo]</div>`

const marqueeBlock = `
  <section style="padding:clamp(32px,5vw,56px) 24px;background:#fff">
    <div style="${CONTAINER}">
      <p style="text-align:center;font-size:14px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${COLOR.muted};margin:0 0 24px">[Judul bagian logo / integrasi]</p>
      <div class="zy-marquee">
        <div class="zy-marquee__track">
          ${marqueeItem.repeat(6)}
        </div>
      </div>
    </div>
  </section>`

const statItem = (label: string) => `
        <div style="text-align:center;${card}">
          <div class="zy-count" style="font-size:clamp(36px,5vw,48px);font-weight:700;color:${COLOR.navy};font-variant-numeric:tabular-nums">[0]</div>
          <p style="margin:8px 0 0;font-size:15px;color:${COLOR.muted}">${label}</p>
        </div>`

const statsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">[Judul statistik]</h2>
      <div class="zy-stagger zy-anim-fade-up" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:24px">
        ${statItem('[Keterangan pertama]')}
        ${statItem('[Keterangan kedua]')}
        ${statItem('[Keterangan ketiga]')}
      </div>
    </div>
  </section>`

const bentoCard = (flex: string, title: string) => `
        <div class="zy-tilt zy-hover-glow zy-anim-fade-up" style="flex:${flex};${card}">
          <span style="display:inline-flex;margin-bottom:12px;color:${COLOR.link}">${icon('widgets')}</span>
          <h3 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${COLOR.navy}">${title}</h3>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.muted}">[Deskripsi singkat fitur.]</p>
        </div>`

const bentoBlock = `
  <section style="padding:${SECTION_PAD};background:#fff">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">[Judul fitur]</h2>
      <div style="display:flex;flex-wrap:wrap;gap:24px;margin-bottom:24px">
        ${bentoCard('2 1 400px', '[Fitur utama]')}
        ${bentoCard('1 1 240px', '[Fitur kedua]')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:24px">
        ${bentoCard('1 1 240px', '[Fitur ketiga]')}
        ${bentoCard('2 1 400px', '[Fitur keempat]')}
      </div>
    </div>
  </section>`

const stepItem = (ordinal: string) => `
        <div style="${card}">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${COLOR.link}">[Langkah ${ordinal}]</p>
          <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:${COLOR.navy}">[Judul langkah]</h3>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.muted}">[Deskripsi singkat langkah.]</p>
        </div>`

const stepsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">[Judul langkah-langkah]</h2>
      <div class="zy-parallax-slow" style="height:3px;border-radius:999px;background:${GRADIENT};margin:0 0 24px"></div>
      <div class="zy-stagger zy-anim-fade-up" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:24px">
        ${stepItem('pertama')}
        ${stepItem('kedua')}
        ${stepItem('ketiga')}
        ${stepItem('keempat')}
      </div>
    </div>
  </section>`

const flowStep = (title: string, hint: string) => `
          <div class="zy-flow__step" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid ${COLOR.hairline};border-radius:12px;background:#fff">
            <span style="display:inline-flex;color:${COLOR.link}">${icon('check_circle')}</span>
            <div>
              <p style="margin:0;font-size:15px;font-weight:600;color:${COLOR.navy}">${title}</p>
              <p style="margin:2px 0 0;font-size:13px;color:${COLOR.muted}">${hint}</p>
            </div>
          </div>`

const productFlowBlock = `
  <section style="padding:${SECTION_PAD};background:#fff">
    <div style="${CONTAINER};max-width:640px">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 32px">[Judul alur produk]</h2>
      <div style="border:1px solid ${COLOR.hairline};border-radius:16px;background:${COLOR.surface};overflow:hidden">
        <div style="display:flex;gap:6px;padding:12px 16px;border-bottom:1px solid ${COLOR.hairline};background:#fff">
          <span style="width:10px;height:10px;border-radius:999px;background:${COLOR.hairline}"></span>
          <span style="width:10px;height:10px;border-radius:999px;background:${COLOR.hairline}"></span>
          <span style="width:10px;height:10px;border-radius:999px;background:${COLOR.hairline}"></span>
        </div>
        <div class="zy-flow" style="display:flex;flex-direction:column;gap:12px;padding:20px">
          ${flowStep('Lead masuk', '[Keterangan tahap]')}
          ${flowStep('Deal dibuat', '[Keterangan tahap]')}
          ${flowStep('Penawaran disetujui', '[Keterangan tahap]')}
          ${flowStep('Invoice lunas', '[Keterangan tahap]')}
        </div>
      </div>
    </div>
  </section>`

export const ANIMATED_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'zy-anim-hero-aurora',
    label: 'Hero Aurora',
    category: 'Animasi',
    media: icon('auto_awesome'),
    content: heroAuroraBlock,
  },
  {
    id: 'zy-anim-marquee',
    label: 'Marquee Logo / Integrasi',
    category: 'Animasi',
    media: icon('swap_horiz'),
    content: marqueeBlock,
  },
  {
    id: 'zy-anim-stats',
    label: 'Statistik Counter',
    category: 'Animasi',
    media: icon('trending_up'),
    content: statsBlock,
  },
  {
    id: 'zy-anim-bento',
    label: 'Bento Fitur',
    category: 'Animasi',
    media: icon('dashboard'),
    content: bentoBlock,
  },
  {
    id: 'zy-anim-steps',
    label: 'Langkah / Timeline',
    category: 'Animasi',
    media: icon('timeline'),
    content: stepsBlock,
  },
  {
    id: 'zy-anim-product-flow',
    label: 'Mockup Alur Produk',
    category: 'Animasi',
    media: icon('account_tree'),
    content: productFlowBlock,
  },
]
