import {
  avatarPlaceholder,
  CONTAINER,
  COLOR,
  eyebrow,
  icon,
  SECTION_PAD,
  SECTION_PAD_TIGHT,
  type GrapesBlockDef,
} from './tokens'

function logoRow(): string {
  return `
    <div style="display:flex;flex-wrap:wrap;gap:40px;align-items:center;justify-content:center;opacity:.6">
      ${['LOGO', 'LOGO', 'LOGO', 'LOGO', 'LOGO']
        .map((l) => `<span style="font-weight:800;font-size:20px;color:${COLOR.ink}">${l}</span>`)
        .join('')}
    </div>`
}

function testimonialCard(): string {
  return `
    <div style="padding:24px;border:1px solid ${COLOR.hairline};border-radius:16px;background:#fff">
      <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px;line-height:1.6">"Kutipan singkat pengalaman positif memakai produk."</p>
      <div style="display:flex;align-items:center;gap:12px">
        ${avatarPlaceholder(40)}
        <div><p style="margin:0;font-weight:700;font-size:14px;color:${COLOR.navy}">Nama Pelanggan</p><p style="margin:0;color:${COLOR.muted};font-size:13px">Jabatan, Perusahaan</p></div>
      </div>
    </div>`
}

const logoCloudBlock = `
  <section style="padding:${SECTION_PAD_TIGHT};border-top:1px solid ${COLOR.hairline};border-bottom:1px solid ${COLOR.hairline}">
    <div style="${CONTAINER}">
      <p style="text-align:center;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${COLOR.muted};margin:0 0 24px">Dipercaya oleh tim di seluruh Indonesia</p>
      ${logoRow()}
    </div>
  </section>`

const socialProofBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER};max-width:900px;text-align:center">
      <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 32px">Dipakai oleh ratusan bisnis</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;margin-bottom:32px">
        <div><p style="margin:0;font-size:32px;font-weight:700;color:${COLOR.sky};font-variant-numeric:tabular-nums">500+</p><p style="margin:0;color:${COLOR.muted};font-size:14px">Bisnis aktif</p></div>
        <div><p style="margin:0;font-size:32px;font-weight:700;color:${COLOR.sky};font-variant-numeric:tabular-nums">4.9/5</p><p style="margin:0;color:${COLOR.muted};font-size:14px">Rating pengguna</p></div>
        <div><p style="margin:0;font-size:32px;font-weight:700;color:${COLOR.sky};font-variant-numeric:tabular-nums">99.9%</p><p style="margin:0;color:${COLOR.muted};font-size:14px">Uptime</p></div>
      </div>
      ${logoRow()}
    </div>
  </section>`

const testimonialsBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Kata mereka tentang kami</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
        ${testimonialCard()}${testimonialCard()}${testimonialCard()}
      </div>
    </div>
  </section>`

const reviewsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};max-width:760px;text-align:center">
      <div style="color:${COLOR.sky};font-size:20px;margin-bottom:16px">★★★★★</div>
      <p style="font-size:22px;line-height:1.5;font-weight:500;color:${COLOR.navy};margin:0 0 20px">"Ulasan pelanggan yang menonjolkan hasil nyata memakai produk ini."</p>
      <p style="margin:0;font-weight:700;color:${COLOR.navy}">Nama Pelanggan</p>
      <p style="margin:0;color:${COLOR.muted};font-size:14px">Jabatan, Perusahaan</p>
    </div>
  </section>`

const caseStudiesBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 40px">Studi kasus</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="border:1px solid ${COLOR.hairline};border-radius:16px;overflow:hidden;background:#fff">
            <div style="aspect-ratio:16/9;background:${COLOR.surface}"></div>
            <div style="padding:20px">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${COLOR.sky};text-transform:uppercase;letter-spacing:.05em">Nama Perusahaan</p>
              <h3 style="font-size:16px;font-weight:700;color:${COLOR.navy};margin:0 0 6px">Hasil yang dicapai singkat</h3>
              <p style="margin:0;color:${COLOR.muted};font-size:14px">Ringkasan singkat studi kasus.</p>
            </div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const statsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.navy};color:#fff">
    <div style="${CONTAINER}">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;text-align:center">
        <div><p style="margin:0;font-size:40px;font-weight:700;font-variant-numeric:tabular-nums">10K+</p><p style="margin:0;color:${COLOR.mutedOnDark};font-size:14px">Pengguna aktif</p></div>
        <div><p style="margin:0;font-size:40px;font-weight:700;font-variant-numeric:tabular-nums">120+</p><p style="margin:0;color:${COLOR.mutedOnDark};font-size:14px">Negara</p></div>
        <div><p style="margin:0;font-size:40px;font-weight:700;font-variant-numeric:tabular-nums">99.9%</p><p style="margin:0;color:${COLOR.mutedOnDark};font-size:14px">Uptime</p></div>
        <div><p style="margin:0;font-size:40px;font-weight:700;font-variant-numeric:tabular-nums">24/7</p><p style="margin:0;color:${COLOR.mutedOnDark};font-size:14px">Dukungan</p></div>
      </div>
    </div>
  </section>`

const awardsBlock = `
  <section style="padding:${SECTION_PAD_TIGHT}">
    <div style="${CONTAINER};text-align:center">
      ${eyebrow('Penghargaan')}
      <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:center;margin-top:16px">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:120px">
            <div style="width:56px;height:56px;border-radius:999px;background:${COLOR.surface};border:1px solid ${COLOR.hairline};display:flex;align-items:center;justify-content:center;color:${COLOR.sky}">${icon('emoji_events')}</div>
            <p style="margin:0;font-size:13px;color:${COLOR.muted};text-align:center">Nama penghargaan</p>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const certificationsBlock = `
  <section style="padding:${SECTION_PAD_TIGHT};background:${COLOR.surface}">
    <div style="${CONTAINER};text-align:center">
      ${eyebrow('Sertifikasi & kepatuhan')}
      <div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center;margin-top:16px">
        ${['ISO 27001', 'SOC 2', 'GDPR Ready', 'PCI DSS']
          .map(
            (label) => `
          <div style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:#fff;border:1px solid ${COLOR.hairline};font-size:14px;font-weight:600;color:${COLOR.navy}">
            <span style="color:${COLOR.teal}">${icon('verified')}</span>${label}
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

export const TRUST_SOCIAL_PROOF_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'tsp-logo-cloud',
    label: 'Logo Cloud',
    category: 'Trust & Social Proof',
    media: icon('apps'),
    content: logoCloudBlock,
  },
  {
    id: 'tsp-social-proof',
    label: 'Social Proof',
    category: 'Trust & Social Proof',
    media: icon('groups'),
    content: socialProofBlock,
  },
  {
    id: 'tsp-testimonials',
    label: 'Testimonials',
    category: 'Trust & Social Proof',
    media: icon('format_quote'),
    content: testimonialsBlock,
  },
  {
    id: 'tsp-reviews',
    label: 'Reviews',
    category: 'Trust & Social Proof',
    media: icon('star'),
    content: reviewsBlock,
  },
  {
    id: 'tsp-case-studies',
    label: 'Case Studies',
    category: 'Trust & Social Proof',
    media: icon('description'),
    content: caseStudiesBlock,
  },
  {
    id: 'tsp-stats',
    label: 'Stats / Metrics',
    category: 'Trust & Social Proof',
    media: icon('bar_chart'),
    content: statsBlock,
  },
  {
    id: 'tsp-awards',
    label: 'Awards',
    category: 'Trust & Social Proof',
    media: icon('emoji_events'),
    content: awardsBlock,
  },
  {
    id: 'tsp-certifications',
    label: 'Certifications',
    category: 'Trust & Social Proof',
    media: icon('verified'),
    content: certificationsBlock,
  },
]
