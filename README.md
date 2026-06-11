# Zyad Cloud CRM Frontend

Frontend SaaS CRM multi-tenant berbasis Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, dan TanStack Query.
UI mengambil arah visual TailAdmin Vue: sidebar dashboard, kartu metrik, tabel, dark mode, dan layout responsif.

## Menjalankan

```bash
cp .env.example .env
npm install
npm run dev
```

Quality checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Dokumentasi keputusan dan pola feature ada di [docs/architecture.md](docs/architecture.md).
