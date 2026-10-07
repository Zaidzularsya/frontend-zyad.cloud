import {
  DEFAULT_CATALOG_PRICING_CONFIG,
  serializeCatalogPricingConfig,
} from '@/features/landing/renderer/catalog-pricing/catalog-pricing-config'

import type { GrapesStarter } from '../starter-templates'

/**
 * Starter "Zyad Marketing" (R5-S5): halaman beranda platform. Konten final dibawa kode ini
 * supaya DEV dan produksi identik; hanya ditawarkan di editor organisasi platform.
 *
 * Design Read: B2B SaaS marketing untuk pemilik bisnis & tim sales/keuangan Indonesia, bahasa
 * visual tenang dan presisi (DESIGN.md), dial ENERGY 3 / RHYTHM 2 / MOTION 3.
 *
 * Alasan keputusan visual (R-31):
 *  - Satu aksen: gradient sky->teal hanya pada tombol CTA penutup dan garis alur; sisanya navy,
 *    biru tautan #0058BE, dan permukaan netral. Teks tidak pernah memakai gradient sky->teal.
 *  - Layout tiap section berbeda (split, dua kolom kontras, timeline, bento asimetris, strip
 *    angka, daftar split sticky, band gelap) supaya ritme tidak seragam.
 *  - Bento hanya untuk enam fitur yang memang punya bobot berbeda (CRM adalah poros, kartu
 *    gelap); kartu lain berukuran berbeda sesuai panjang isi.
 *  - Tidak ada ikon library, testimoni, logo klien, atau angka karangan (K15). Strip fakta
 *    memakai tiga fakta produk dari spec.
 *  - Font Inter sudah dimuat SPA (index.html); font-face dokumen berlaku di shadow root.
 *
 * Batasan sanitizer (DOMPurify di FE, bluemonday di BE): tanpa <style>/<script>/on*, tanpa
 * atribut data-zy-*, tanpa <svg>; CSS ada di properti `css` dengan prefix `.zm-`.
 */

const NAV_CONFIG = JSON.stringify({
  position: 'sticky',
  variant: 'glass',
  layout: 'split',
  container: true,
  showAction: true,
  actionLabel: 'Mulai gratis',
  actionUrl: '/auth/register',
  hideOnScroll: false,
})

const PRICING_CONFIG = serializeCatalogPricingConfig(DEFAULT_CATALOG_PRICING_CONFIG)

const flowStep = (title: string, hint: string) => `
          <div class="zy-flow__step zm-step">
            <span class="zm-step__dot" aria-hidden="true"></span>
            <div>
              <p class="zm-step__title">${title}</p>
              <p class="zm-step__hint">${hint}</p>
            </div>
          </div>`

const timelineItem = (no: number, title: string, body: string) => `
        <li class="zm-flow__item">
          <span class="zm-flow__no">${no}</span>
          <h3 class="zm-h3">${title}</h3>
          <p class="zm-p">${body}</p>
        </li>`

const bentoCard = (mod: string, title: string, body: string) => `
        <article class="zm-card zm-bento__${mod} zy-tilt zy-hover-glow zy-anim-fade-up">
          <h3 class="zm-h3">${title}</h3>
          <p class="zm-p">${body}</p>
        </article>`

const pillar = (title: string, body: string) => `
        <div class="zm-pillar zy-scale-in-scroll">
          <h3 class="zm-h3">${title}</h3>
          <p class="zm-p">${body}</p>
        </div>`

const faq = (q: string, a: string) => `
        <details class="zm-faq__item">
          <summary class="zm-faq__q">${q}</summary>
          <p class="zm-faq__a">${a}</p>
        </details>`

const fact = (n: string, label: string) => `
        <div class="zm-fact">
          <p class="zm-fact__n"><span class="zy-count">${n}</span></p>
          <p class="zm-fact__l">${label}</p>
        </div>`

const HTML = `
<div data-zyad-slot="tenant-nav" data-zyad-header='${NAV_CONFIG}'></div>

<section id="beranda" class="zm-sec zm-hero zy-aurora" aria-labelledby="hero-title">
  <div class="zm-wrap zm-hero__grid">
    <div class="zm-hero__copy">
      <p class="zm-eyebrow">Platform bisnis all-in-one</p>
      <h1 id="hero-title" class="zm-h1 zy-anim-hero">Dari lead pertama sampai <span class="zy-text-shimmer zm-shimmer">invoice lunas</span> — dalam satu platform.</h1>
      <p class="zm-lead">Zyad Cloud menyatukan CRM, penawaran, sales order, dan penagihan berulang untuk bisnis Indonesia. Tanpa pindah-pindah aplikasi, tanpa data tercecer.</p>
      <div class="zm-actions">
        <a class="zm-btn zm-btn--primary" href="/auth/register">Mulai gratis</a>
        <a class="zm-btn zm-btn--outline" href="#konsultasi">Jadwalkan demo</a>
      </div>
      <p class="zm-trust">Tanpa kartu kredit · Support lokal berbahasa Indonesia · Bayar per bulan atau per tahun</p>
    </div>
    <div class="zm-hero__visual">
      <div class="zm-mock zy-tilt">
        <div class="zm-mock__bar" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="zy-flow zm-mock__body">${flowStep('Lead masuk', 'Form masuk ke CRM')}${flowStep('Deal dibuat', 'Masuk pipeline penjualan')}${flowStep('Penawaran disetujui', 'Pelanggan setuju secara online')}${flowStep('Invoice lunas', 'Dibayar online via DOKU')}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="zm-sec zm-sec--tight zm-band" aria-label="Integrasi">
  <div class="zm-wrap">
    <p class="zm-caption">Terhubung dengan alat yang sudah Anda pakai</p>
    <div class="zy-marquee zm-marquee">
      <div class="zy-marquee__track">
        <div class="zm-chip">WhatsApp</div>
        <div class="zm-chip">Google</div>
        <div class="zm-chip">DOKU</div>
        <div class="zm-chip">Email</div>
        <div class="zm-chip">Domain sendiri + SSL</div>
      </div>
    </div>
  </div>
</section>

<section class="zm-sec" aria-labelledby="masalah-title">
  <div class="zm-wrap">
    <h2 id="masalah-title" class="zm-h2 zm-h2--narrow">Kenapa tim sales Anda sibuk tapi closing lambat?</h2>
    <div class="zm-ps zy-anim-clip-reveal">
      <div class="zm-ps__col zm-ps__col--before">
        <h3 class="zm-h3">Sebelum</h3>
        <ul class="zm-ps__list">
          <li>Lead tercatat di spreadsheet dan chat pribadi</li>
          <li>Penawaran dibuat manual di Word, revisinya hilang</li>
          <li>Tagihan dikirim satu-satu, pembayaran dicek manual</li>
          <li>Tidak ada yang tahu deal mana yang macet</li>
        </ul>
      </div>
      <div class="zm-ps__col zm-ps__col--after">
        <h3 class="zm-h3">Dengan Zyad Cloud</h3>
        <ul class="zm-ps__list">
          <li>Setiap lead masuk CRM dengan SOP follow-up otomatis</li>
          <li>Penawaran dari katalog, dikirim via WhatsApp/email, disetujui online</li>
          <li>Invoice dan tagihan berulang terbit otomatis, bayar online via DOKU</li>
          <li>Pipeline menunjukkan posisi setiap deal secara real-time</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section id="alur" class="zm-sec zm-sec--surface" aria-labelledby="alur-title">
  <div class="zm-wrap">
    <h2 id="alur-title" class="zm-h2">Satu alur, satu sumber data</h2>
    <p class="zm-lead zm-lead--narrow">Setiap tahap mengalir ke tahap berikutnya — tanpa input ulang.</p>
    <div class="zm-flow__line zy-parallax-slow" aria-hidden="true"></div>
    <ol class="zm-flow zy-stagger zy-anim-fade-up">${timelineItem(1, 'Landing page', 'Tarik calon pelanggan dengan halaman yang Anda buat sendiri.')}${timelineItem(2, 'Lead', 'Form masuk langsung ke CRM, SOP follow-up berjalan.')}${timelineItem(3, 'Deal', 'Pantau peluang di pipeline sesuai tahapan penjualan Anda.')}${timelineItem(4, 'Penawaran', 'Susun dari katalog produk, kirim, dan biarkan pelanggan menyetujui online.')}${timelineItem(5, 'Sales order', 'Penawaran disetujui menjadi pesanan dalam satu klik.')}${timelineItem(6, 'Invoice &amp; tagihan', 'Invoice pertama dan tagihan berulang terbit otomatis, dibayar online.')}
    </ol>
  </div>
</section>

<section id="fitur" class="zm-sec" aria-labelledby="fitur-title">
  <div class="zm-wrap">
    <h2 id="fitur-title" class="zm-h2 zm-h2--narrow">Semua yang dibutuhkan tim penjualan dan keuangan Anda</h2>
    <div class="zm-bento">${bentoCard('crm', 'CRM &amp; SOP follow-up', 'Lead, kontak, perusahaan, dan pipeline dengan langkah follow-up otomatis untuk setiap lead baru.')}${bentoCard('quote', 'Penawaran online', 'PDF profesional, kirim via WhatsApp atau email, pelanggan menyetujui atau meminta revisi lewat tautan.')}${bentoCard('bill', 'Tagihan berulang + DOKU', 'Kontrak, invoice periodik, dan pembayaran online yang tercatat otomatis.')}${bentoCard('page', 'Landing page builder', 'Editor visual dengan domain sendiri, form yang langsung menjadi lead.')}${bentoCard('wa', 'WhatsApp', 'Hubungkan nomor bisnis Anda untuk follow-up langsung dari detail lead.')}${bentoCard('role', 'User &amp; hak akses', 'Atur peran dan izin tim per workspace.')}
    </div>
  </div>
</section>

<section class="zm-sec zm-sec--surface" aria-label="Untuk siapa">
  <div class="zm-wrap zm-who">
    <div class="zm-who__panel zm-who__panel--light">
      <h3 class="zm-h3 zm-h3--lg">Bisnis kecil &amp; freelancer</h3>
      <p class="zm-lead">Daftar sendiri dalam hitungan menit, pilih paket, langsung pakai.</p>
      <div class="zm-actions"><a class="zm-btn zm-btn--primary" href="#harga">Lihat harga</a></div>
    </div>
    <div class="zm-who__panel zm-who__panel--dark">
      <h3 class="zm-h3 zm-h3--lg">Perusahaan menengah &amp; enterprise</h3>
      <p class="zm-lead">Workflow disesuaikan proses Anda, onboarding dan migrasi data didampingi, multi-workspace dengan hak akses lanjutan.</p>
      <div class="zm-actions"><a class="zm-btn zm-btn--light" href="#konsultasi">Bicara dengan tim kami</a></div>
    </div>
  </div>
</section>

<section class="zm-sec zm-sec--tight zm-band" aria-label="Fakta produk">
  <div class="zm-wrap zm-facts">${fact('1', 'platform')}${fact('6', 'tahap penjualan terhubung')}${fact('0', 'aplikasi tambahan')}
  </div>
</section>

<section id="harga" class="zm-sec zm-sec--surface zm-pricing" aria-label="Harga">
  <div class="zm-wrap">
    <div data-zyad-slot="catalog-pricing" data-zyad-config='${PRICING_CONFIG}'></div>
  </div>
</section>

<section class="zm-sec" aria-labelledby="kenapa-title">
  <div class="zm-wrap">
    <h2 id="kenapa-title" class="zm-h2">Kenapa Zyad</h2>
    <div class="zm-pillars">${pillar('Lebih terjangkau', 'Fitur CRM hingga penagihan dengan biaya yang lebih ringan dari CRM global.')}${pillar('Fleksibel', 'Pipeline, SOP follow-up, dan katalog mengikuti cara kerja bisnis Anda.')}${pillar('Terintegrasi', 'Penjualan, penawaran, dan penagihan berbagi data yang sama.')}${pillar('Support lokal', 'Tim kami berbahasa Indonesia dan memahami cara bisnis di sini.')}
    </div>
  </div>
</section>

<section id="faq" class="zm-sec zm-sec--surface" aria-labelledby="faq-title">
  <div class="zm-wrap zm-faq">
    <h2 id="faq-title" class="zm-h2 zm-faq__title">Pertanyaan umum</h2>
    <div class="zm-faq__list">${faq('Apakah ada paket gratis?', 'Ada. Daftar dengan akun Google dan mulai pakai fitur dasar tanpa kartu kredit.')}${faq('Bagaimana cara pembayarannya?', 'Pembayaran online melalui DOKU (transfer bank virtual account, e-wallet, kartu) per bulan atau per tahun.')}${faq('Bisakah saya pindah paket?', 'Untuk saat ini perubahan paket setelah pembayaran dibantu oleh tim kami. Hubungi kami lewat form konsultasi.')}${faq('Apa yang terjadi bila tagihan terlambat dibayar?', 'Kami mengirim pengingat lewat email. Workspace ditangguhkan bila tagihan belum dibayar 7 hari setelah jatuh tempo, dan aktif kembali otomatis setelah dibayar.')}${faq('Bisakah data dari sistem lama dipindahkan?', 'Untuk paket Enterprise / Business, tim kami mendampingi migrasi data Anda.')}${faq('Apakah tersedia support?', 'Ya, support berbahasa Indonesia melalui email dan WhatsApp.')}
    </div>
  </div>
</section>

<section id="konsultasi" class="zm-sec" aria-labelledby="konsultasi-title">
  <div class="zm-wrap zm-consult">
    <div class="zm-consult__copy">
      <h2 id="konsultasi-title" class="zm-h2">Bicara dengan tim kami</h2>
      <p class="zm-lead">Ceritakan proses bisnis Anda. Kami bantu menilai apakah Zyad Cloud cocok — tanpa komitmen.</p>
      <h3 class="zm-h3">Yang Anda dapat dari sesi demo</h3>
      <ul class="zm-points">
        <li>Demo alur lead sampai invoice dengan contoh bisnis Anda</li>
        <li>Rekomendasi paket dan konfigurasi</li>
        <li>Perkiraan waktu onboarding</li>
      </ul>
    </div>
    <div class="zm-consult__form">
      <div data-zyad-slot="lead-form" data-zyad-config='{}'></div>
    </div>
  </div>
</section>

<section class="zm-cta" aria-labelledby="cta-title">
  <div class="zm-wrap zm-cta__in">
    <span class="zm-cta__node zy-float" aria-hidden="true"></span>
    <h2 id="cta-title" class="zm-h2 zm-h2--light">Mulai rapikan penjualan Anda hari ini.</h2>
    <div class="zm-actions zm-actions--center">
      <a class="zm-btn zm-btn--grad" href="/auth/register">Mulai gratis</a>
      <a class="zm-btn zm-btn--outline-light" href="#konsultasi">Jadwalkan demo</a>
    </div>
  </div>
</section>

<div data-zyad-slot="tenant-footer"></div>`.trim()

const CSS = `
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 16px; line-height: 1.5; color: #191C1E; background: #FFFFFF; }

/* Struktur */
.zm-sec { padding: clamp(64px, 8vw, 120px) 24px; background: #FFFFFF; scroll-margin-top: 72px; }
.zm-sec--tight { padding-top: clamp(32px, 5vw, 56px); padding-bottom: clamp(32px, 5vw, 56px); }
.zm-sec--surface { background: #F7F9FB; }
.zm-band { background: #FFFFFF; border-top: 1px solid #E0E3E5; border-bottom: 1px solid #E0E3E5; }
.zm-wrap { max-width: 1200px; margin: 0 auto; }

/* Tipografi */
.zm-eyebrow { margin: 0 0 16px; font-size: 14px; line-height: 1.4; font-weight: 600; letter-spacing: .05em; color: #0B1F3A; }
.zm-h1 { margin: 0 0 20px; font-size: clamp(34px, 5.2vw, 60px); line-height: 1.1; font-weight: 700; letter-spacing: -.02em; color: #0B1F3A; }
.zm-h2 { margin: 0 0 16px; font-size: clamp(32px, 4vw, 48px); line-height: 1.2; font-weight: 700; letter-spacing: -.01em; color: #0B1F3A; }
.zm-h2--narrow { max-width: 760px; }
.zm-h2--light { color: #FFFFFF; }
.zm-h3 { margin: 0 0 8px; font-size: 20px; line-height: 1.3; font-weight: 700; color: #0B1F3A; }
.zm-h3--lg { font-size: clamp(24px, 2.6vw, 30px); }
.zm-p { margin: 0; font-size: 16px; line-height: 1.5; color: #334155; }
.zm-lead { margin: 0 0 28px; font-size: 18px; line-height: 1.6; color: #334155; max-width: 62ch; }
.zm-lead--narrow { margin-bottom: 48px; }
.zm-caption { margin: 0 0 20px; text-align: center; font-size: 14px; line-height: 1.4; font-weight: 600; letter-spacing: .05em; color: #334155; }
.zm-shimmer { color: #0058BE; }

/* Tombol */
.zm-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.zm-actions--center { justify-content: center; }
.zm-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 28px; border-radius: 12px; border: 1.5px solid transparent; font-size: 16px; font-weight: 600; line-height: 1.2; text-decoration: none; text-align: center; transition: background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out; }
.zm-btn--primary { background: #0058BE; color: #FFFFFF; }
.zm-btn--primary:hover { background: #0B1F3A; }
.zm-btn--outline { border-color: #0B1F3A; color: #0B1F3A; background: transparent; }
.zm-btn--outline:hover { background: #0B1F3A; color: #FFFFFF; }
.zm-btn--light { background: #FFFFFF; color: #0B1F3A; }
.zm-btn--light:hover { background: #E2E8F0; }
.zm-btn--grad { background: linear-gradient(100deg, #0EA5E9 0%, #2DD4BF 100%); color: #0B1F3A; }
.zm-btn--grad:hover { filter: brightness(1.06); }
.zm-btn--outline-light { border-color: #FFFFFF; color: #FFFFFF; background: transparent; }
.zm-btn--outline-light:hover { background: #FFFFFF; color: #0B1F3A; }
.zm-btn:focus-visible, .zm-faq__q:focus-visible { outline: 3px solid #0058BE; outline-offset: 3px; }
.zm-who__panel--dark .zm-btn:focus-visible, .zm-cta .zm-btn:focus-visible { outline-color: #7DD3FC; }

/* Hero */
.zm-hero { background: #F7F9FB; padding-top: clamp(48px, 7vw, 96px); }
.zm-hero__grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; align-items: center; }
.zm-hero__copy { min-width: 0; }
.zm-trust { margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #334155; }
.zm-hero__visual { min-width: 0; }
.zm-mock { border: 1px solid #E0E3E5; border-radius: 16px; background: #FFFFFF; overflow: hidden; box-shadow: 0 24px 48px -24px rgba(11, 31, 58, .28); }
.zm-mock__bar { display: flex; gap: 6px; padding: 12px 16px; border-bottom: 1px solid #E0E3E5; background: #F7F9FB; }
.zm-mock__bar span { width: 10px; height: 10px; border-radius: 999px; background: #E0E3E5; }
.zm-mock__body { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
.zm-step { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #E0E3E5; border-radius: 12px; background: #FFFFFF; }
.zm-step__dot { flex: none; width: 12px; height: 12px; border-radius: 999px; background: #0058BE; }
.zm-step__title { margin: 0; font-size: 16px; line-height: 1.3; font-weight: 600; color: #0B1F3A; }
.zm-step__hint { margin: 2px 0 0; font-size: 14px; line-height: 1.4; color: #334155; }

/* Marquee */
.zm-marquee { padding: 4px 0; }
.zm-chip { flex: none; box-sizing: border-box; min-width: 260px; text-align: center; margin-right: 16px; padding: 14px 28px; border: 1px solid #E0E3E5; border-radius: 12px; background: #F7F9FB; font-size: 16px; font-weight: 600; color: #0B1F3A; white-space: nowrap; }
.zy-page:not(.zy-js) .zm-marquee .zy-marquee__track { width: auto; flex-wrap: wrap; justify-content: center; gap: 12px; }
.zy-page:not(.zy-js) .zm-marquee .zm-chip { margin-right: 0; }

/* Masalah -> solusi */
.zm-ps { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
.zm-ps__col { padding: 32px; border-radius: 16px; }
.zm-ps__col--before { background: #F7F9FB; border: 1px solid #E0E3E5; }
.zm-ps__col--after { background: #FFFFFF; border: 2px solid #0B1F3A; }
.zm-ps__list { margin: 16px 0 0; padding: 0; list-style: none; display: grid; gap: 14px; }
.zm-ps__list li { position: relative; padding-left: 28px; font-size: 16px; line-height: 1.5; }
.zm-ps__list li::before { content: ''; position: absolute; left: 0; top: 7px; width: 12px; height: 12px; border-radius: 999px; }
.zm-ps__col--before li { color: #334155; }
.zm-ps__col--before li::before { border: 2px solid #334155; }
.zm-ps__col--after li { color: #191C1E; }
.zm-ps__col--after li::before { background: #0F766E; }

/* Alur */
.zm-flow__line { height: 3px; margin: 0 0 32px; border-radius: 999px; background: linear-gradient(100deg, #0EA5E9 0%, #2DD4BF 100%); }
.zm-flow { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(6, 1fr); gap: 24px; }
.zm-flow__item { min-width: 0; }
.zm-flow__no { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin-bottom: 16px; border-radius: 999px; background: #0B1F3A; color: #FFFFFF; font-size: 18px; font-weight: 700; }

/* Fitur: bento asimetris, CRM jadi poros */
.zm-bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; margin-top: 48px; }
.zm-card { padding: 32px; border: 1px solid #E0E3E5; border-radius: 16px; background: #FFFFFF; min-width: 0; }
.zm-bento__crm { grid-column: span 7; grid-row: span 2; background: #0B1F3A; border-color: #0B1F3A; display: flex; flex-direction: column; justify-content: flex-end; min-height: 320px; }
.zm-bento__crm .zm-h3 { font-size: clamp(26px, 3vw, 36px); line-height: 1.2; color: #FFFFFF; }
.zm-bento__crm .zm-p { font-size: 18px; line-height: 1.6; color: #E2E8F0; max-width: 46ch; }
.zm-bento__quote { grid-column: span 5; }
.zm-bento__bill { grid-column: span 5; }
.zm-bento__page { grid-column: span 4; background: #F7F9FB; }
.zm-bento__wa { grid-column: span 4; }
.zm-bento__role { grid-column: span 4; }

/* Untuk siapa */
.zm-who { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.zm-who__panel { padding: clamp(28px, 4vw, 48px); border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
.zm-who__panel--light { background: #FFFFFF; border: 1px solid #E0E3E5; }
.zm-who__panel--dark { background: #0B1F3A; }
.zm-who__panel--dark .zm-h3 { color: #FFFFFF; }
.zm-who__panel--dark .zm-lead { color: #E2E8F0; }

/* Fakta produk */
.zm-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.zm-fact { padding-left: 24px; border-left: 1px solid #E0E3E5; }
.zm-fact:first-child { padding-left: 0; border-left: 0; }
.zm-fact__n { margin: 0; font-size: clamp(48px, 6vw, 72px); line-height: 1.1; font-weight: 700; letter-spacing: -.02em; color: #0B1F3A; font-variant-numeric: tabular-nums; }
.zm-fact__l { margin: 4px 0 0; font-size: 18px; line-height: 1.4; color: #334155; }

/* Kenapa Zyad */
.zm-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; margin-top: 48px; }
.zm-pillar { padding-top: 20px; border-top: 3px solid #0B1F3A; }

/* FAQ: judul menempel di kiri */
.zm-faq { display: grid; grid-template-columns: 1fr 2fr; gap: 56px; align-items: start; }
.zm-faq__title { position: sticky; top: 96px; }
.zm-faq__item { border-bottom: 1px solid #E0E3E5; }
.zm-faq__item:first-child { border-top: 1px solid #E0E3E5; }
.zm-faq__q { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 56px; padding: 14px 0; font-size: 18px; line-height: 1.4; font-weight: 600; color: #0B1F3A; cursor: pointer; list-style: none; }
.zm-faq__q::-webkit-details-marker { display: none; }
.zm-faq__q::after { content: '+'; flex: none; width: 28px; text-align: center; font-size: 24px; font-weight: 400; color: #0058BE; }
.zm-faq__item[open] > .zm-faq__q::after { content: '\\2212'; }
.zm-faq__a { margin: 0; padding: 0 44px 20px 0; font-size: 16px; line-height: 1.6; color: #334155; }

/* Konsultasi */
.zm-consult { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
.zm-consult__copy { min-width: 0; }
.zm-consult__form { min-width: 0; padding: clamp(20px, 3vw, 32px); border: 1px solid #E0E3E5; border-radius: 16px; background: #F7F9FB; }
.zm-points { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 12px; }
.zm-points li { position: relative; padding-left: 28px; font-size: 16px; line-height: 1.5; color: #191C1E; }
.zm-points li::before { content: ''; position: absolute; left: 0; top: 7px; width: 12px; height: 12px; border-radius: 999px; background: #0F766E; }

/* CTA penutup */
.zm-cta { padding: clamp(64px, 8vw, 120px) 24px; background: #0B1F3A; }
.zm-cta__in { text-align: center; }
.zm-cta__node { display: block; width: 16px; height: 16px; margin: 0 auto 24px; border-radius: 999px; background: #22D3EE; }
.zm-cta .zm-h2 { max-width: 20ch; margin: 0 auto 32px; }

/* Responsif */
@media (max-width: 1200px) {
  .zm-flow { grid-template-columns: repeat(3, 1fr); row-gap: 40px; }
  .zm-flow__line { display: none; }
  .zm-pillars { grid-template-columns: repeat(2, 1fr); }
  .zm-hero__grid { gap: 40px; }
}
@media (max-width: 860px) {
  .zm-hero__grid, .zm-ps, .zm-who, .zm-consult, .zm-faq { grid-template-columns: 1fr; }
  .zm-hero__grid, .zm-consult, .zm-faq { gap: 40px; }
  .zm-faq__title { position: static; }
  .zm-flow { grid-template-columns: 1fr; gap: 0; padding-left: 22px; border-left: 2px solid #0B1F3A; margin-left: 22px; }
  .zm-flow__item { position: relative; padding: 0 0 32px 36px; }
  .zm-flow__item:last-child { padding-bottom: 0; }
  .zm-flow__no { position: absolute; left: -45px; top: 0; margin: 0; }
  .zm-bento { grid-template-columns: 1fr; gap: 16px; }
  .zm-bento__crm, .zm-bento__quote, .zm-bento__bill, .zm-bento__page, .zm-bento__wa, .zm-bento__role { grid-column: auto; grid-row: auto; }
  .zm-bento__crm { min-height: 0; }
  .zm-facts { grid-template-columns: 1fr; gap: 20px; }
  .zm-fact, .zm-fact:first-child { padding: 0 0 20px; border-left: 0; border-bottom: 1px solid #E0E3E5; }
  .zm-fact:last-child { padding-bottom: 0; border-bottom: 0; }
  .zm-actions .zm-btn { flex: 1 1 auto; }
}
@media (max-width: 480px) {
  .zm-sec, .zm-cta { padding-left: 20px; padding-right: 20px; }
  .zm-pillars { grid-template-columns: 1fr; gap: 24px; margin-top: 32px; }
  .zm-card, .zm-ps__col { padding: 24px; }
  .zm-faq__q { font-size: 16px; }
  .zm-faq__a { padding-right: 0; }
  .zm-actions { flex-direction: column; }
  .zm-actions .zm-btn { width: 100%; }
}
`.trim()

export const ZYAD_MARKETING_STARTER: GrapesStarter = {
  id: 'zyad-marketing',
  label: 'Zyad Marketing',
  description:
    'Halaman marketing Zyad Cloud: alur produk, harga dari katalog, dan form konsultasi.',
  platformOnly: true,
  html: HTML,
  css: CSS,
}
