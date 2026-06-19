# Frontend Traceability Index

Dokumen pelacakan fitur antarmuka (UI) Vue dan integrasinya dengan backend API (Golang).

## 1. Public & Lead Flow

| Fitur UI                | Rute Vue         | API Endpoint Target       | Status UI | Status Integrasi | Keterangan                                              |
| ----------------------- | ---------------- | ------------------------- | --------- | ---------------- | ------------------------------------------------------- |
| Platform Marketing Page | `/`              | N/A                       | done      | N/A              | Landing page publik                                     |
| Social Login / Reg      | `/auth/register` | TBD (Auth API)            | planned   | N/A              | Entry point dari lead -> registrasi (Social Media Mock) |
| Login Page              | `/auth/login`    | `POST /api/v1/auth/login` | done      | done             | -                                                       |

## 2. Super Admin Dashboard (`/platform`)

Memiliki akses manajemen modul penuh.
| Fitur UI | Rute Vue | API Endpoint Target | Status UI | Status Integrasi | Keterangan |
| --- | --- | --- | --- | --- | --- |
| Content Management | `/platform/content` | TBD | planned | planned | Kelola konten public LP |
| Branding Management | `/platform/branding` | TBD | planned | planned | Kelola logo/nama platform |
| Users & Permission | `/platform/users` | `GET /api/v1/platform/users` | planned | planned | - |
| Customer Mgt | `/platform/customers` | TBD | planned | N/A | Template (Menunggu OpenAPI) |
| Lead Mgt | `/platform/leads` | TBD | planned | N/A | Template (Menunggu OpenAPI) |
| Settings | `/platform/settings` | `GET /api/v1/users/me` | planned | planned | - |

## 3. Customer Dashboard (`/app`)

Dashboard milik tenant/customer. **Tidak memiliki akses ke modul customer**.
| Fitur UI | Rute Vue | API Endpoint Target | Status UI | Status Integrasi | Keterangan |
| --- | --- | --- | --- | --- | --- |
| Landing Page Mgt | `/app/landing-pages` | `GET /api/v1/admin/landing-pages` | done | planned | Mengelola page milik tenant |
| Users & Permission | `/app/users` | `GET /api/v1/admin/users` | planned | planned | Kelola tim tenant |
| Upgrade Plan | `/app/billing/upgrade` | TBD | planned | planned | - |
| Ticketing | `/app/support` | TBD | planned | planned | Support tenant |
| Settings | `/app/settings` | `GET /api/v1/users/me` | planned | planned | - |
