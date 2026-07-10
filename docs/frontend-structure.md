# Struktur Frontend — Peta & Fungsi

Dokumen ini melengkapi `docs/architecture.md` (prinsip umum) dengan peta folder yang lebih
rinci, khususnya area `landing` (builder + renderer publik) dan alur branding/katalog plan
yang baru diimplementasikan. Ditulis sebagai referensi struktur, bukan tutorial — untuk aturan
penambahan fitur baru lihat `docs/architecture.md`.

## Stack

Vue 3.5 (Composition API, `<script setup>`) + Vite 6 + TypeScript + vue-router 4 + Pinia 3
(client state) + TanStack Vue Query (server state/cache) + axios + Tailwind 4 + Zod (validasi env)

- vee-validate (form). Test: Vitest (unit) + Playwright (e2e).

Entry point: `src/app/main.ts` → `src/app/providers.ts` (wiring Pinia + query client) →
`src/app/router.ts` (semua route).

## Peta folder `src/`

| Folder        | Fungsi                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`        | Bootstrap aplikasi: `main.ts`, `providers.ts`, `router.ts`.                                                                                                                                    |
| `assets/`     | Aset statis & style global.                                                                                                                                                                    |
| `components/` | Komponen lintas-fitur: `ui/` (BaseCard, BaseButton, BaseModal), `common/` (PermissionGate, PageHeader), `layout/` (AppHeader, AppSidebar), `form/` (DatePicker, TextField).                    |
| `config/`     | `env.ts` (parsing env via Zod), `menu.ts` (konfigurasi sidebar dashboard).                                                                                                                     |
| `features/`   | Modul bisnis (feature-sliced) — lihat detail di bawah.                                                                                                                                         |
| `layouts/`    | Layout per grup route: `AuthLayout`, `DashboardLayout`, `MarketingLayout`, `PublicLayout`.                                                                                                     |
| `lib/`        | Utilitas lintas-fitur: `http.ts` (instance axios), `api-client.ts` (unwrap envelope), `auth.ts` (token storage), `tenant.ts` (tenant storage), `permission.ts`, `query-client.ts`, `utils.ts`. |
| `middleware/` | Router guard: `auth.guard.ts`, `guest.guard.ts`, `permission.guard.ts`, `tenant.guard.ts`.                                                                                                     |
| `stores/`     | Pinia store: `app.store.ts`, `auth.store.ts`, `tenant.store.ts`.                                                                                                                               |
| `types/`      | Tipe bersama, termasuk `types/api.ts` (`ApiEnvelope`, `PaginatedResponse`).                                                                                                                    |
| `views/`      | Halaman route mandiri yang tidak terikat satu fitur: `NotFoundPage`, `ForbiddenPage`, `SelectTenantPage`, `FeaturePlaceholderPage`.                                                            |

Sub-modul `features/` yang relevan dengan landing page & katalog plan:

- `features/landing/builder/` — UI admin CRUD untuk membangun landing page (pages, sections,
  branding, menu, template). Dipakai di area dashboard terautentikasi.
- `features/landing/renderer/` — mesin render untuk landing page publik (yang diakses pengunjung
  tanpa login).
- `features/landing/shared/` — kontrak bersama antara builder & renderer: `types/landing.types.ts`,
  `api/landing.api.ts`, `utils/landing-normalizer.ts`, `constants/section-types.ts`.
- `features/public/` — pembungkus tipis untuk landing page marketing milik platform sendiri
  (slug `public-marketing`).
- `features/billing/` — CRUD plan/feature platform (referensi pola query/mutation TanStack Query
  yang konsisten dipakai di modul lain, termasuk katalog publik yang baru).

## Alur render landing page publik

```text
Route (:slug atau /)
  → MarketingLandingPage.vue (slug tetap "public-marketing")   [features/public/pages]
     atau langsung DynamicLandingPage.vue (:slug dari route)   [features/landing/renderer/pages]
  → GET /public/landing/resolve?slug=<slug>   (backend: PublicLandingHandler.Resolve)
  → normalisasi { page, branding, sections, menus } dari response
  → emit 'landing-navigation' & 'landing-branding' ke MarketingLayout (lewat RouterView)
  → LandingPageRenderer.vue: filter section is_enabled, urutkan sort_order
  → SectionRenderer.vue: resolve komponen dari section-registry.ts berdasar (type, variant)
  → komponen section individual di features/landing/renderer/sections/<type>/*.vue
```

Route terdaftar di `src/app/router.ts`:

```ts
{
  path: '/',
  component: () => import('@/layouts/MarketingLayout.vue'),
  children: [
    { path: '', name: 'home', component: MarketingLandingPage },       // slug="public-marketing"
    { path: ':slug', name: 'public-landing-page', component: DynamicLandingPage },
  ],
},
```

### Registry section (`section-registry.ts`)

Peta `{ [sectionType]: { [variant]: Component } }`. `resolveSection(type, variant)` fallback:
`variant` → `enterprise` (jika variant termasuk daftar template enterprise) → `default` → `null`.
Untuk menambah tipe/varian section baru: buat file di `renderer/sections/<type>/<Nama>.vue`,
import, lalu daftarkan di registry ini.

## Branding — sebelumnya hardcoded, sekarang dinamis

**Sumber data**: backend sudah mengembalikan objek `branding` (company_name, tagline,
logo_light_url, logo_dark_url, favicon_url, social_image_url, colors, dst.) di dalam payload
`GET /public/landing/resolve` (lihat `internal/modules/landing/dto/response.go` →
`PublicResolveResponse.Branding`). Sebelumnya field ini diterima tapi **tidak pernah dipakai**
oleh renderer — `MarketingLayout.vue` menampilkan teks brand & copyright yang di-hardcode.

**Perubahan**:

- `landing.api.ts`: fungsi `normalizeBranding()` diekspor (sebelumnya private) supaya bisa dipakai
  ulang di luar `landingApi`.
- `DynamicLandingPage.vue`: setelah fetch resolve, sekarang juga mengambil `result.branding`,
  menormalisasinya, dan meng-`emit('landing-branding', ...)` — pola yang sama dengan
  `landing-navigation` yang sudah ada sebelumnya.
- `MarketingLandingPage.vue`: meneruskan (forward) event `landing-branding` ke atas (pola yang
  sama seperti `landing-navigation`), karena Vue tidak otomatis meneruskan custom event lewat
  `RouterView` tanpa deklarasi eksplisit.
- `MarketingLayout.vue`: mendengarkan `@landing-branding="setBranding"` pada `<RouterView>`,
  menyimpan branding ke `ref`, lalu:
  - Nama brand di header (`brandName`) dan teks copyright footer (`copyrightText`) memakai
    `branding.company_name`, fallback ke `"Zyad Cloud"` jika kosong (bukan lagi teks template
    "HEY Digital Solution" atau tahun statis "2026" yang di-hardcode sebelumnya).
  - Logo di header (`brandLogoUrl`) memakai `logo_dark_url`/`logo_light_url` sesuai mode
    gelap/terang, ditampilkan sebagai `<img>` jika tersedia.
  - Favicon tab browser di-set dinamis dari `branding.favicon_url` via `setFavicon()`.
- `LandingFooter.vue` (komponen section footer, dipakai lewat registry `footer.default`):
  glyph logo kotak yang sebelumnya berisi huruf "H" hardcoded, sekarang menampilkan huruf
  pertama dari `content.brandName` (dinamis), atau gambar `<img>` jika section punya
  `content.logoUrl`.

**Yang sengaja tidak diubah**: `AuthLayout.vue` (halaman login/register) masih memakai teks
"Zyad Cloud" statis — di luar scope task ini (bukan bagian dari landing page publik), dicatat
sebagai potensi follow-up jika branding perlu konsisten juga di area auth.

## Katalog plan platform pada section Pricing

Section Pricing (`PricingSection.vue`, terdaftar di registry sebagai `pricing.default`) sekarang
mendukung dua sumber data lewat field `content.source` (kontrak sama dengan backend
`SectionTypePricing` + `content.source`, lihat `internal/modules/landing/service/section_service.go`):

- `content.source` tidak diisi atau `"custom"` (default) — perilaku lama, daftar plan statis
  diambil langsung dari `content.plans` yang diisi manual lewat builder.
- `content.source === "platform_catalog"` — komponen fetch `GET /public/catalog/plans` saat
  mount lewat `publicCatalogApi.listPlans()` (`src/features/public/api/public-catalog.api.ts`,
  file baru), lalu memetakan setiap plan (`code, name, description, sort_order, prices[]`) ke
  bentuk tampilan plan (nama, label harga terformat `Intl.NumberFormat`, deskripsi sebagai
  fitur). Interval harga yang ditampilkan bisa diarahkan lewat `content.billingInterval`
  (default `"monthly"`), fallback ke harga pertama yang tersedia jika interval yang diminta
  tidak ada.

Validasi bahwa hanya organisasi platform yang boleh mengatur `source: "platform_catalog"`
ditegakkan di backend (`ErrPricingSourceNotAllowed`, 400), bukan di frontend — builder admin
untuk toggle "Custom" vs "Sinkron dari Katalog Platform" belum dibuat di frontend ini (masih
scope backend-only + renderer publik; lihat catatan follow-up di bawah).

## Follow-up yang belum dikerjakan (di luar scope pass ini)

- UI builder admin untuk memilih `source` section Pricing (toggle khusus organisasi platform).
- Branding dinamis di `AuthLayout.vue` (halaman login/register) dan halaman non-landing lainnya.
- Caching client-side untuk `GET /public/catalog/plans` (saat ini fetch ulang setiap mount
  komponen; bisa dipindah ke TanStack Query dengan `staleTime` jika traffic tinggi).
