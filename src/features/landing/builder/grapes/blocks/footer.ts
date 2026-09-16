import { btnPrimary, CONTAINER, COLOR, icon, type GrapesBlockDef } from './tokens'

function footerCol(title: string): string {
  return `<div><p style="color:#fff;font-weight:600;margin:0 0 12px">${title}</p><p style="margin:4px 0;font-size:14px;color:${COLOR.mutedOnDark}">Tautan</p><p style="margin:4px 0;font-size:14px;color:${COLOR.mutedOnDark}">Tautan</p></div>`
}

const fullFooterBlock = `
  <footer style="padding:56px 24px;background:${COLOR.darkSurfaceAlt};color:${COLOR.mutedOnDark}">
    <div style="${CONTAINER};display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between">
      <div style="max-width:280px">
        <p style="font-weight:800;font-size:18px;color:#fff;margin:0 0 8px">Brand</p>
        <p style="margin:0;font-size:14px">Deskripsi singkat perusahaan.</p>
      </div>
      ${footerCol('Produk')}
      ${footerCol('Perusahaan')}
    </div>
    <p style="${CONTAINER};margin-top:32px;font-size:13px;border-top:1px solid ${COLOR.hairlineOnDark};padding-top:16px">© 2026 Brand. Semua hak dilindungi.</p>
  </footer>`

const ctaFooterBlock = `
  <footer style="padding:56px 24px;background:${COLOR.navy};color:#fff;text-align:center">
    <div style="${CONTAINER};max-width:640px">
      <h2 style="font-size:26px;font-weight:700;margin:0 0 12px">Mulai gunakan hari ini</h2>
      <p style="margin:0 0 24px;color:${COLOR.mutedOnDark}">Tidak perlu kartu kredit untuk memulai.</p>
      ${btnPrimary('Daftar gratis')}
      <p style="margin:32px 0 0;font-size:13px;color:${COLOR.mutedOnDark};border-top:1px solid ${COLOR.hairlineOnDark};padding-top:16px">© 2026 Brand. Semua hak dilindungi.</p>
    </div>
  </footer>`

const newsletterFooterBlock = `
  <footer style="padding:48px 24px;background:${COLOR.darkSurfaceAlt};color:${COLOR.mutedOnDark}">
    <div style="${CONTAINER};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:24px">
      <div>
        <p style="font-weight:800;font-size:18px;color:#fff;margin:0 0 6px">Brand</p>
        <p style="margin:0;font-size:14px">Dapatkan kabar terbaru dari kami.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="email" placeholder="Email Anda" style="padding:12px 14px;border-radius:10px;border:1px solid ${COLOR.hairlineOnDark};background:${COLOR.darkSurface};color:#fff;font-size:14px" />
        ${btnPrimary('Berlangganan')}
      </div>
    </div>
    <p style="${CONTAINER};margin-top:32px;font-size:13px;border-top:1px solid ${COLOR.hairlineOnDark};padding-top:16px">© 2026 Brand. Semua hak dilindungi.</p>
  </footer>`

const footerNavigationBlock = `
  <footer style="padding:40px 24px;background:${COLOR.darkSurfaceAlt};color:${COLOR.mutedOnDark}">
    <div style="${CONTAINER};display:flex;flex-wrap:wrap;justify-content:center;gap:24px;font-size:14px">
      ${['Beranda', 'Produk', 'Harga', 'Blog', 'Kontak']
        .map(
          (label) =>
            `<a href="#" style="color:${COLOR.mutedOnDark};text-decoration:none">${label}</a>`,
        )
        .join('')}
    </div>
  </footer>`

const socialLinksBlock = `
  <footer style="padding:32px 24px;background:${COLOR.darkSurfaceAlt};text-align:center">
    <div style="${CONTAINER};display:flex;justify-content:center;gap:16px">
      ${['facebook', 'photo_camera', 'alternate_email', 'smart_display']
        .map(
          (glyph) => `
        <a href="#" style="width:40px;height:40px;border-radius:999px;border:1px solid ${COLOR.hairlineOnDark};display:flex;align-items:center;justify-content:center;color:${COLOR.mutedOnDark};text-decoration:none">${icon(glyph)}</a>`,
        )
        .join('')}
    </div>
  </footer>`

const contactInformationFooterBlock = `
  <footer style="padding:48px 24px;background:${COLOR.darkSurfaceAlt};color:${COLOR.mutedOnDark}">
    <div style="${CONTAINER};display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between">
      <div>
        <p style="font-weight:800;font-size:18px;color:#fff;margin:0 0 8px">Brand</p>
        <p style="margin:0 0 4px;font-size:14px">${icon('location_on')} Jl. Contoh No. 1, Jakarta</p>
        <p style="margin:0 0 4px;font-size:14px">${icon('mail')} halo@perusahaan.com</p>
        <p style="margin:0;font-size:14px">${icon('call')} +62 812-0000-0000</p>
      </div>
    </div>
    <p style="${CONTAINER};margin-top:32px;font-size:13px;border-top:1px solid ${COLOR.hairlineOnDark};padding-top:16px">© 2026 Brand. Semua hak dilindungi.</p>
  </footer>`

const legalLinksBlock = `
  <footer style="padding:24px;background:${COLOR.darkSurfaceAlt};text-align:center">
    <div style="${CONTAINER};display:flex;flex-wrap:wrap;justify-content:center;gap:20px;font-size:13px;color:${COLOR.mutedOnDark}">
      <a href="#" style="color:${COLOR.mutedOnDark};text-decoration:none">Kebijakan Privasi</a>
      <a href="#" style="color:${COLOR.mutedOnDark};text-decoration:none">Syarat & Ketentuan</a>
      <a href="#" style="color:${COLOR.mutedOnDark};text-decoration:none">Kebijakan Cookie</a>
    </div>
  </footer>`

export const FOOTER_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'tenant-footer',
    label:
      'Footer tenant<br><span style="font-weight:400;font-size:10px;color:#94a3b8">Footer situs (satu per halaman)</span>',
    category: 'Footer',
    media: icon('call_to_action'),
    content: { type: 'zyad-tenant-footer' },
  },
  {
    id: 'footer-full',
    label: 'Footer statis (manual)',
    category: 'Footer',
    media: icon('call_to_action'),
    content: fullFooterBlock,
  },
  {
    id: 'footer-cta',
    label: 'CTA Footer',
    category: 'Footer',
    media: icon('campaign'),
    content: ctaFooterBlock,
  },
  {
    id: 'footer-newsletter',
    label: 'Newsletter Footer',
    category: 'Footer',
    media: icon('mail'),
    content: newsletterFooterBlock,
  },
  {
    id: 'footer-navigation',
    label: 'Footer Navigation',
    category: 'Footer',
    media: icon('menu'),
    content: footerNavigationBlock,
  },
  {
    id: 'footer-social-links',
    label: 'Social Links',
    category: 'Footer',
    media: icon('share'),
    content: socialLinksBlock,
  },
  {
    id: 'footer-contact-information',
    label: 'Contact Information',
    category: 'Footer',
    media: icon('contact_page'),
    content: contactInformationFooterBlock,
  },
  {
    id: 'footer-legal-links',
    label: 'Legal Links',
    category: 'Footer',
    media: icon('gavel'),
    content: legalLinksBlock,
  },
]
