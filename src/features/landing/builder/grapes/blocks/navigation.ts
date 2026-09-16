import { btnPrimary, COLOR, icon, type GrapesBlockDef } from './tokens'

const announcementBarBlock = `
  <div style="padding:10px 24px;background:${COLOR.navy};color:#fff;text-align:center;font-size:14px">
    <span style="font-weight:600">Info:</span> Tulis pengumuman singkat di sini.
    <a href="#" style="color:${COLOR.tealLight};font-weight:600;text-decoration:underline;margin-left:6px">Selengkapnya</a>
  </div>`

const navbarBlock = `
  <nav style="padding:16px 24px;border-bottom:1px solid ${COLOR.hairline};background:#fff">
    <div style="max-width:1120px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px">
      <span style="font-weight:800;font-size:18px;color:${COLOR.navy}">Brand</span>
      <div style="display:flex;gap:24px;font-size:14px;font-weight:600;color:${COLOR.ink}">
        <a href="#" style="color:inherit;text-decoration:none">Produk</a>
        <a href="#" style="color:inherit;text-decoration:none">Harga</a>
        <a href="#" style="color:inherit;text-decoration:none">Tentang</a>
      </div>
      ${btnPrimary('Mulai sekarang')}
    </div>
  </nav>`

const breadcrumbBlock = `
  <div style="padding:16px 24px;background:${COLOR.surface}">
    <div style="max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:8px;font-size:14px;color:${COLOR.muted}">
      <a href="#" style="color:${COLOR.muted};text-decoration:none">Beranda</a>
      <span>/</span>
      <a href="#" style="color:${COLOR.muted};text-decoration:none">Kategori</a>
      <span>/</span>
      <span style="color:${COLOR.ink};font-weight:600">Halaman saat ini</span>
    </div>
  </div>`

export const NAVIGATION_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'nav-announcement-bar',
    label: 'Announcement Bar',
    category: 'Navigation',
    media: icon('campaign'),
    content: announcementBarBlock,
  },
  {
    id: 'nav-navbar',
    label: 'Navbar',
    category: 'Navigation',
    media: icon('menu'),
    content: navbarBlock,
  },
  {
    id: 'nav-breadcrumb',
    label: 'Breadcrumb',
    category: 'Navigation',
    media: icon('chevron_right'),
    content: breadcrumbBlock,
  },
]
