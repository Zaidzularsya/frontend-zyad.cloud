# Agent Working Guide

## Bahasa dan gaya kerja

- Jelaskan hasil kerja dalam Bahasa Indonesia.
- Gunakan Bahasa Inggris untuk code, command, file name, branch name, dan commit message.
- Buat perubahan kecil dan bertahap.
- Jangan menambah dependency production tanpa konfirmasi.
- Jangan mengubah arsitektur utama tanpa konfirmasi.

## Scope repo

- Bacalah `README.md` terlebih dahulu untuk konteks repo.
- Baca `docs/architecture.md` sebelum menambah atau mengubah fitur — dokumen itu mendefinisikan pemisahan `app/features/components`, kontrak response API, dan urutan route guard.
- Backend Go untuk platform ini berada di repo terpisah (`../backend`). Kontrak request/response mengikuti `docs/architecture.md` bagian "Alur Request" (envelope sukses `{data, meta}`, envelope error `{code, message, errors, requestId}`). Jangan mengubah bentuk request/response tanpa memverifikasi ke backend, dan jangan membuat ("invent") endpoint yang belum ada — cek `api/openapi.yaml` di repo backend kalau ragu.

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
- `src/components` hanya untuk komponen lintas fitur (UI primitive, form, table, layout, common) — jangan taruh komponen spesifik satu fitur di sini.
- Pinia (`src/stores`) untuk client state global. Data dari backend selalu lewat TanStack Query — jangan duplikasi state server ke Pinia.
- Permission memakai format `resource.action` (mis. `contacts.read`, `contacts.create`), diperiksa lewat route meta dan `permissionGuard`.
- Urutan route guard: `authGuard` → `guestGuard` → `tenantGuard` → `permissionGuard`. Guard di frontend hanya untuk UX — backend tetap wajib melakukan autentikasi, otorisasi, dan isolasi tenant yang sesungguhnya.
- Route baru wajib lazy-loaded, punya route meta permission, dan ditambahkan ke menu sidebar kalau fitur perlu terlihat di navigasi.

## Testing & quality gate

Sebelum menganggap task selesai, jalankan:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

- Unit test pakai Vitest (`npm run test:unit`), e2e pakai Playwright (`npm run test:e2e`). Infra sudah wired dengan benar tapi coverage unit test di `src/` masih minim — tambahkan test untuk logic yang cukup berisiko (validasi form, computed non-trivial), jangan hanya andalkan lint/typecheck sebagai satu-satunya sinyal "berhasil".
- Husky pre-commit menjalankan `lint-staged` (eslint --fix + prettier --write). Jangan bypass dengan `--no-verify` tanpa alasan jelas.

## Development Commands

```bash
cp .env.example .env
npm install
npm run dev
```
