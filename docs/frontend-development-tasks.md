# Frontend Development Tasks

Dokumen ini memecah pekerjaan UI/UX dan integrasi API untuk Frontend Zyad Cloud, dengan fokus pada pembagian peran **Super Admin** dan **Customer**.

## Tahap 1: Public & Lead Generation Flow

- [x] Pembuatan `MarketingLandingPage.vue` di rute `/`.
- [x] Pembuatan Layout `MarketingLayout.vue`.
- [ ] Pembuatan `RegisterPage.vue` dengan Mock Social Login via CTA di Landing Page.

## Tahap 2: Super Admin Platform (`/platform`)

Fokus: Pengelola Master Platform.

- [ ] Pengerjaan Layout Sidebar khusus Super Admin.
- [ ] Pembuatan `PlatformDashboardPage.vue`.
- [ ] Content Management: `ContentManagementPage.vue` (Mengatur teks marketing public LP).
- [ ] Branding Management: `BrandingManagementPage.vue` (Ganti logo & nama).
- [ ] Users & Permissions: `PlatformUsersPage.vue`.
- [ ] Customer Management: `CustomerManagementPage.vue` (Template dengan note menunggu OpenAPI).
- [ ] Lead Management: `LeadManagementPage.vue` (Template dengan note menunggu OpenAPI).
- [ ] Settings (Account, Profile, Auth).

## Tahap 3: Customer Dashboard (`/app`)

Fokus: Pengelolaan aset tenant.

- [ ] Pengerjaan Layout Sidebar khusus Customer.
- [x] Landing Page Management: `LandingPageList.vue` (Mengelola halaman tenant sendiri).
- [ ] Users & Permissions: `TenantUsersPage.vue`.
- [ ] Upgrade Plan: `PlanUpgradePage.vue`.
- [ ] Ticketing: `TicketingPage.vue`.
- [ ] Settings (Account, Profile, Auth).
