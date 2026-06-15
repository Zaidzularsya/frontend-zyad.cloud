# Panduan Integrasi API Backend

Dokumen ini menjelaskan arsitektur integrasi, kontrak API, serta tata cara konsumsi API backend Zyad Cloud (Go-based) pada aplikasi frontend Vue 3.

---

## 1. Arsitektur Integrasi & Siklus Request

Seluruh komunikasi antara Frontend (Vue 3) dan Backend (Go REST API) dilakukan melalui Axios client dengan alur sebagai berikut:

```text
Page -> feature query/mutation -> apiClient -> Axios interceptors -> Go API
                                     |              |
                              unwrap envelope   auth + tenant header
```

### Konfigurasi Environment (`.env`)

Pengaturan diatur secara dinamis melalui file `.env` di root proyek:

- `VITE_API_BASE_URL`: Base URL endpoint backend (default: `http://localhost:8080/api/v1`).
- `VITE_AUTH_MODE`: Mendukung mode `cookie` (Session HttpOnly Cookie) atau `bearer` (stateless Bearer JWT token).
- `VITE_TENANT_HEADER`: Header HTTP yang dikirim untuk penyelesaian multi-tenancy (default: `X-Tenant-ID`).

---

## 2. Kontrak Response (Envelope)

Semua endpoint backend mengembalikan struktur response terbungkus (_enveloped_).

### Standard Success Response

```json
{
  "success": true,
  "message": "Request processed successfully",
  "data": {
    "id": "uuid-1",
    "name": "Jane Doe"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": ["email is required"]
    }
  }
}
```

---

## 3. Autentikasi & Rotasi Token

### Request Interceptor

Request interceptor menyuntikkan token otorisasi dan identitas tenant aktif secara otomatis ke setiap outgoing request:

1.  **Bearer JWT**: Ditambahkan pada header `Authorization: Bearer <token>` (jika disimpan di local storage).
2.  **X-Tenant-ID**: Identitas tenant aktif disematkan pada header `X-Tenant-ID`.

### Rotasi Token (Response Interceptor)

Jika server mengembalikan status HTTP `401 Unauthorized` dengan access token yang kadaluwarsa, Axios interceptor secara transparan akan:

1.  Menahan request lain yang masuk dalam antrean (_queueing requests_).
2.  Melakukan request POST ke `/auth/refresh-token` dengan payload `{ refresh_token: "..." }` (pada mode bearer).
3.  Menyimpan pasangan access token dan refresh token baru ke `localStorage`.
4.  Mengulang kembali (_retry_) request asli yang sempat gagal dengan header `Authorization` yang baru.
5.  Jika rotasi gagal, sesi dianggap kedaluwarsa dan memicu event `auth:expired` untuk mengarahkan pengguna ke halaman Login.

---

## 4. Rute API yang Dikonsumsi

### Auth API

- `POST /auth/login` - Melakukan autentikasi menggunakan email/username.
- `POST /auth/logout` - Menghapus session aktif saat ini.
- `POST /auth/refresh-token` - Memperbarui token akses.
- `GET /auth/me` - Bootstrap sesi untuk memulihkan profil, role, dan izin efektif pengguna aktif.

### Admin Users API (Membutuhkan Izin)

- `GET /admin/users` - Mengambil daftar pengguna terpaginasi beserta filter search/status.
- `GET /admin/users/:id` - Mengambil rincian hak akses, peran, dan profil pengguna.
- `POST /admin/users` - Menambah pengguna baru dengan menetapkan role dasar.
- `PATCH /admin/users/:id` - Memperbarui data profil dasar (nama, email, jabatan, departemen).
- `DELETE /admin/users/:id` - Soft-delete pengguna.
- `POST /admin/users/:id/restore` - Memulihkan pengguna yang telah dihapus secara soft-delete.
- `PATCH /admin/users/:id/status` - Mengubah status pengguna (`active`, `suspended`, `banned`) dengan alasan (_reason_) wajib.
- `POST /admin/users/:id/roles` & `DELETE /admin/users/:id/roles/:roleId` - Mengatur Peran (Roles) pengguna.
- `POST /admin/users/:id/permissions` & `DELETE /admin/users/:id/permissions/:permissionId` - Mengatur Izin Khusus (_Permission Overrides_) pengguna dengan opsi `allow` atau `deny`.

---

## 5. Keamanan & Izin Tingkat UI (Guard)

Frontend mengawal izin pengguna di tingkat antarmuka melalui:

1.  **Route Guard (`permissionGuard`)**: Memeriksa properti `meta.permissions` pada rute Vue Router sebelum mengizinkan navigasi halaman.
2.  **Permission Gate Component (`PermissionGate`)**: Menyembunyikan atau menampilkan elemen UI (seperti tombol aksi) berdasarkan kepemilikan izin pengguna.
    ```vue
    <PermissionGate permission="users.create">
      <BaseButton @click="addUser">Tambah User</BaseButton>
    </PermissionGate>
    ```
