/**
 * Starter layouts offered when a GrapesJS page has no content yet. Each one is
 * plain HTML + CSS applied via `editor.setComponents(html)` + `editor.setStyle(css)`
 * — deliberately not GrapesJS ProjectData so it stays readable and survives
 * GrapesJS schema changes. Everything is fully editable once loaded.
 *
 * Design Read: business/marketing landing pages for Indonesian SMB tenants,
 * in a calm/precise style, dial ENERGY 2 / RHYTHM 2 / MOTION 1 (matches
 * frontend/DESIGN.md's own dial). The accent color is a neutral blue rather
 * than `#465fff` — that token is the legacy TailAdmin *admin dashboard*
 * indigo, which DESIGN.md explicitly scopes out of landing/marketing
 * surfaces; a tenant's own business page shouldn't inherit it either. All
 * copy/imagery here is placeholder content the tenant is expected to
 * replace — bracketed where a real value (date, name, email) is needed —
 * never a real name, statistic, or testimonial standing in as if final.
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
a { color: inherit; }
.section { padding: 88px 24px; }
.section--tight { padding: 56px 24px; }
.container { max-width: 1120px; margin: 0 auto; }
.eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .05em; color: #2563eb; margin: 0 0 14px; }
h1 { font-size: 46px; line-height: 1.15; margin: 0 0 18px; letter-spacing: -.02em; font-weight: 700; }
h2 { font-size: 32px; line-height: 1.2; margin: 0 0 16px; letter-spacing: -.01em; font-weight: 700; }
h3 { font-size: 19px; line-height: 1.3; margin: 0 0 8px; font-weight: 700; }
p { margin: 0 0 16px; color: #475569; }
.lead { font-size: 18px; color: #475569; }
.btn { display: inline-block; padding: 13px 24px; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 600; text-decoration: none; }
.btn.secondary { background: transparent; color: #1d4ed8; border: 1px solid #cbd5e1; }
.card { padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
.muted { background: #f8fafc; }
.dark { background: #0f172a; color: #e2e8f0; }
.dark p { color: #94a3b8; }
.dark h1, .dark h2, .dark h3 { color: #fff; }
.placeholder-box { display: flex; align-items: center; justify-content: center; min-height: 240px; border-radius: 16px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #94a3b8; font-size: 14px; text-align: center; padding: 24px; }
.grid-2 { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-feature { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; }
.grid-feature .stack { display: flex; flex-direction: column; gap: 24px; }
@media (max-width: 860px) {
  .grid-2, .grid-3, .grid-feature { grid-template-columns: 1fr; }
  h1 { font-size: 32px; }
  h2 { font-size: 26px; }
  .section { padding: 56px 20px; }
}
`.trim()

export const GRAPES_STARTERS: GrapesStarter[] = [
  {
    id: 'blank',
    label: 'Kosong',
    description: 'Mulai dari kanvas kosong.',
    html: `<section class="section"><div class="container"><h2>Bagian pertama</h2><p>Tarik blok dari panel kiri untuk mulai menyusun halaman.</p></div></section>`,
    css: BASE_CSS,
  },
  {
    id: 'saas',
    label: 'SaaS landing',
    description: 'Hero asimetris, fitur utama + pendukung, dan ajakan bertindak.',
    html: `
<section class="section">
  <div class="container grid-2">
    <div>
      <p class="eyebrow">Untuk tim operasional</p>
      <h1>Pantau seluruh alur kerja dari satu dashboard</h1>
      <p class="lead">Ganti kalimat ini dengan masalah spesifik yang produk Anda selesaikan, dan untuk siapa.</p>
      <p><a href="#" class="btn">Mulai uji coba</a> <a href="#" class="btn secondary">Jadwalkan demo</a></p>
    </div>
    <div class="card">
      <p style="font-weight:700;color:#0f172a;margin:0 0 16px">Ringkasan minggu ini</p>
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;margin-bottom:12px">
        <div style="flex:1;background:#dbeafe;border-radius:6px 6px 0 0;height:55%"></div>
        <div style="flex:1;background:#93c5fd;border-radius:6px 6px 0 0;height:80%"></div>
        <div style="flex:1;background:#60a5fa;border-radius:6px 6px 0 0;height:65%"></div>
        <div style="flex:1;background:#2563eb;border-radius:6px 6px 0 0;height:100%"></div>
        <div style="flex:1;background:#93c5fd;border-radius:6px 6px 0 0;height:70%"></div>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8">Contoh tampilan. Ganti dengan cuplikan produk Anda sendiri.</p>
    </div>
  </div>
</section>
<section class="section muted">
  <div class="container grid-feature">
    <div class="card">
      <h2>Judul fitur utama Anda</h2>
      <p>Jelaskan nilai inti produk secara spesifik: apa yang berubah bagi pengguna setelah memakainya, bukan sekadar daftar fitur.</p>
    </div>
    <div class="stack">
      <div class="card">
        <h3>Fitur pendukung satu</h3>
        <p>Satu kalimat penjelasan yang konkret.</p>
      </div>
      <div class="card">
        <h3>Fitur pendukung dua</h3>
        <p>Satu kalimat penjelasan yang konkret.</p>
      </div>
    </div>
  </div>
</section>
<section class="section dark">
  <div class="container" style="text-align:center">
    <h2>Siap mencoba dengan tim Anda?</h2>
    <p style="max-width:520px;margin:0 auto 24px">Ganti dengan ajakan yang sesuai langkah berikutnya yang Anda mau pengunjung ambil.</p>
    <a href="#" class="btn">Mulai sekarang</a>
  </div>
</section>`,
    css: BASE_CSS,
  },
  {
    id: 'company',
    label: 'Company profile',
    description: 'Hero, tentang perusahaan, dan layanan.',
    html: `
<section class="section">
  <div class="container grid-2">
    <div>
      <h1>Nama perusahaan Anda</h1>
      <p class="lead">Satu kalimat yang menjelaskan bisnis Anda dan siapa yang Anda layani.</p>
      <p><a href="#" class="btn">Hubungi tim kami</a></p>
    </div>
    <div class="placeholder-box">Foto tim atau produk Anda</div>
  </div>
</section>
<section class="section muted">
  <div class="container grid-2">
    <div class="placeholder-box">Foto kantor atau aktivitas tim</div>
    <div>
      <p class="eyebrow">Tentang kami</p>
      <h2>Cerita singkat perusahaan Anda</h2>
      <p>Ganti dengan latar belakang, nilai, atau alasan berdirinya bisnis Anda, ditulis untuk pelanggan dan bukan investor.</p>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <p class="eyebrow">Layanan</p>
    <h2>Yang kami kerjakan</h2>
    <div class="grid-3" style="margin-top:32px">
      <div class="card">
        <h3>Layanan pertama</h3>
        <p>Jelaskan cakupan layanan ini secara spesifik.</p>
      </div>
      <div class="card">
        <h3>Layanan kedua</h3>
        <p>Jelaskan cakupan layanan ini secara spesifik.</p>
      </div>
      <div class="card">
        <h3>Layanan ketiga</h3>
        <p>Jelaskan cakupan layanan ini secara spesifik.</p>
      </div>
    </div>
  </div>
</section>
<section class="section dark">
  <div class="container" style="text-align:center">
    <h2>Mau berdiskusi tentang kebutuhan Anda?</h2>
    <p style="max-width:520px;margin:0 auto 24px">Ganti dengan ajakan sesuai proses penjualan Anda.</p>
    <a href="#" class="btn">Hubungi kami</a>
  </div>
</section>`,
    css: BASE_CSS,
  },
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Judul harga + block Pricing tenant (kelola paketnya lewat panel Konten).',
    html: `
<section class="section">
  <div class="container" style="text-align:center;max-width:640px">
    <p class="eyebrow">Harga</p>
    <h2>Pilih paket yang sesuai kebutuhan Anda</h2>
    <p class="lead">Kelola nama, harga, dan fitur tiap paket lewat panel "Konten" setelah memilih block di bawah.</p>
  </div>
</section>
<div data-zyad-slot="pricing-plans"></div>
<section class="section--tight">
  <div class="container" style="text-align:center">
    <p>Butuh paket khusus di luar daftar ini? <a href="#" style="color:#1d4ed8;font-weight:600">Hubungi kami</a>.</p>
  </div>
</section>`,
    css: BASE_CSS,
  },
  {
    id: 'portfolio',
    label: 'Portfolio / personal brand',
    description: 'Perkenalan, karya pilihan, dan kontak untuk individu atau studio kecil.',
    html: `
<section class="section">
  <div class="container" style="max-width:720px">
    <p class="eyebrow">Halo, saya</p>
    <h1>Nama Anda</h1>
    <p class="lead">Satu-dua kalimat tentang keahlian Anda dan jenis pekerjaan yang Anda ambil.</p>
    <p><a href="#karya" class="btn">Lihat karya saya</a> <a href="mailto:halo@contoh.com" class="btn secondary">Hubungi saya</a></p>
  </div>
</section>
<section id="karya" class="section muted">
  <div class="container">
    <p class="eyebrow">Karya pilihan</p>
    <h2>Beberapa proyek terbaru</h2>
    <div class="grid-feature" style="margin-top:32px">
      <div class="card">
        <div class="placeholder-box" style="min-height:180px;margin-bottom:16px">Cuplikan proyek 1</div>
        <h3>Judul proyek Anda</h3>
        <p>Satu kalimat tentang peran Anda dan hasilnya.</p>
      </div>
      <div class="stack">
        <div class="card">
          <div class="placeholder-box" style="min-height:80px;margin-bottom:12px">Cuplikan proyek 2</div>
          <h3>Judul proyek</h3>
        </div>
        <div class="card">
          <div class="placeholder-box" style="min-height:80px;margin-bottom:12px">Cuplikan proyek 3</div>
          <h3>Judul proyek</h3>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="section">
  <div class="container grid-2">
    <div class="placeholder-box">Foto Anda</div>
    <div>
      <p class="eyebrow">Tentang</p>
      <h2>Keahlian dan cara kerja Anda</h2>
      <p>Ganti dengan latar belakang, spesialisasi, dan alat yang Anda pakai.</p>
    </div>
  </div>
</section>`,
    css: BASE_CSS,
  },
  {
    id: 'event',
    label: 'Event / webinar',
    description: 'Detail acara, agenda, dan pendaftaran.',
    html: `
<section class="section dark">
  <div class="container" style="max-width:680px">
    <p class="eyebrow" style="color:#93c5fd">[Sabtu, tanggal] • [19.00 WIB]</p>
    <h1>Nama acara Anda</h1>
    <p class="lead">Satu-dua kalimat tentang apa yang akan dibahas dan untuk siapa acara ini.</p>
    <p><a href="#daftar" class="btn">Daftar sekarang</a></p>
  </div>
</section>
<section class="section">
  <div class="container" style="max-width:720px">
    <p class="eyebrow">Agenda</p>
    <h2>Susunan acara</h2>
    <div style="margin-top:24px;display:flex;flex-direction:column;gap:0">
      <div style="display:flex;gap:20px;padding:16px 0;border-bottom:1px solid #e2e8f0">
        <span style="flex-shrink:0;width:88px;color:#2563eb;font-weight:600;font-size:14px">19.00</span>
        <span>Pembukaan dan perkenalan</span>
      </div>
      <div style="display:flex;gap:20px;padding:16px 0;border-bottom:1px solid #e2e8f0">
        <span style="flex-shrink:0;width:88px;color:#2563eb;font-weight:600;font-size:14px">19.15</span>
        <span>[Judul sesi utama] oleh [Nama pembicara]</span>
      </div>
      <div style="display:flex;gap:20px;padding:16px 0">
        <span style="flex-shrink:0;width:88px;color:#2563eb;font-weight:600;font-size:14px">20.00</span>
        <span>Sesi tanya jawab</span>
      </div>
    </div>
  </div>
</section>
<section id="daftar" class="section muted">
  <div class="container" style="text-align:center;max-width:520px">
    <h2>Tempat terbatas</h2>
    <p>Ganti dengan info kuota atau syarat pendaftaran yang sebenarnya.</p>
    <a href="#" class="btn">Daftar sekarang</a>
  </div>
</section>`,
    css: BASE_CSS,
  },
]
