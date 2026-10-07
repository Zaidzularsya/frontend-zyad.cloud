import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CATALOG_PRICING_CONFIG,
  parseCatalogPricingConfig,
} from '@/features/landing/renderer/catalog-pricing/catalog-pricing-config'
import { rewritePageCss } from '@/features/landing/renderer/grapes/page-css'

import { ZYAD_MARKETING_STARTER } from './zyad-marketing'

const html = ZYAD_MARKETING_STARTER.html
const css = ZYAD_MARKETING_STARTER.css

// Konfigurasi sama persis dengan ShadowPageRenderer.sanitize().
function sanitize(input: string): string {
  return DOMPurify.sanitize(input, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: true,
  })
}

function parse(input: string): Document {
  return new DOMParser().parseFromString(`<body>${input}</body>`, 'text/html')
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
// Campuran alpha `fg` di atas `bg` (hex), untuk blob aurora.
function mix(fg: string, alpha: number, bg: string): string {
  const f = parseInt(fg.slice(1), 16)
  const b = parseInt(bg.slice(1), 16)
  const ch = (s: number) =>
    Math.round(((f >> s) & 255) * alpha + ((b >> s) & 255) * (1 - alpha))
      .toString(16)
      .padStart(2, '0')
  return `#${ch(16)}${ch(8)}${ch(0)}`
}

describe('ZYAD_MARKETING_STARTER', () => {
  it('is platform-only with the planned identity', () => {
    expect(ZYAD_MARKETING_STARTER.platformOnly).toBe(true)
    expect(ZYAD_MARKETING_STARTER.id).toBe('zyad-marketing')
    expect(ZYAD_MARKETING_STARTER.label).toBe('Zyad Marketing')
    expect(ZYAD_MARKETING_STARTER.description).toBe(
      'Halaman marketing Zyad Cloud: alur produk, harga dari katalog, dan form konsultasi.',
    )
  })

  it('contains each slot exactly once', () => {
    for (const s of ['tenant-nav', 'catalog-pricing', 'lead-form', 'tenant-footer'])
      expect(html.match(new RegExp(`data-zyad-slot="${s}"`, 'g'))?.length).toBe(1)
  })

  it('has the anchor targets used by CTAs and menu', () => {
    for (const id of ['alur', 'fitur', 'harga', 'faq', 'konsultasi'])
      expect(html).toContain(`id="${id}"`)
  })

  it('uses the approved copy', () => {
    for (const t of [
      'Platform bisnis all-in-one',
      'Zyad Cloud menyatukan CRM, penawaran, sales order, dan penagihan berulang untuk bisnis Indonesia. Tanpa pindah-pindah aplikasi, tanpa data tercecer.',
      'Tanpa kartu kredit · Support lokal berbahasa Indonesia · Bayar per bulan atau per tahun',
      'Terhubung dengan alat yang sudah Anda pakai',
      'Kenapa tim sales Anda sibuk tapi closing lambat?',
      'Satu alur, satu sumber data',
      'Setiap tahap mengalir ke tahap berikutnya',
      'Semua yang dibutuhkan tim penjualan dan keuangan Anda',
      'Bisnis kecil &amp; freelancer',
      'Perusahaan menengah &amp; enterprise',
      'Lebih terjangkau',
      'Support lokal',
      'Apa yang terjadi bila tagihan terlambat dibayar?',
      'Workspace ditangguhkan bila tagihan belum dibayar 7 hari setelah jatuh tempo',
      'Bicara dengan tim kami',
      'Ceritakan proses bisnis Anda. Kami bantu menilai apakah Zyad Cloud cocok',
      'Yang Anda dapat dari sesi demo',
      'Perkiraan waktu onboarding',
      'Mulai rapikan penjualan Anda hari ini.',
    ])
      expect(html).toContain(t)
  })

  it('hero headline text is exactly the approved copy', () => {
    expect(parse(html).querySelector('h1')!.textContent).toBe(
      'Dari lead pertama sampai invoice lunas — dalam satu platform.',
    )
  })

  it('has exactly one aurora and a hero LCP animation without a delay class', () => {
    expect(html.match(/zy-aurora/g)?.length).toBe(1)
    expect(css).not.toContain('zy-aurora')
    expect(html).toContain('zy-anim-hero')
    expect(html).not.toMatch(/zy-delay-/)
    expect(html.match(/zy-float/g)?.length).toBe(1)
  })

  it('has exactly one h1 inside the hero, with the shimmer phrase and no inline background', () => {
    const doc = parse(html)
    const h1s = doc.querySelectorAll('h1')
    expect(h1s.length).toBe(1)
    expect(h1s[0]!.className).toContain('zy-anim-hero')
    expect(h1s[0]!.closest('#beranda')).not.toBeNull()
    const shimmer = h1s[0]!.querySelector('.zy-text-shimmer')!
    expect(shimmer.textContent).toBe('invoice lunas')
    expect(shimmer.getAttribute('style') ?? '').not.toMatch(/background/)
  })

  it('has the 14 sections in the planned order', () => {
    const doc = parse(html)
    const top = Array.from(doc.body.children)
    expect(top.length).toBe(14)
    const slotOf = (el: Element) =>
      el.getAttribute('data-zyad-slot') ??
      el.querySelector('[data-zyad-slot]')?.getAttribute('data-zyad-slot')
    expect(slotOf(top[0]!)).toBe('tenant-nav')
    expect(top[1]!.id).toBe('beranda')
    expect(top[2]!.querySelector('.zy-marquee')).not.toBeNull()
    expect(top[3]!.querySelector('.zy-anim-clip-reveal')).not.toBeNull()
    expect(top[4]!.id).toBe('alur')
    expect(top[5]!.id).toBe('fitur')
    expect(top[6]!.querySelector('a[href="#harga"]')).not.toBeNull()
    expect(top[7]!.querySelectorAll('.zy-count').length).toBe(3)
    expect(top[8]!.id).toBe('harga')
    expect(slotOf(top[8]!)).toBe('catalog-pricing')
    expect(top[9]!.querySelectorAll('.zy-scale-in-scroll').length).toBe(4)
    expect(top[10]!.id).toBe('faq')
    expect(top[11]!.id).toBe('konsultasi')
    expect(slotOf(top[11]!)).toBe('lead-form')
    expect(top[12]!.textContent).toContain('Mulai rapikan penjualan Anda hari ini.')
    expect(top[12]!.querySelector('.zy-float')).not.toBeNull()
    expect(slotOf(top[13]!)).toBe('tenant-footer')
  })

  it('renders 6 flow steps, 6 bento cards, 4 pillars and 6 FAQ items', () => {
    const doc = parse(html)
    expect(doc.querySelectorAll('#alur ol > li').length).toBe(6)
    expect(doc.querySelectorAll('#fitur .zy-tilt.zy-hover-glow.zy-anim-fade-up').length).toBe(6)
    expect(doc.querySelectorAll('#faq details').length).toBe(6)
    expect(doc.querySelectorAll('#faq details > summary').length).toBe(6)
    expect(doc.querySelectorAll('.zy-marquee__track > *').length).toBe(5)
  })

  it('has internal links with targets and no empty or javascript hrefs', () => {
    const doc = parse(html)
    const hrefs = Array.from(doc.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs.length).toBeGreaterThan(5)
    for (const h of hrefs) {
      expect(h).toBeTruthy()
      expect(h).not.toMatch(/^\s*(#|javascript:)\s*$/i)
      expect(h).not.toMatch(/javascript:/i)
      if (h!.startsWith('#')) expect(doc.getElementById(h!.slice(1))).not.toBeNull()
    }
    const ids = Array.from(doc.querySelectorAll('[id]')).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the exact CTA labels and destinations', () => {
    const doc = parse(html)
    const link = (text: string) =>
      Array.from(doc.querySelectorAll('a')).filter((a) => a.textContent?.trim() === text)
    expect(link('Mulai gratis').every((a) => a.getAttribute('href') === '/auth/register')).toBe(
      true,
    )
    expect(link('Mulai gratis').length).toBe(2) // hero + penutup
    expect(link('Jadwalkan demo').every((a) => a.getAttribute('href') === '#konsultasi')).toBe(true)
    expect(link('Jadwalkan demo').length).toBe(2)
    expect(link('Lihat harga')[0]!.getAttribute('href')).toBe('#harga')
    expect(link('Bicara dengan tim kami')[0]!.getAttribute('href')).toBe('#konsultasi')
    const nav = doc.querySelector('[data-zyad-slot="tenant-nav"]')!
    const cfg = JSON.parse(nav.getAttribute('data-zyad-header')!)
    expect(cfg).toMatchObject({
      position: 'sticky',
      variant: 'glass',
      showAction: true,
      actionLabel: 'Mulai gratis',
      actionUrl: '/auth/register',
    })
  })

  it('product facts strip uses only the three spec facts', () => {
    const doc = parse(html)
    const strip = doc.querySelectorAll('.zy-count')
    expect(Array.from(strip).map((e) => e.textContent)).toEqual(['1', '6', '0'])
    const text = doc
      .querySelector('.zy-count')!
      .closest('section')!
      .textContent!.replace(/\s+/g, ' ')
    expect(text).toContain('platform')
    expect(text).toContain('tahap penjualan terhubung')
    expect(text).toContain('aplikasi tambahan')
  })

  it('contains no forbidden content (K15, scripts, legacy indigo)', () => {
    const all = html + css
    expect(all).not.toMatch(/<script|<style|\son\w+\s*=|javascript:|@import/i)
    expect(all).not.toMatch(/#465fff|99 102 241|indigo|purple|#6366f1|#8b5cf6/i)
    expect(all).not.toMatch(
      /salesforce|hubspot|testimoni|zoho|pipedrive|odoo|mekari|jurnal|\bsap\b/i,
    )
    expect(html).not.toMatch(/data-zy-/)
    expect(css).not.toMatch(/url\(\s*['"]?https?:/i)
  })

  it('catalog pricing config parses to defaults', () => {
    const el = parse(html).querySelector('[data-zyad-slot="catalog-pricing"]')!
    const raw = el.getAttribute('data-zyad-config')
    expect(parseCatalogPricingConfig(raw)).toEqual(DEFAULT_CATALOG_PRICING_CONFIG)
    expect(JSON.parse(raw!).defaultFrequency).toBe('monthly')
    const lead = parse(html).querySelector('[data-zyad-slot="lead-form"]')!
    expect(lead.getAttribute('data-zyad-config')).toBe('{}')
  })

  it('survives DOMPurify (ShadowPageRenderer config) with slots, ids, classes, styles and details intact', () => {
    const clean = parse(sanitize(html))
    const orig = parse(html)
    for (const s of ['tenant-nav', 'catalog-pricing', 'lead-form', 'tenant-footer'])
      expect(clean.querySelectorAll(`[data-zyad-slot="${s}"]`).length).toBe(1)
    expect(
      clean.querySelector('[data-zyad-slot="tenant-nav"]')!.getAttribute('data-zyad-header'),
    ).toBe(orig.querySelector('[data-zyad-slot="tenant-nav"]')!.getAttribute('data-zyad-header'))
    expect(
      clean.querySelector('[data-zyad-slot="catalog-pricing"]')!.getAttribute('data-zyad-config'),
    ).toBe(
      orig.querySelector('[data-zyad-slot="catalog-pricing"]')!.getAttribute('data-zyad-config'),
    )
    for (const id of ['beranda', 'alur', 'fitur', 'harga', 'faq', 'konsultasi'])
      expect(clean.getElementById(id)).not.toBeNull()
    expect(clean.querySelectorAll('details > summary').length).toBe(6)
    expect(clean.querySelectorAll('[class]').length).toBe(orig.querySelectorAll('[class]').length)
    expect(clean.querySelectorAll('[style]').length).toBe(orig.querySelectorAll('[style]').length)
    expect(clean.body.querySelectorAll('*').length).toBe(orig.body.querySelectorAll('*').length)
  })

  it('css passes rewritePageCss, maps body to .zy-page and prefixes classes with zm-', () => {
    const out = rewritePageCss(css)
    expect(out.css.trim()).not.toBe('')
    expect(out.fontFaces).toBe('')
    expect(out.css).toContain('.zy-page')
    expect(out.css).not.toMatch(/(^|[}\s,])(body|html|:root)\b/)
    const classes = new Set(Array.from(css.matchAll(/\.([a-z][\w-]*)/gi)).map((m) => m[1]!))
    for (const c of classes) expect(c.startsWith('zm-') || c.startsWith('zy-')).toBe(true)
    for (const bp of ['1200px', '860px', '480px']) expect(css).toContain(`max-width: ${bp}`)
  })

  it('uses only classes that exist in the markup or are zy-* vocabulary', () => {
    const used = new Set(
      Array.from(html.matchAll(/class="([^"]+)"/g)).flatMap((m) => m[1]!.split(/\s+/)),
    )
    const declared = Array.from(css.matchAll(/\.(zm-[\w-]+)/g)).map((m) => m[1]!)
    for (const c of declared) expect(used.has(c), `${c} unused in markup`).toBe(true)
  })

  it('main text pairs meet WCAG AA (4.5:1)', () => {
    const ink = '#191C1E'
    const navy = '#0B1F3A'
    const muted = '#334155'
    const link = '#0058BE'
    const surface = '#F7F9FB'
    const aurora = mix('#0EA5E9', 0.45, surface) // blob aurora terpekat di bawah teks hero
    const pairs: Array<[string, string]> = [
      [ink, '#FFFFFF'],
      [ink, surface],
      [navy, surface],
      [navy, aurora],
      [muted, '#FFFFFF'],
      [muted, surface],
      [muted, aurora],
      [link, surface],
      ['#0F766E', surface], // ujung shimmer
      ['#FFFFFF', link], // tombol primer
      ['#FFFFFF', navy],
      ['#E2E8F0', navy], // teks sekunder di band gelap
      [navy, '#0EA5E9'], // tombol gradient (ujung terendah)
      [navy, '#2DD4BF'],
      ['#7DD3FC', navy], // cincin fokus di atas navy
    ]
    for (const [fg, bg] of pairs)
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    // Frasa shimmer h1 = teks besar (>= 18.66px bold), batas AA 3:1, di atas blob aurora terpekat.
    expect(ratio(link, aurora)).toBeGreaterThanOrEqual(3)
    // Setiap warna teks di CSS harus berasal dari daftar yang diuji.
    const tested = new Set(pairs.flatMap((p) => p).map((c) => c.toLowerCase()))
    const colors = Array.from(css.matchAll(/(?:^|[;{\s])color:\s*(#[0-9a-f]{6})/gi)).map((m) =>
      m[1]!.toLowerCase(),
    )
    for (const c of colors)
      expect(tested.has(c), `warna teks ${c} belum diuji kontrasnya`).toBe(true)
  })

  it('respects reduced motion and no-js content visibility', () => {
    expect(css).toMatch(/\.zy-page:not\(\.zy-js\) \.zm-marquee/)
  })
})
