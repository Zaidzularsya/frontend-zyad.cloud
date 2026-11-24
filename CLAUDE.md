@AGENTS.md

## Claude Code — catatan tambahan

- Gunakan Plan mode untuk perubahan yang menyentuh alur auth/tenant guard (`src/middleware`, `src/lib/tenant.ts`, `src/lib/http.ts`), kontrak API (`*.api.ts`), atau editor/renderer GrapesJS landing — perubahan di area ini gampang berdampak lintas fitur.
- Jangan asumsikan endpoint backend ada hanya karena "masuk akal" secara desain — backend berada di repo terpisah (`../backend`), verifikasi dulu lewat `api/openapi.yaml` di repo backend sebelum menulis API client baru.
- `.env` (bukan hanya `.env.example`) bisa ada di working tree tapi tidak ter-track git — jangan pernah membaca atau menampilkan isinya di percakapan, dan jangan menimpanya tanpa konfirmasi eksplisit.
- Jangan klaim UI sudah diverifikasi kalau hanya lint/typecheck/unit test yang jalan; sebutkan jelas apakah QA browser/Playwright sudah dilakukan.
- Default target deploy pekerjaan adalah server DEV (skill `zyad-dev-deploy` di workspace induk); produksi hanya lewat skill `zyad-prod-deploy` dan hanya bila diminta eksplisit.
