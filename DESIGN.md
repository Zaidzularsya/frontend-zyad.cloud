# DESIGN.md — Zyad Cloud

Design direction for **landing pages, marketing, and public-facing surfaces** of Zyad
Cloud (PT Zyad Technovation Indonesia). Read this before any UI or copy work on those
surfaces, then apply the `antislop` skills as the filter.

`Dial: ENERGY 3 / RHYTHM 2 / MOTION 3`

> Scope note: this file governs **landing / marketing / public** pages. The tenant
> admin dashboard currently uses the legacy TailAdmin indigo token ramp
> (`--color-brand-*` = `#465fff`) and is **out of scope** here. See
> "Extending to the app UI" at the bottom before touching admin styling.

---

## Identity

Zyad Cloud is a **multi-tenant SaaS platform for Indonesian businesses** (landing
pages, CRM, domains, media, billing). The brand should read as **infrastructure you
can trust**: precise, calm, quietly modern. Indonesian-first, B2B, not consumer-flashy.

The logo is **three soft rounded mounds with one small floating node**, filled with a
sky-blue → teal gradient. Read it as _a clear morning sky over calm hills_: layered,
organic, low-noise, with one detached point of focus.

## Personality

_(interpretive — edit if brand intent shifts; chosen 2026-09-09)_

- Precise and understated. Confidence shown through restraint, whitespace, and
  accurate typography — not through loud color or animation.
- Engineered, not decorative. Every visual choice earns its place.
- Approachable, not corporate-cold. Rounded forms and soft gradient keep it human.
- Reliable. The UI should feel like it will still work at 2 a.m.

## Palette

Two brand hue families only — **blue** and **teal** — plus neutrals and one status
colour per screen. No indigo, no purple, no rainbow gradients.

**Brand (from the logo)**
| Role | Hex | Notes |
|------|-----|-------|
| Sky 300 | `#7DD3FC` | light gradient stop, tints |
| Sky 400 | `#38BDF8` | brand blue |
| Sky 500 | `#0EA5E9` | gradient start, iconography |
| Teal 400 | `#2DD4BF` | brand teal |
| Teal 500 | `#14B8A6` | gradient end, success accents |
| Cyan 400 | `#22D3EE` | the "node" accent |
| Deep navy | `#0B1F3A` | logo base; heavy headings on light |
| Mint | `#3CDDC7` → `#62FAE3` | large display-text gradient tail only, sparing |

**Brand gradient** — use **once per view** as a focal accent (hero headline, primary
CTA, or one key visual), always on a ~100° axis (top-left sky → bottom-right teal):
`linear-gradient(100deg, #0EA5E9 0%, #2DD4BF 100%)`.
The three-stop text gradient already in `main.css` (`--color-secondary` → teal → mint)
is for **large display headings only**, never body or UI text.

**Functional / neutral** (existing landing tokens in `src/assets/main.css`)
| Role | Hex |
|------|-----|
| Primary action / link (on light) | `#0058BE` (`--color-secondary`) — deeper blue for AA contrast on small text |
| Page surface (light) | `#F7F9FB` |
| Card / raised | `#FFFFFF` |
| Hairline / border | `#E0E3E5` |
| Body text (light) | `#191C1E` |
| Page surface (dark) | `#0B0F19` / `#0F172A` |
| Text (dark) | `#F8FAFC` |
| Error | `#BA1A1A` on `#FFDAD6` |

Success states use the teal family. Keep amber/warning rare and functional.

## Typography

**Inter** is the only typeface (weights 400 / 600 / 700), already loaded in
`index.html`. Reason: neutral grotesque, engineered feel, stays legible at dashboard
density and small sizes — it matches "calm infrastructure". Do not add a second family.

Scale (already defined as `--text-*` tokens in `main.css` — use them, don't reinvent):

| Token         | Size / line-height / tracking / weight     | Use                           |
| ------------- | ------------------------------------------ | ----------------------------- |
| `display-xl`  | 60 / 1.1 / −0.02em / 700                   | one hero headline per page    |
| `headline-lg` | 48 / 1.2 / −0.01em / 700 (mobile 32 / 1.2) | section titles                |
| `headline-md` | 30 / 1.3 / 600                             | sub-sections                  |
| `body-lg`     | 18 / 1.6 / 400                             | lead paragraphs               |
| `body-md`     | 16 / 1.5 / 400                             | body                          |
| `label-sm`    | 14 / 1.4 / +0.05em / 600                   | eyebrows, captions (caps-ish) |

- Metrics, tables, pricing: `font-variant-numeric: tabular-nums`.
- Text measure 60–75ch. Max content width ~1200px.

## Identity motif — repeat it

Derived from the logo shape. Apply consistently so the design "belongs" to Zyad:

- **Soft, generous radii** (mirrors the 16–20px arcs in the logo path): cards / panels
  `16px`, buttons / inputs `10–12px`, pills full-round.
- **Layered overlap**: sections and hero visuals overlap by ~24px instead of sitting
  in flat stacked bands. A foreground card may break the edge of the band behind it —
  the "mounds" overlap.
- **The node**: exactly **one** small detached circular accent per section (a status
  dot, a numbered-step bubble, a floating badge). Never more than one, never purely
  decorative — it must mark something.

## Composition (RHYTHM 2)

- **Vary section internal layout.** Do not repeat "centered title + subtitle + 3-card
  grid" down the page. Alternate: left intro + right visual · full-bleed band ·
  asymmetric 2/3–1/3 split · single focal statement.
- Vertical rhythm: `--spacing-section-gap` (120px desktop / 64–80px mobile), 24px
  gutter, 20px mobile / 80px desktop page margin (tokens already exist).
- Predictable, not wild — scale and alignment shift between sections, but the reader
  always knows where they are.

## Motion (MOTION 3)

Ekspresif tapi terkendali. Kosakata di bawah dikelola `zy-motion.css` + runtime
`createPageRuntime` (tanpa dependency) dan tersedia lewat panel "Animasi" GrapesJS.

| Kelompok   | Kelas                                                                                                                                                                                   | Mekanisme                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Efek masuk | `zy-anim-fade-up`, `zy-anim-fade-in`, `zy-anim-zoom-in`, `zy-anim-slide-left`, `zy-anim-slide-right`, `zy-anim-blur-in`, `zy-anim-clip-reveal`                                          | runtime menambah `is-in` saat masuk viewport (sekali); geser 32 px (16 px di bawah 768 px); slide-left datang dari kiri, slide-right dari kanan |
| Pengatur   | `zy-delay-100` … `zy-delay-800` (kelipatan 100), `zy-dur-fast` (400 ms), `zy-dur-slow` (1200 ms; default 700 ms), `zy-stagger` (anak langsung mendapat delay bertahap 80 ms)            | CSS + runtime (stagger)                                                                                                                         |
| Hero       | `zy-anim-hero`                                                                                                                                                                          | keyframes langsung saat load, tidak menunggu runtime                                                                                            |
| Scroll     | `zy-parallax-slow` (×0.1), `zy-parallax-med` (×0.2), `zy-parallax-fast` (×0.35), `zy-scale-in-scroll` (0.94 → 1)                                                                        | runtime menulis `--zy-progress` (0–1)                                                                                                           |
| Interaksi  | `zy-tilt` (maks 6°), `zy-hover-lift` (−4 px), `zy-hover-glow`                                                                                                                           | pointer (runtime), hover (CSS 150 ms)                                                                                                           |
| Ambient    | `zy-aurora`, `zy-float`, `zy-text-shimmer`                                                                                                                                              | CSS keyframes; `zy-text-shimmer` menganimasikan `background-position` (6 s), satu-satunya pengecualian non-compositor                           |
| Data       | `zy-count` (angka dihitung naik 1,2 s saat terlihat; prefix/sufiks seperti `+`, `%`, `rb` dipertahankan), `zy-marquee` (isi digandakan sekali, 40 s per siklus, pause saat hover/fokus) | runtime                                                                                                                                         |

### Pagar kualitas

1. Konten tidak pernah tersembunyi karena JS gagal: state awal tersembunyi hanya di bawah `.zy-js`.
2. `prefers-reduced-motion: reduce` → semua animasi mati, state akhir langsung.
3. Lebar < 768 px atau perangkat tanpa hover → parallax, tilt, scale-in-scroll mati; jarak gerak efek masuk 16 px (desktop 32 px).
4. Hanya `transform`, `opacity`, `clip-path`, `filter` yang dianimasikan (pengecualian tercatat: `zy-text-shimmer`).
5. Satu `zy-aurora` per halaman (pedoman DESIGN.md).
6. Elemen LCP hero memakai `zy-anim-hero` (keyframes CSS), bukan efek masuk berbasis observer.

## Mood

Airy, low-noise, lots of light surface, few strong colours. Teal signals
growth / uptime; blue signals trust / depth; navy signals stability. The page should
feel like it _breathes_.

## Dials — hold from first section to last

- **ENERGY 3** — confident and visibly alive: a strong hero statement with the brand
  gradient, motion that supports the story. Not GOV.UK-flat, not Awwwards-loud.
- **RHYTHM 2** — real variation in layout and scale, but predictable.
- **MOTION 3** — ekspresif tapi terkendali: reveal, parallax, tilt, ambient — selalu
  dengan pagar kualitas di atas.

## Do

- Use the blue→teal gradient **once** per view, as the focal accent.
- Keep surfaces mostly neutral; let type hierarchy and one accent carry the page.
- Design empty / loading / error states as part of every screen.
- Indonesian-first copy (see `antislop-copywriting`).

## Don't

- No indigo / purple. `#465fff` is the legacy admin token — keep it out of
  landing / marketing.
- No glassmorphism on marketing pages except the single hero panel and the sticky header.
- No 4+ colours competing on one screen.
- No gradient on body text or small UI text.
- No stock "AI-startup" hero: purple glow, floating 3D blobs everywhere, giant emoji.

## Aturan isi

Berlaku untuk halaman marketing platform (starter "Zyad Marketing") dan setiap
perubahan copy-nya.

- **Hanya klaim fitur yang sudah ada di produksi:** CRM + playbook lead, pipeline & deal,
  quotation (PDF, kirim WA/email, setujui online), sales order, invoice & tagihan
  berulang + pembayaran DOKU, katalog produk, landing page builder + domain sendiri,
  integrasi WhatsApp, user & role management. Checklist klaim diverifikasi di QA
  produksi sebelum publish; fitur yang belum rilis tidak boleh disebut.
- **Tidak ada konten karangan (K15):** tidak ada testimoni, logo klien, angka statistik,
  atau nama merek pesaing. Strip "Fakta produk" hanya boleh berisi fakta yang bisa
  dibuktikan dari produk itu sendiri.
- **Bahasa Indonesia, sapaan "Anda".** Tanpa "kamu", tanpa campuran bahasa Inggris yang
  tidak perlu (istilah teknis seperti CRM, invoice, lead tetap).
- **Copy final hanya lewat starter.** Konten final dibawa kode (`starters/zyad-marketing.ts`)
  supaya DEV dan produksi identik. Editan langsung di editor DEV tidak terbawa ke
  produksi; ubah copy di starter, bukan di halaman.
- **Pagar visual:** satu `zy-aurora` per halaman (hero), elemen LCP hero memakai
  `zy-anim-hero`, gradient sky→teal hanya sebagai aksen fokus.

## Extending to the app UI later

If the tenant dashboard adopts this direction: replace the indigo `--color-brand-*`
ramp in `src/assets/main.css` with a sky/teal ramp in one pass, keep gradients out of
dense data views, verify contrast (`antislop-human`), then re-run the antislop audit.
Do this as its own change, not mixed with feature work.

---

_Source: palette, type scale, and motifs are extracted from
`public/branding/zyad-logo-{light,dark}.svg`, `public/branding/favicon.svg`,
`index.html`, and `src/assets/main.css`. Personality, mood, and dials reflect the
"calm, trustworthy infrastructure" direction chosen 2026-09-09. The team owns this
file — edit it as the brand evolves._
