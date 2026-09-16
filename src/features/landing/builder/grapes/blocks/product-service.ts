import {
  btnOutline,
  CONTAINER,
  COLOR,
  eyebrow,
  icon,
  SECTION_PAD,
  type GrapesBlockDef,
} from './tokens'

function iconCard(title: string, desc: string, glyph = 'check_circle'): string {
  return `
    <div style="padding:28px;border:1px solid ${COLOR.hairline};border-radius:16px;background:#fff">
      <div style="width:40px;height:40px;border-radius:10px;background:${COLOR.surface};display:flex;align-items:center;justify-content:center;color:${COLOR.sky};margin-bottom:16px">${icon(glyph)}</div>
      <h3 style="font-size:18px;font-weight:700;color:${COLOR.navy};margin:0 0 8px">${title}</h3>
      <p style="margin:0;color:${COLOR.muted};font-size:15px;line-height:1.6">${desc}</p>
    </div>`
}

function grid3(cards: string): string {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">${cards}</div>`
}

const featuresBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Fitur unggulan</h2>
      ${grid3(
        iconCard('Judul fitur pertama', 'Deskripsi singkat fitur pertama.', 'bolt') +
          iconCard('Judul fitur kedua', 'Deskripsi singkat fitur kedua.', 'shield') +
          iconCard('Judul fitur ketiga', 'Deskripsi singkat fitur ketiga.', 'insights'),
      )}
    </div>
  </section>`

const benefitsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};max-width:900px;text-align:center">
      <h2 style="font-size:32px;font-weight:700;color:${COLOR.navy};margin:0 0 40px">Kenapa memilih kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px;text-align:left">
        <div><h3 style="font-size:17px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">Hemat waktu</h3><p style="margin:0;color:${COLOR.muted};font-size:15px">Otomasi proses yang biasanya manual.</p></div>
        <div><h3 style="font-size:17px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">Aman & andal</h3><p style="margin:0;color:${COLOR.muted};font-size:15px">Infrastruktur yang bisa dipercaya 24 jam.</p></div>
        <div><h3 style="font-size:17px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">Mudah dipakai</h3><p style="margin:0;color:${COLOR.muted};font-size:15px">Tanpa training panjang untuk tim.</p></div>
      </div>
    </div>
  </section>`

const servicesBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Layanan kami</h2>
      ${grid3(
        iconCard('Konsultasi', 'Diskusi kebutuhan bisnis Anda dengan tim kami.', 'chat') +
          iconCard('Implementasi', 'Kami bantu setup dari awal sampai jalan.', 'build') +
          iconCard('Dukungan', 'Tim support siap membantu kapan saja.', 'support_agent'),
      )}
    </div>
  </section>`

const productsBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Produk kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="border:1px solid ${COLOR.hairline};border-radius:16px;overflow:hidden;background:#fff">
            <div style="aspect-ratio:4/3;background:${COLOR.surface}"></div>
            <div style="padding:20px">
              <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">Nama produk</h3>
              <p style="margin:0;color:${COLOR.muted};font-size:14px">Deskripsi singkat produk.</p>
            </div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const solutionsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Solusi berdasarkan kebutuhan</h2>
      ${grid3(
        iconCard('Untuk startup', 'Mulai cepat tanpa biaya besar di awal.', 'rocket_launch') +
          iconCard('Untuk enterprise', 'Skalabilitas dan keamanan tingkat lanjut.', 'apartment') +
          iconCard('Untuk tim kecil', 'Setup sederhana, hasil langsung terasa.', 'groups'),
      )}
    </div>
  </section>`

const useCasesBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Contoh penggunaan</h2>
      ${grid3(
        iconCard('E-commerce', 'Kelola katalog dan pesanan dalam satu tempat.', 'storefront') +
          iconCard('Pendidikan', 'Kelola kelas dan materi belajar online.', 'school') +
          iconCard('Layanan jasa', 'Atur jadwal dan booking pelanggan.', 'event_available'),
      )}
    </div>
  </section>`

const howItWorksBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};max-width:960px">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 48px">Cara kerjanya</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px">
        ${['Daftar akun', 'Sambungkan data Anda', 'Mulai gunakan']
          .map(
            (step, i) => `
          <div style="text-align:center">
            <div style="width:36px;height:36px;border-radius:999px;background:${COLOR.navy};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 16px">${i + 1}</div>
            <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">${step}</h3>
            <p style="margin:0;color:${COLOR.muted};font-size:14px">Penjelasan singkat langkah ini.</p>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const processBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};max-width:960px">
      ${eyebrow('Proses kerja')}
      <h2 style="font-size:32px;font-weight:700;color:${COLOR.navy};margin:0 0 40px">Dari ide sampai hasil</h2>
      <div style="display:flex;flex-direction:column;gap:0">
        ${['Riset kebutuhan', 'Rancang solusi', 'Kembangkan & uji', 'Luncurkan']
          .map(
            (step, i, arr) => `
          <div style="display:flex;gap:16px">
            <div style="display:flex;flex-direction:column;align-items:center">
              <div style="width:28px;height:28px;border-radius:999px;background:#fff;border:2px solid ${COLOR.sky};color:${COLOR.sky};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${i + 1}</div>
              ${i < arr.length - 1 ? `<div style="width:2px;flex:1;background:${COLOR.hairline};min-height:32px"></div>` : ''}
            </div>
            <div style="padding-bottom:28px">
              <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0 0 4px">${step}</h3>
              <p style="margin:0;color:${COLOR.muted};font-size:14px">Penjelasan singkat tahap ini.</p>
            </div>
          </div>`,
          )
          .join('')}
      </div>
      ${btnOutline('Pelajari prosesnya')}
    </div>
  </section>`

export const PRODUCT_SERVICE_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'ps-features',
    label: 'Features',
    category: 'Product & Service',
    media: icon('grid_view'),
    content: featuresBlock,
  },
  {
    id: 'ps-benefits',
    label: 'Benefits',
    category: 'Product & Service',
    media: icon('thumb_up'),
    content: benefitsBlock,
  },
  {
    id: 'ps-services',
    label: 'Services',
    category: 'Product & Service',
    media: icon('handyman'),
    content: servicesBlock,
  },
  {
    id: 'ps-products',
    label: 'Products',
    category: 'Product & Service',
    media: icon('inventory_2'),
    content: productsBlock,
  },
  {
    id: 'ps-solutions',
    label: 'Solutions',
    category: 'Product & Service',
    media: icon('lightbulb'),
    content: solutionsBlock,
  },
  {
    id: 'ps-use-cases',
    label: 'Use Cases',
    category: 'Product & Service',
    media: icon('lan'),
    content: useCasesBlock,
  },
  {
    id: 'ps-how-it-works',
    label: 'How It Works',
    category: 'Product & Service',
    media: icon('tune'),
    content: howItWorksBlock,
  },
  {
    id: 'ps-process',
    label: 'Process',
    category: 'Product & Service',
    media: icon('timeline'),
    content: processBlock,
  },
]
