/**
 * Starter layouts offered when a GrapesJS page has no content yet. Each one is
 * plain HTML + CSS applied via `editor.setComponents(html)` + `editor.setStyle(css)`
 * — deliberately not GrapesJS ProjectData so it stays readable and survives
 * GrapesJS schema changes. Everything is fully editable once loaded.
 */

export interface GrapesStarter {
  id: string
  label: string
  description: string
  html: string
  css: string
}

const BASE_CSS = `
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; color: #0f172a; line-height: 1.6; }
img { max-width: 100%; display: block; }
.section { padding: 72px 24px; }
.container { max-width: 1080px; margin: 0 auto; }
.eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #465fff; margin: 0 0 12px; }
h1 { font-size: 44px; line-height: 1.15; margin: 0 0 16px; letter-spacing: -.02em; }
h2 { font-size: 30px; line-height: 1.2; margin: 0 0 12px; letter-spacing: -.01em; }
p { margin: 0 0 16px; color: #475569; }
.btn { display: inline-block; padding: 12px 22px; border-radius: 10px; background: #465fff; color: #fff; font-weight: 600; text-decoration: none; }
.btn.secondary { background: transparent; color: #465fff; border: 1px solid #c7d2fe; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
.muted { background: #f8fafc; }
@media (max-width: 820px) { .grid-3 { grid-template-columns: 1fr; } h1 { font-size: 34px; } }
`.trim()

export const GRAPES_STARTERS: GrapesStarter[] = [
  {
    id: 'blank',
    label: 'Kosong',
    description: 'Mulai dari kanvas kosong.',
    html: '<section class="section"><div class="container"><h2>Bagian pertama</h2><p>Tarik blok dari panel kiri untuk mulai menyusun halaman.</p></div></section>',
    css: BASE_CSS,
  },
  {
    id: 'saas',
    label: 'SaaS landing',
    description: 'Hero, fitur 3 kolom, dan ajakan bertindak.',
    html: `
<section class="section">
  <div class="container">
    <p class="eyebrow">Platform</p>
    <h1>Kelola bisnis Anda dalam satu tempat</h1>
    <p>Otomatiskan pekerjaan berulang, pantau metrik penting, dan berkolaborasi dengan tim tanpa berpindah aplikasi.</p>
    <p><a href="#daftar" class="btn">Coba gratis</a> <a href="#demo" class="btn secondary">Lihat demo</a></p>
  </div>
</section>
<section class="section muted">
  <div class="container">
    <h2>Semua yang Anda butuhkan</h2>
    <div class="grid-3">
      <div class="card"><h3>Otomatisasi</h3><p>Alur kerja yang berjalan sendiri sesuai aturan Anda.</p></div>
      <div class="card"><h3>Analitik</h3><p>Laporan real-time yang mudah dibaca seluruh tim.</p></div>
      <div class="card"><h3>Integrasi</h3><p>Terhubung dengan alat yang sudah Anda pakai.</p></div>
    </div>
  </div>
</section>
<section class="section" id="daftar">
  <div class="container">
    <h2>Siap mencoba?</h2>
    <p>Buat akun dalam hitungan menit. Tidak perlu kartu kredit.</p>
    <p><a href="#" class="btn">Mulai sekarang</a></p>
  </div>
</section>`.trim(),
    css: BASE_CSS,
  },
  {
    id: 'company',
    label: 'Company profile',
    description: 'Perkenalan perusahaan, layanan, dan kontak.',
    html: `
<section class="section">
  <div class="container">
    <p class="eyebrow">Tentang kami</p>
    <h1>Mitra tepercaya untuk pertumbuhan bisnis Anda</h1>
    <p>Kami membantu perusahaan dari berbagai skala merancang, membangun, dan menjalankan solusi digital yang berdampak.</p>
  </div>
</section>
<section class="section muted">
  <div class="container">
    <h2>Layanan kami</h2>
    <div class="grid-3">
      <div class="card"><h3>Konsultasi</h3><p>Pemetaan kebutuhan dan penyusunan roadmap.</p></div>
      <div class="card"><h3>Implementasi</h3><p>Pengembangan dan integrasi sistem end-to-end.</p></div>
      <div class="card"><h3>Dukungan</h3><p>Pemeliharaan dan peningkatan berkelanjutan.</p></div>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <h2>Hubungi kami</h2>
    <p>Email: halo@perusahaan.co.id &nbsp;·&nbsp; Telepon: (021) 000-0000</p>
    <p><a href="mailto:halo@perusahaan.co.id" class="btn">Kirim pesan</a></p>
  </div>
</section>`.trim(),
    css: BASE_CSS,
  },
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Tiga paket harga dengan tombol ajakan.',
    html: `
<section class="section">
  <div class="container">
    <p class="eyebrow">Harga</p>
    <h1>Paket untuk setiap tahap</h1>
    <p>Pilih paket yang sesuai. Ubah atau batalkan kapan saja.</p>
  </div>
</section>
<section class="section muted">
  <div class="container">
    <div class="grid-3">
      <div class="card"><h3>Starter</h3><p><strong style="font-size:28px;color:#0f172a">Rp0</strong>/bulan</p><p>Untuk mencoba fitur inti.</p><a href="#" class="btn secondary">Pilih Starter</a></div>
      <div class="card"><h3>Growth</h3><p><strong style="font-size:28px;color:#0f172a">Rp299rb</strong>/bulan</p><p>Untuk tim yang sedang berkembang.</p><a href="#" class="btn">Pilih Growth</a></div>
      <div class="card"><h3>Scale</h3><p><strong style="font-size:28px;color:#0f172a">Hubungi</strong></p><p>Untuk kebutuhan enterprise.</p><a href="#" class="btn secondary">Hubungi sales</a></div>
    </div>
  </div>
</section>`.trim(),
    css: BASE_CSS,
  },
]
