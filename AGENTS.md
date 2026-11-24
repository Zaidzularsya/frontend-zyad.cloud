# Agent Working Guide — zyad.cloud Frontend

## Bahasa dan gaya kerja

- Jelaskan hasil kerja dalam Bahasa Indonesia.
- Gunakan Bahasa Inggris untuk code, command, file name, branch name, dan commit message.
- Buat perubahan kecil dan bertahap.
- Jangan menambah dependency production tanpa konfirmasi.
- Jangan mengubah arsitektur utama tanpa konfirmasi.

## Scope repo

- Bacalah `README.md` terlebih dahulu untuk konteks repo.
- Baca `docs/architecture.md` sebelum menambah atau mengubah fitur — dokumen itu mendefinisikan pemisahan `app/features/components`, kontrak response API, dan urutan route guard.
- `docs/frontend-structure.md` memetakan folder secara rinci (terutama area `landing`), `docs/backend-integration.md` menjelaskan cara konsumsi API backend.
- Backend Go untuk platform ini berada di repo terpisah (`../backend`). Kontrak request/response mengikuti `docs/architecture.md` bagian "Alur Request" (envelope sukses `{data, meta}`, envelope error `{code, message, errors, requestId}`). Jangan mengubah bentuk request/response tanpa memverifikasi ke backend, dan jangan membuat ("invent") endpoint yang belum ada — cek `api/openapi.yaml` di repo backend kalau ragu.

## Stack (aktual, lihat `package.json`)

- Vue 3.5 + TypeScript 5.7 + Vite 6, Tailwind CSS 4 (arah visual TailAdmin).
- Vue Router, Pinia (client state), TanStack Query (server state), axios (`src/lib/http.ts`, `src/lib/api-client.ts`).
- Form: vee-validate + zod. Tabel: TanStack Table. Chart: ApexCharts. Rich text: Tiptap. Ikon: lucide-vue-next.
- Landing builder: GrapesJS `0.23.6` + `grapesjs-blocks-basic` (versi dipin — jangan upgrade tanpa konfirmasi).
- Tenant aktif dikirim lewat header (`VITE_TENANT_HEADER`, default `X-Organization-ID`); cache query dibersihkan saat tenant berganti.

## Development pattern

- `src/app` = composition root: router, provider, dan bootstrap aplikasi.
- `src/features/<nama-fitur>/` = use-case bisnis. Struktur standar saat menambah fitur baru:
  ```text
  src/features/<nama-fitur>/
  ├── api/
  │   ├── <nama-fitur>.api.ts       # axios call
  │   └── <nama-fitur>.queries.ts   # TanStack Query hooks
  ├── components/                    # komponen privat fitur ini
  ├── pages/
  ├── schemas/                       # zod schema
  └── types.ts
  ```
  Fitur besar boleh punya `composables/`, `config/`, `utils/`, atau sub-fitur (mis. `crm/leads`, `crm/deals`, `landing/builder`, `landing/renderer`). Ikuti struktur fitur yang sedang diubah.
- `src/components` hanya untuk komponen lintas fitur (UI primitive, form, table, layout, common) — jangan taruh komponen spesifik satu fitur di sini.
- `src/layouts` berisi `AuthLayout`, `DashboardLayout`, `MarketingLayout`, `PublicLayout`; `src/lib` berisi helper lintas fitur (http, auth, tenant, permission, pagination).
- Pinia (`src/stores`) untuk client state global. Data dari backend selalu lewat TanStack Query — jangan duplikasi state server ke Pinia.
- Permission memakai format `resource.action` (mis. `contacts.read`, `contacts.create`), diperiksa lewat route meta dan `permissionGuard`.
- Urutan route guard: `authGuard` → `guestGuard` → `tenantGuard` → `permissionGuard` (`src/middleware`). Guard di frontend hanya untuk UX — backend tetap wajib melakukan autentikasi, otorisasi, dan isolasi tenant yang sesungguhnya.
- Route baru wajib lazy-loaded, punya route meta permission, dan ditambahkan ke menu sidebar (`src/config/menu.ts`) kalau fitur perlu terlihat di navigasi.
- Konten HTML dari tenant/user (landing, email, catatan) wajib disanitasi (DOMPurify) atau dirender di iframe sandbox tanpa `allow-scripts`, mengikuti pola renderer landing yang sudah ada.

## Testing & quality gate

Sebelum menganggap task selesai, jalankan (sama dengan CI `.github/workflows/ci.yml`):

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

- Unit test pakai Vitest (`npm run test` sekali jalan, `npm run test:unit` mode watch); file `*.spec.ts` diletakkan di samping kode yang dites. E2E pakai Playwright (`npm run test:e2e`, spec di `tests/e2e/`). Tambahkan test untuk logic berisiko (validasi form, computed non-trivial, mapping API) — jangan hanya andalkan lint/typecheck sebagai satu-satunya sinyal "berhasil".
- Husky pre-commit menjalankan `lint-staged` (eslint --fix + prettier --write). Jangan bypass dengan `--no-verify` tanpa alasan jelas.

## Development Commands

```bash
cp .env.example .env
npm install
npm run dev
```

## Branch & rilis

- Kerja di branch `feat/<nama>` / `fix/<nama>` dari `staging-dev` terbaru.
- `staging-dev` = branch integrasi untuk server DEV; masuk lewat **PR**, bukan push langsung.
- `main` = produksi; hanya menerima PR `staging-dev → main` saat rilis, lalu diberi tag SemVer `vX.Y.Z` (tag yang sama di repo backend). Produksi hanya dideploy dari tag.
- `.github/workflows/deploy.yml` (push `main`) saat ini **tidak dipakai** untuk deploy; jangan mengandalkannya.
- Commit/push/PR/deploy hanya saat diminta.

<!-- antislop:start -->

## antislop

For UI, copy, accessibility, mobile-layout, or code-comment work on
**landing / marketing / public** surfaces:

1. Read `DESIGN.md` (repo root) for brand direction — palette, typography, motif, dials.
2. Apply the antislop skills as the filter. They are installed per-developer (global,
   not vendored here); if missing, install with
   `npx -y skills@latest add miqdadbadjuber/anti-slop -g --skill antislop --skill antislop-ui --skill antislop-copywriting --skill antislop-human --skill antislop-layoutmobile`
   (needs Node ≥ 22):
   - core filter: `antislop`
   - UI / visual: `antislop-ui`
   - copy & text: `antislop-copywriting`
   - accessibility / people: `antislop-human`
   - mobile / responsive: `antislop-layoutmobile`

`antislop-code` (comment hygiene) is intentionally **not** installed — Go/TS linting
already covers that. Before starting, ask whether antislop applies during the work or
as an after-the-fact audit.

<!-- antislop:end -->
