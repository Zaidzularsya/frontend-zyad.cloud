import {
  btnOutline,
  btnPrimary,
  CONTAINER,
  CONTAINER_NARROW,
  COLOR,
  GRADIENT,
  icon,
  SECTION_PAD,
  SECTION_PAD_TIGHT,
  type GrapesBlockDef,
} from './tokens'

function inputField(label: string, placeholder: string, type = 'text'): string {
  return `
    <label style="display:block;text-align:left;margin-bottom:16px">
      <span style="display:block;font-size:13px;font-weight:600;color:${COLOR.navy};margin-bottom:6px">${label}</span>
      <input type="${type}" placeholder="${placeholder}" style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid ${COLOR.hairline};font-size:14px" />
    </label>`
}

const pricingBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Paket harga</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">
        <div style="padding:28px;border:1px solid ${COLOR.hairline};border-radius:16px;text-align:center">
          <h3 style="margin:0 0 8px;font-weight:700;color:${COLOR.navy}">Starter</h3>
          <p style="font-size:32px;font-weight:700;margin:0 0 16px;color:${COLOR.navy};font-variant-numeric:tabular-nums">Rp0</p>
          ${btnOutline('Pilih')}
        </div>
        <div style="padding:28px;border-radius:16px;text-align:center;background:${COLOR.navy};color:#fff">
          <h3 style="margin:0 0 8px;font-weight:700">Growth</h3>
          <p style="font-size:32px;font-weight:700;margin:0 0 16px;font-variant-numeric:tabular-nums">Rp499rb</p>
          ${btnPrimary('Pilih')}
        </div>
        <div style="padding:28px;border:1px solid ${COLOR.hairline};border-radius:16px;text-align:center">
          <h3 style="margin:0 0 8px;font-weight:700;color:${COLOR.navy}">Scale</h3>
          <p style="font-size:32px;font-weight:700;margin:0 0 16px;color:${COLOR.navy}">Custom</p>
          ${btnOutline('Kontak')}
        </div>
      </div>
    </div>
  </section>`

const comparisonBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};max-width:900px;overflow-x:auto">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Bandingkan paket</h2>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden">
        <thead>
          <tr style="text-align:left">
            <th style="padding:16px;border-bottom:1px solid ${COLOR.hairline};font-size:13px;color:${COLOR.muted}">Fitur</th>
            <th style="padding:16px;border-bottom:1px solid ${COLOR.hairline};font-size:14px;color:${COLOR.navy}">Starter</th>
            <th style="padding:16px;border-bottom:1px solid ${COLOR.hairline};font-size:14px;color:${COLOR.sky}">Growth</th>
            <th style="padding:16px;border-bottom:1px solid ${COLOR.hairline};font-size:14px;color:${COLOR.navy}">Scale</th>
          </tr>
        </thead>
        <tbody>
          ${['Pengguna', 'Penyimpanan', 'Dukungan prioritas']
            .map(
              (feature) => `
            <tr>
              <td style="padding:14px 16px;border-bottom:1px solid ${COLOR.hairline};font-size:14px;color:${COLOR.ink}">${feature}</td>
              <td style="padding:14px 16px;border-bottom:1px solid ${COLOR.hairline};text-align:center">${icon('check')}</td>
              <td style="padding:14px 16px;border-bottom:1px solid ${COLOR.hairline};text-align:center;color:${COLOR.sky}">${icon('check')}</td>
              <td style="padding:14px 16px;border-bottom:1px solid ${COLOR.hairline};text-align:center">${icon('check')}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>`

const ctaBlock = `
  <section style="padding:${SECTION_PAD_TIGHT};text-align:center;background:${GRADIENT};color:#fff">
    <div style="${CONTAINER_NARROW}">
      <h2 style="font-size:28px;font-weight:700;margin:0 0 12px">Siap mencoba?</h2>
      <p style="margin:0 0 24px;opacity:.92">Ajakan singkat untuk pengunjung mengambil tindakan.</p>
      <a href="#" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#fff;color:${COLOR.navy};font-weight:700;text-decoration:none">Hubungi kami</a>
    </div>
  </section>`

const leadFormBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};max-width:480px;text-align:center">
      <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 12px">Dapatkan penawaran</h2>
      <p style="margin:0 0 28px;color:${COLOR.muted}">Isi form ini dan tim kami akan segera menghubungi Anda.</p>
      <form>
        ${inputField('Nama lengkap', 'Nama Anda')}
        ${inputField('Email kerja', 'nama@perusahaan.com', 'email')}
        ${btnPrimary('Kirim')}
      </form>
    </div>
  </section>`

const newsletterBlock = `
  <section style="padding:${SECTION_PAD_TIGHT};background:${COLOR.navy};color:#fff;text-align:center">
    <div style="${CONTAINER_NARROW}">
      <h2 style="font-size:24px;font-weight:700;margin:0 0 8px">Ikuti kabar terbaru</h2>
      <p style="margin:0 0 24px;color:${COLOR.mutedOnDark}">Tips dan update produk langsung ke email Anda.</p>
      <div style="display:flex;gap:8px;max-width:420px;margin:0 auto;flex-wrap:wrap">
        <input type="email" placeholder="Email Anda" style="flex:1 1 220px;padding:12px 14px;border-radius:10px;border:1px solid ${COLOR.hairlineOnDark};background:${COLOR.darkSurface};color:#fff;font-size:14px" />
        ${btnPrimary('Berlangganan')}
      </div>
    </div>
  </section>`

const contactBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};display:flex;gap:48px;flex-wrap:wrap">
      <div style="flex:1 1 300px">
        <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 12px">Hubungi kami</h2>
        <p style="margin:0 0 24px;color:${COLOR.muted}">Tim kami siap membantu pertanyaan Anda.</p>
        <p style="margin:0 0 8px;font-size:14px;color:${COLOR.ink}">${icon('mail')} halo@perusahaan.com</p>
        <p style="margin:0;font-size:14px;color:${COLOR.ink}">${icon('call')} +62 812-0000-0000</p>
      </div>
      <div style="flex:1 1 340px">
        <form>
          ${inputField('Nama', 'Nama Anda')}
          ${inputField('Email', 'nama@email.com', 'email')}
          ${btnPrimary('Kirim pesan')}
        </form>
      </div>
    </div>
  </section>`

const demoRequestBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface};text-align:center">
    <div style="${CONTAINER_NARROW}">
      <h2 style="font-size:30px;font-weight:700;color:${COLOR.navy};margin:0 0 12px">Jadwalkan demo produk</h2>
      <p style="margin:0 0 28px;color:${COLOR.muted}">Lihat langsung bagaimana produk ini bekerja untuk bisnis Anda.</p>
      ${btnPrimary('Jadwalkan sekarang')}
    </div>
  </section>`

const downloadBlock = `
  <section style="padding:${SECTION_PAD};text-align:center">
    <div style="${CONTAINER_NARROW}">
      <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 12px">Unduh aplikasinya</h2>
      <p style="margin:0 0 28px;color:${COLOR.muted}">Tersedia untuk desktop dan mobile.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${btnOutline('App Store')}
        ${btnOutline('Google Play')}
      </div>
    </div>
  </section>`

export const CONVERSION_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'conv-pricing',
    label: 'Pricing',
    category: 'Conversion',
    media: icon('sell'),
    content: pricingBlock,
  },
  {
    id: 'tenant-pricing',
    label:
      'Pricing tenant<br><span style="font-weight:400;font-size:10px;color:#94a3b8">Paket harga live (kelola di panel Konten)</span>',
    category: 'Conversion',
    media: icon('price_change'),
    content: { type: 'zyad-pricing-plans' },
  },
  {
    id: 'conv-comparison',
    label: 'Comparison',
    category: 'Conversion',
    media: icon('rule'),
    content: comparisonBlock,
  },
  {
    id: 'conv-cta',
    label: 'Call to Action (CTA)',
    category: 'Conversion',
    media: icon('campaign'),
    content: ctaBlock,
  },
  {
    id: 'conv-lead-form',
    label: 'Lead Form',
    category: 'Conversion',
    media: icon('assignment'),
    content: leadFormBlock,
  },
  {
    id: 'conv-newsletter',
    label: 'Newsletter',
    category: 'Conversion',
    media: icon('mail'),
    content: newsletterBlock,
  },
  {
    id: 'conv-contact',
    label: 'Contact',
    category: 'Conversion',
    media: icon('contact_mail'),
    content: contactBlock,
  },
  {
    id: 'conv-demo-request',
    label: 'Demo Request',
    category: 'Conversion',
    media: icon('calendar_month'),
    content: demoRequestBlock,
  },
  {
    id: 'conv-download',
    label: 'Download',
    category: 'Conversion',
    media: icon('download'),
    content: downloadBlock,
  },
]
