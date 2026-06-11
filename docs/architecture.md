# Frontend Architecture

## Prinsip

- `src/app` adalah composition root untuk router, provider, dan bootstrap aplikasi.
- `src/features` memiliki use-case bisnis. API, query, page, dan komponen privat fitur tinggal bersama.
- `src/components` hanya berisi komponen lintas fitur: UI primitive, form, table, layout, dan common.
- Pinia menyimpan client state global. Data dari backend tetap dikelola TanStack Query.
- Route meta menjadi sumber kebutuhan auth, tenant, dan permission untuk setiap halaman.
- Tenant aktif dikirim ke backend melalui header dan seluruh query cache dibersihkan ketika tenant berubah.

## Alur Request

```text
Page -> feature query/mutation -> apiClient -> Axios interceptors -> Go API
                                     |              |
                              unwrap envelope   auth + tenant header
```

Kontrak respons yang diasumsikan:

```json
{
  "data": {},
  "meta": {}
}
```

Kontrak error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Input tidak valid",
  "errors": {
    "email": ["Email sudah digunakan"]
  },
  "requestId": "req_..."
}
```

## Auth dan Multi-Tenant

Mode produksi yang direkomendasikan adalah session cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`.
Bearer JWT tersedia untuk deployment yang memang membutuhkannya melalui `VITE_AUTH_MODE=bearer`.

Urutan guard:

1. `authGuard` memulihkan sesi dan menolak guest.
2. `guestGuard` mencegah user yang sudah login kembali ke halaman login.
3. `tenantGuard` memastikan workspace aktif.
4. `permissionGuard` memeriksa permission dari route meta.

Backend tetap wajib melakukan autentikasi, isolasi tenant, dan otorisasi. Guard frontend hanya untuk UX.

## Menambah Feature

```text
src/features/contacts/
├── api/
│   ├── contacts.api.ts
│   └── contacts.queries.ts
├── components/
├── pages/
├── schemas/
└── types.ts
```

Tambahkan route lazy-loaded, route meta permission, dan menu bila fitur perlu muncul di sidebar.
Gunakan permission berbentuk `resource.action`, misalnya `contacts.read` dan `contacts.create`.

## Deployment

Build menghasilkan SPA statis. Nginx menggunakan fallback `index.html` agar history mode Vue Router bekerja.
API sebaiknya berada pada origin yang sama melalui reverse proxy untuk menyederhanakan cookie dan CORS.
